import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { pool } from "../db/pool.js";
import { adminOnly } from "../middleware/requireAdmin.js";
import { HttpError } from "../utils/httpError.js";
import { importQuestionsFromCSV, generateCSVTemplate } from "../services/importService.js";
import { auditCreate, auditUpdate, auditDelete, auditImport, captureOldData } from "../middleware/auditLogger.js";

export const adminRouter = Router();

// All admin routes require admin role
adminRouter.use(adminOnly);

// Configure multer for CSV file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Validation schemas
const createTestSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  durationSeconds: z.number().int().min(60, "Duration must be at least 1 minute"),
  topic: z.string().min(1, "Topic is required").max(100),
  isActive: z.boolean().optional().default(true),
});

const updateTestSchema = createTestSchema.partial();

const createQuestionSchema = z.object({
  prompt: z.string().min(1, "Question prompt is required"),
  optionA: z.string().min(1, "Option A is required"),
  optionB: z.string().min(1, "Option B is required"),
  optionC: z.string().min(1, "Option C is required"),
  optionD: z.string().min(1, "Option D is required"),
  correctOption: z.enum(["A", "B", "C", "D"]),
  subject: z.string().min(1, "Subject is required"),
  hint: z.string().optional(),
  officialExplanation: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

const updateQuestionSchema = createQuestionSchema.partial();

const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

const updateUserPlanSchema = z.object({
  plan: z.enum(["free", "paid"]),
});

// Helper functions
function mapTestAdmin(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    durationSeconds: row.duration_seconds,
    topic: row.topic,
    isActive: row.is_active,
    createdAt: row.created_at,
    questionCount: row.question_count || 0,
  };
}

function mapQuestionAdmin(row) {
  return {
    id: row.id,
    testId: row.test_id,
    prompt: row.prompt,
    optionA: row.option_a,
    optionB: row.option_b,
    optionC: row.option_c,
    optionD: row.option_d,
    correctOption: row.correct_option,
    subject: row.subject,
    hint: row.hint,
    officialExplanation: row.official_explanation,
    orderIndex: row.order_index,
  };
}

function mapUserAdmin(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    plan: row.plan === "paid" ? "paid" : "free",
    createdAt: row.created_at,
    attemptCount: row.attempt_count || 0,
    lastLogin: row.last_login,
  };
}

// ============================================================================
// DASHBOARD & STATS
// ============================================================================

adminRouter.get("/stats", async (req, res, next) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_users,
        (SELECT COUNT(*) FROM tests) as total_tests,
        (SELECT COUNT(*) FROM tests WHERE is_active = true) as active_tests,
        (SELECT COUNT(*) FROM questions) as total_questions,
        (SELECT COUNT(*) FROM attempts) as total_attempts,
        (SELECT COUNT(*) FROM attempts WHERE status = 'submitted') as completed_attempts,
        (SELECT COUNT(*) FROM practice_sessions) as practice_sessions
    `);
    
    res.json(stats.rows[0]);
  } catch (e) {
    next(e);
  }
});

// ============================================================================
// TESTS MANAGEMENT
// ============================================================================

// List all tests (including inactive)
adminRouter.get("/tests", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, 
             COUNT(q.id)::int as question_count
      FROM tests t
      LEFT JOIN questions q ON q.test_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    
    res.json(rows.map(mapTestAdmin));
  } catch (e) {
    next(e);
  }
});

// Get single test with full details
adminRouter.get("/tests/:id", async (req, res, next) => {
  try {
    const testId = req.params.id;
    const { rows } = await pool.query(`
      SELECT t.*, 
             COUNT(q.id)::int as question_count,
             COUNT(a.id)::int as attempt_count
      FROM tests t
      LEFT JOIN questions q ON q.test_id = t.id
      LEFT JOIN attempts a ON a.test_id = t.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [testId]);
    
    if (rows.length === 0) {
      throw new HttpError(404, "Test not found");
    }
    
    res.json(mapTestAdmin(rows[0]));
  } catch (e) {
    next(e);
  }
});

// Create new test
adminRouter.post("/tests", auditCreate('test'), async (req, res, next) => {
  try {
    const data = createTestSchema.parse(req.body);
    
    const { rows } = await pool.query(`
      INSERT INTO tests (title, description, duration_seconds, topic, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [data.title, data.description || null, data.durationSeconds, data.topic, data.isActive]);
    
    res.status(201).json(mapTestAdmin({ ...rows[0], question_count: 0 }));
  } catch (e) {
    next(e);
  }
});

// Update test
adminRouter.put("/tests/:id", captureOldData('test'), auditUpdate('test'), async (req, res, next) => {
  try {
    const testId = req.params.id;
    const data = updateTestSchema.parse(req.body);
    
    // Check if test exists and has attempts (for data integrity warning)
    const existing = await pool.query(`
      SELECT t.*, COUNT(a.id)::int as attempt_count
      FROM tests t
      LEFT JOIN attempts a ON a.test_id = t.id AND a.status = 'submitted'
      WHERE t.id = $1
      GROUP BY t.id
    `, [testId]);
    
    if (existing.rows.length === 0) {
      throw new HttpError(404, "Test not found");
    }
    
    const attemptCount = existing.rows[0].attempt_count;
    if (attemptCount > 0 && (data.title || data.durationSeconds)) {
      // Allow update but warn about data integrity
      console.warn(`Admin ${req.userId} updating test ${testId} with ${attemptCount} submitted attempts`);
    }
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.durationSeconds !== undefined) {
      updates.push(`duration_seconds = $${paramIndex++}`);
      values.push(data.durationSeconds);
    }
    if (data.topic !== undefined) {
      updates.push(`topic = $${paramIndex++}`);
      values.push(data.topic);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }
    
    if (updates.length === 0) {
      return res.json(mapTestAdmin(existing.rows[0]));
    }
    
    values.push(testId);
    const { rows } = await pool.query(`
      UPDATE tests 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    res.json(mapTestAdmin({ ...rows[0], question_count: existing.rows[0].question_count }));
  } catch (e) {
    next(e);
  }
});

// Delete test (always soft delete when submitted attempts exist)
adminRouter.delete("/tests/:id", captureOldData('test'), auditDelete('test'), async (req, res, next) => {
  try {
    const testId = req.params.id;
    
    // Check for submitted attempts
    const { rows: attempts } = await pool.query(`
      SELECT COUNT(*)::int as count
      FROM attempts
      WHERE test_id = $1 AND status = 'submitted'
    `, [testId]);
    
    const hasAttempts = attempts[0].count > 0;
    
    if (hasAttempts) {
      // Soft delete - set inactive
      const { rows } = await pool.query(`
        UPDATE tests SET is_active = false WHERE id = $1 RETURNING *
      `, [testId]);
      
      if (rows.length === 0) {
        throw new HttpError(404, "Test not found");
      }
      
      res.json({ 
        message: "Test deactivated (soft delete due to existing attempts)",
        test: mapTestAdmin({ ...rows[0], question_count: 0 })
      });
    } else {
      // Hard delete - remove test and cascade to questions
      const { rowCount } = await pool.query(`DELETE FROM tests WHERE id = $1`, [testId]);
      
      if (rowCount === 0) {
        throw new HttpError(404, "Test not found");
      }
      
      res.json({ message: "Test permanently deleted" });
    }
  } catch (e) {
    next(e);
  }
});

// Toggle test active status
adminRouter.post("/tests/:id/toggle", async (req, res, next) => {
  try {
    const testId = req.params.id;
    
    const { rows } = await pool.query(`
      UPDATE tests 
      SET is_active = NOT is_active 
      WHERE id = $1 
      RETURNING *
    `, [testId]);
    
    if (rows.length === 0) {
      throw new HttpError(404, "Test not found");
    }
    
    res.json(mapTestAdmin({ ...rows[0], question_count: 0 }));
  } catch (e) {
    next(e);
  }
});

// ============================================================================
// QUESTIONS MANAGEMENT
// ============================================================================

// List questions for a test
adminRouter.get("/tests/:testId/questions", async (req, res, next) => {
  try {
    const testId = req.params.testId;
    
    // Verify test exists
    const testCheck = await pool.query(`SELECT id FROM tests WHERE id = $1`, [testId]);
    if (testCheck.rows.length === 0) {
      throw new HttpError(404, "Test not found");
    }
    
    const { rows } = await pool.query(`
      SELECT * FROM questions 
      WHERE test_id = $1 
      ORDER BY order_index ASC, created_at ASC
    `, [testId]);
    
    res.json(rows.map(mapQuestionAdmin));
  } catch (e) {
    next(e);
  }
});

// Get single question
adminRouter.get("/questions/:id", async (req, res, next) => {
  try {
    const questionId = req.params.id;
    
    const { rows } = await pool.query(`SELECT * FROM questions WHERE id = $1`, [questionId]);
    
    if (rows.length === 0) {
      throw new HttpError(404, "Question not found");
    }
    
    res.json(mapQuestionAdmin(rows[0]));
  } catch (e) {
    next(e);
  }
});

// Add question to test
adminRouter.post("/tests/:testId/questions", auditCreate('question'), async (req, res, next) => {
  try {
    const testId = req.params.testId;
    const data = createQuestionSchema.parse(req.body);
    
    // Verify test exists
    const testCheck = await pool.query(`SELECT id FROM tests WHERE id = $1`, [testId]);
    if (testCheck.rows.length === 0) {
      throw new HttpError(404, "Test not found");
    }
    
    // Auto-assign order_index if not provided
    let orderIndex = data.orderIndex;
    if (orderIndex === undefined) {
      const maxOrder = await pool.query(`
        SELECT COALESCE(MAX(order_index), 0) + 1 as next_order 
        FROM questions WHERE test_id = $1
      `, [testId]);
      orderIndex = maxOrder.rows[0].next_order;
    }
    
    const { rows } = await pool.query(`
      INSERT INTO questions (
        test_id, prompt, option_a, option_b, option_c, option_d, 
        correct_option, subject, hint, official_explanation, order_index
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      testId, data.prompt, data.optionA, data.optionB, data.optionC, data.optionD,
      data.correctOption, data.subject, data.hint || null, data.officialExplanation || null, orderIndex
    ]);
    
    res.status(201).json(mapQuestionAdmin(rows[0]));
  } catch (e) {
    next(e);
  }
});

// Update question
adminRouter.put("/questions/:id", captureOldData('question'), auditUpdate('question'), async (req, res, next) => {
  try {
    const questionId = req.params.id;
    const data = updateQuestionSchema.parse(req.body);
    
    // Check if question has attempts (for data integrity warning)
    const existing = await pool.query(`
      SELECT q.*, COUNT(a.id)::int as answer_count
      FROM questions q
      LEFT JOIN answers a ON a.question_id = q.id
      WHERE q.id = $1
      GROUP BY q.id
    `, [questionId]);
    
    if (existing.rows.length === 0) {
      throw new HttpError(404, "Question not found");
    }
    
    const answerCount = existing.rows[0].answer_count;
    if (answerCount > 0) {
      console.warn(`Admin ${req.userId} updating question ${questionId} with ${answerCount} answers`);
    }
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbColumn = key === 'optionA' ? 'option_a' :
                        key === 'optionB' ? 'option_b' :
                        key === 'optionC' ? 'option_c' :
                        key === 'optionD' ? 'option_d' :
                        key === 'correctOption' ? 'correct_option' :
                        key === 'officialExplanation' ? 'official_explanation' :
                        key === 'orderIndex' ? 'order_index' :
                        key;
        
        updates.push(`${dbColumn} = $${paramIndex++}`);
        values.push(value);
      }
    });
    
    if (updates.length === 0) {
      return res.json(mapQuestionAdmin(existing.rows[0]));
    }
    
    values.push(questionId);
    const { rows } = await pool.query(`
      UPDATE questions 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    res.json(mapQuestionAdmin(rows[0]));
  } catch (e) {
    next(e);
  }
});

// Delete question
adminRouter.delete("/questions/:id", async (req, res, next) => {
  try {
    const questionId = req.params.id;
    
    // Check for answers
    const { rows: answers } = await pool.query(`
      SELECT COUNT(*)::int as count FROM answers WHERE question_id = $1
    `, [questionId]);
    
    if (answers[0].count > 0) {
      throw new HttpError(400, "Cannot delete question with existing answers. This would break attempt integrity.");
    }
    
    const { rowCount } = await pool.query(`DELETE FROM questions WHERE id = $1`, [questionId]);
    
    if (rowCount === 0) {
      throw new HttpError(404, "Question not found");
    }
    
    res.json({ message: "Question deleted" });
  } catch (e) {
    next(e);
  }
});

// Reorder questions in a test
adminRouter.post("/questions/reorder", async (req, res, next) => {
  try {
    const { testId, questionIds } = z.object({
      testId: z.string().uuid(),
      questionIds: z.array(z.string().uuid()).min(1),
    }).parse(req.body);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update order_index for each question
      for (let i = 0; i < questionIds.length; i++) {
        await client.query(`
          UPDATE questions 
          SET order_index = $1 
          WHERE id = $2 AND test_id = $3
        `, [i + 1, questionIds[i], testId]);
      }
      
      await client.query('COMMIT');
      res.json({ message: "Questions reordered successfully" });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

// ============================================================================
// USERS MANAGEMENT
// ============================================================================

// List users with stats
adminRouter.get("/users", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.*, 
             COUNT(a.id)::int as attempt_count,
             MAX(a.started_at) as last_login
      FROM users u
      LEFT JOIN attempts a ON a.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    
    res.json(rows.map(mapUserAdmin));
  } catch (e) {
    next(e);
  }
});

// Update user role
adminRouter.put("/users/:id/role", async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { role } = updateUserRoleSchema.parse(req.body);
    
    // Prevent self-demotion
    if (userId === req.userId && role !== 'admin') {
      throw new HttpError(400, "Cannot change your own admin role");
    }
    
    const { rows } = await pool.query(`
      UPDATE users SET role = $1 WHERE id = $2 RETURNING *
    `, [role, userId]);
    
    if (rows.length === 0) {
      throw new HttpError(404, "User not found");
    }
    
    res.json(mapUserAdmin({ ...rows[0], attempt_count: 0 }));
  } catch (e) {
    next(e);
  }
});

// Update free vs paid (unlimited mocks)
adminRouter.put("/users/:id/plan", async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { plan } = updateUserPlanSchema.parse(req.body);

    const { rows } = await pool.query(
      `UPDATE users SET plan = $1 WHERE id = $2 RETURNING *`,
      [plan, userId]
    );

    if (rows.length === 0) {
      throw new HttpError(404, "User not found");
    }

    res.json(mapUserAdmin({ ...rows[0], attempt_count: 0 }));
  } catch (e) {
    next(e);
  }
});

// ============================================================================
// BULK IMPORT
// ============================================================================

// Get CSV template for question imports
adminRouter.get("/import/template", (req, res) => {
  const template = generateCSVTemplate();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="question-import-template.csv"');
  res.send(template);
});

// Import questions from CSV file
adminRouter.post("/import/questions/:testId", upload.single('csvFile'), auditImport('question'), async (req, res, next) => {
  try {
    const testId = req.params.testId;
    
    if (!req.file) {
      throw new HttpError(400, "No CSV file uploaded");
    }
    
    const csvText = req.file.buffer.toString('utf-8');
    const result = await importQuestionsFromCSV(testId, csvText, req.userId);
    
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

// Import questions from raw CSV text (for testing/API clients)
adminRouter.post("/import/questions/:testId/text", async (req, res, next) => {
  try {
    const testId = req.params.testId;
    const { csvText } = z.object({
      csvText: z.string().min(1, "CSV text is required"),
    }).parse(req.body);
    
    const result = await importQuestionsFromCSV(testId, csvText, req.userId);
    
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});