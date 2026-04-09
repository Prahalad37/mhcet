import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import { pool } from "../db/pool.js";
import { adminOnly } from "../middleware/requireAdmin.js";
import { HttpError } from "../utils/httpError.js";
import { logWarn } from "../utils/logger.js";
import { generateCSVTemplate } from "../services/importService.js";
import { getImportQueue } from "../jobs/queues.js";
import { auditCreate, auditUpdate, auditDelete, captureOldData } from "../middleware/auditLogger.js";

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
  /** Omit → global/B2C (`tenant_id` null). UUID assigns to institute; `null` / `""` clears. */
  tenantId: z.union([z.string().uuid(), z.null(), z.literal("")]).optional(),
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

/** Admin-only: assign platform user to a tenant (B2B). `tenantId` or `tenant_id`: UUID | null | "". */
const updateAdminUserSchema = z
  .object({
    tenantId: z.union([z.string().uuid(), z.null(), z.literal("")]).optional(),
    tenant_id: z.union([z.string().uuid(), z.null(), z.literal("")]).optional(),
  })
  .strict();

const createTenantSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  /** Omit or empty string → stored as NULL (platform-wide / no custom domain yet). */
  domain: z.string().max(255).optional(),
});

const updateTenantStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
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
    tenantId: row.tenant_id ?? null,
    tenantName: row.tenant_name ?? null,
  };
}

async function assertTenantExists(tenantId) {
  const t = await pool.query(`SELECT id FROM tenants WHERE id = $1`, [tenantId]);
  if (t.rowCount === 0) {
    throw new HttpError(400, "Unknown tenant");
  }
}

/** Single test row for admin JSON: counts + `tenant_name` from `tenants`. */
async function fetchTestAdminView(testId) {
  const { rows } = await pool.query(
    `SELECT t.*,
            tn.name AS tenant_name,
            COALESCE(qc.cnt, 0)::int AS question_count
     FROM tests t
     LEFT JOIN tenants tn ON tn.id = t.tenant_id
     LEFT JOIN (
       SELECT test_id, COUNT(*)::int AS cnt FROM questions GROUP BY test_id
     ) qc ON qc.test_id = t.id
     WHERE t.id = $1`,
    [testId]
  );
  return rows[0] ?? null;
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
    tenantId: row.tenant_id ?? null,
    tenantName: row.tenant_name ?? null,
    createdAt: row.created_at,
    attemptCount: row.attempt_count || 0,
    lastLogin: row.last_login,
  };
}

/** Single user row for admin JSON — includes tenant display name and attempt stats. */
async function fetchUserAdminView(userId) {
  const { rows } = await pool.query(
    `SELECT u.*,
            t.name AS tenant_name,
            COALESCE(ac.attempt_count, 0)::int AS attempt_count,
            ac.last_login
     FROM users u
     LEFT JOIN tenants t ON t.id = u.tenant_id
     LEFT JOIN (
       SELECT user_id, COUNT(*)::int AS attempt_count, MAX(started_at) AS last_login
       FROM attempts
       GROUP BY user_id
     ) ac ON ac.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0];
}

function mapTenantAdmin(row) {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain ?? null,
    status: row.status,
    userCount: row.user_count != null ? Number(row.user_count) : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
// TENANTS (B2B coaching institutes)
// ============================================================================

adminRouter.get("/tenants", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.domain,
        t.status,
        t.created_at,
        t.updated_at,
        COUNT(u.id)::int AS user_count
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json(rows.map(mapTenantAdmin));
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/tenants", async (req, res, next) => {
  try {
    const { name, domain: rawDomain } = createTenantSchema.parse(req.body);
    const domain =
      rawDomain === undefined || rawDomain === null ? null : String(rawDomain).trim() || null;

    let rows;
    try {
      const result = await pool.query(
        `INSERT INTO tenants (name, domain)
         VALUES ($1, $2)
         RETURNING id, name, domain, status, created_at, updated_at`,
        [name.trim(), domain]
      );
      rows = result.rows;
    } catch (e) {
      if (e && e.code === "23505") {
        return next(new HttpError(409, "A tenant with this domain already exists"));
      }
      throw e;
    }

    const row = rows[0];
    const withCount = { ...row, user_count: 0 };
    res.status(201).json(mapTenantAdmin(withCount));
  } catch (e) {
    if (e instanceof z.ZodError) {
      return next(
        new HttpError(400, "Validation failed", {
          expose: true,
          details: e.flatten().fieldErrors,
        })
      );
    }
    next(e);
  }
});

adminRouter.put("/tenants/:id/status", async (req, res, next) => {
  try {
    const tenantId = req.params.id;
    const { status } = updateTenantStatusSchema.parse(req.body);

    const { rows } = await pool.query(
      `UPDATE tenants
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, name, domain, status, created_at, updated_at`,
      [status, tenantId]
    );

    if (rows.length === 0) {
      throw new HttpError(404, "Tenant not found");
    }

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS user_count FROM users WHERE tenant_id = $1`,
      [tenantId]
    );
    const row = { ...rows[0], user_count: countRows[0]?.user_count ?? 0 };
    res.json(mapTenantAdmin(row));
  } catch (e) {
    if (e instanceof z.ZodError) {
      return next(
        new HttpError(400, "Validation failed", {
          expose: true,
          details: e.flatten().fieldErrors,
        })
      );
    }
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
             tn.name AS tenant_name,
             COALESCE(qc.cnt, 0)::int AS question_count
      FROM tests t
      LEFT JOIN tenants tn ON tn.id = t.tenant_id
      LEFT JOIN (
        SELECT test_id, COUNT(*)::int AS cnt FROM questions GROUP BY test_id
      ) qc ON qc.test_id = t.id
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
    const row = await fetchTestAdminView(testId);

    if (!row) {
      throw new HttpError(404, "Test not found");
    }

    res.json(mapTestAdmin(row));
  } catch (e) {
    next(e);
  }
});

// Create new test
adminRouter.post("/tests", auditCreate('test'), async (req, res, next) => {
  try {
    const data = createTestSchema.parse(req.body);

    let tenantIdVal = null;
    if (data.tenantId !== undefined) {
      if (data.tenantId !== null && data.tenantId !== "") {
        await assertTenantExists(data.tenantId);
        tenantIdVal = data.tenantId;
      }
    }

    const { rows } = await pool.query(
      `
      INSERT INTO tests (title, description, duration_seconds, topic, is_active, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
      [data.title, data.description || null, data.durationSeconds, data.topic, data.isActive, tenantIdVal]
    );

    const view = await fetchTestAdminView(rows[0].id);
    res.status(201).json(mapTestAdmin(view));
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
      logWarn({
        msg: "admin_update_test_with_submitted_attempts",
        adminUserId: req.userId,
        testId,
        submittedAttemptCount: attemptCount,
      });
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
    if (data.tenantId !== undefined) {
      let nextTenantId = null;
      if (data.tenantId !== null && data.tenantId !== "") {
        await assertTenantExists(data.tenantId);
        nextTenantId = data.tenantId;
      }
      updates.push(`tenant_id = $${paramIndex++}`);
      values.push(nextTenantId);
    }

    if (updates.length === 0) {
      const view = await fetchTestAdminView(testId);
      return res.json(mapTestAdmin(view));
    }

    values.push(testId);
    await pool.query(
      `
      UPDATE tests
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
    `,
      values
    );

    const view = await fetchTestAdminView(testId);
    res.json(mapTestAdmin(view));
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

      const view = await fetchTestAdminView(testId);
      res.json({
        message: "Test deactivated (soft delete due to existing attempts)",
        test: mapTestAdmin(view),
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

    const view = await fetchTestAdminView(testId);
    res.json(mapTestAdmin(view));
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
      logWarn({
        msg: "admin_update_question_with_existing_answers",
        adminUserId: req.userId,
        questionId,
        answerCount,
      });
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

// List users with stats + tenant display name
adminRouter.get("/users", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.*,
             t.name AS tenant_name,
             COALESCE(ac.attempt_count, 0)::int AS attempt_count,
             ac.last_login
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int AS attempt_count, MAX(started_at) AS last_login
        FROM attempts
        GROUP BY user_id
      ) ac ON ac.user_id = u.id
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
    
    const { rowCount } = await pool.query(`UPDATE users SET role = $1 WHERE id = $2`, [
      role,
      userId,
    ]);

    if (rowCount === 0) {
      throw new HttpError(404, "User not found");
    }

    const row = await fetchUserAdminView(userId);
    res.json(mapUserAdmin(row));
  } catch (e) {
    next(e);
  }
});

// Update free vs paid (unlimited mocks)
adminRouter.put("/users/:id/plan", async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { plan } = updateUserPlanSchema.parse(req.body);

    const { rowCount } = await pool.query(`UPDATE users SET plan = $1 WHERE id = $2`, [
      plan,
      userId,
    ]);

    if (rowCount === 0) {
      throw new HttpError(404, "User not found");
    }

    const row = await fetchUserAdminView(userId);
    res.json(mapUserAdmin(row));
  } catch (e) {
    next(e);
  }
});

// Assign or clear tenant (B2B). tenantId: UUID | null | "" — empty string clears.
adminRouter.put("/users/:id", async (req, res, next) => {
  try {
    const userId = req.params.id;
    const parsed = updateAdminUserSchema.parse(req.body);
    const hasCamel = Object.prototype.hasOwnProperty.call(parsed, "tenantId");
    const hasSnake = Object.prototype.hasOwnProperty.call(parsed, "tenant_id");
    if (hasCamel && hasSnake) {
      throw new HttpError(400, "Use either tenantId or tenant_id, not both");
    }
    if (!hasCamel && !hasSnake) {
      throw new HttpError(400, "Provide tenantId or tenant_id (UUID, null, or empty string to clear)");
    }
    const raw = hasCamel ? parsed.tenantId : parsed.tenant_id;

    let nextTenantId = null;
    if (raw !== null && raw !== "") {
      const t = await pool.query(`SELECT id FROM tenants WHERE id = $1`, [raw]);
      if (t.rowCount === 0) {
        throw new HttpError(400, "Unknown tenant");
      }
      nextTenantId = raw;
    }

    const { rowCount } = await pool.query(
      `UPDATE users SET tenant_id = $1 WHERE id = $2`,
      [nextTenantId, userId]
    );

    if (rowCount === 0) {
      throw new HttpError(404, "User not found");
    }

    const row = await fetchUserAdminView(userId);
    res.json(mapUserAdmin(row));
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

// Import questions from CSV file (async job — poll GET /api/jobs/:jobId)
adminRouter.post("/import/questions/:testId", upload.single("csvFile"), async (req, res, next) => {
  try {
    const testId = req.params.testId;

    if (!req.file) {
      throw new HttpError(400, "No CSV file uploaded");
    }

    if (!process.env.REDIS_URL) {
      throw new HttpError(503, "Import queue unavailable (configure REDIS_URL and run the worker)");
    }

    const csvText = req.file.buffer.toString("utf-8");
    let queue;
    try {
      queue = getImportQueue();
    } catch {
      throw new HttpError(503, "Import queue unavailable (configure REDIS_URL and run the worker)");
    }
    const job = await queue.add(
      "import",
      { userId: req.userId, testId, csvText },
      {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 1,
      }
    );
    const jobId = String(job.id);
    res.status(202).json({
      jobId,
      status: "queued",
      statusUrl: `/api/jobs/${jobId}`,
    });
  } catch (e) {
    next(e);
  }
});

// Import questions from raw CSV text (for testing/API clients)
adminRouter.post("/import/questions/:testId/text", async (req, res, next) => {
  try {
    const testId = req.params.testId;
    const { csvText } = z
      .object({
        csvText: z.string().min(1, "CSV text is required"),
      })
      .parse(req.body);

    if (!process.env.REDIS_URL) {
      throw new HttpError(503, "Import queue unavailable (configure REDIS_URL and run the worker)");
    }

    let queue;
    try {
      queue = getImportQueue();
    } catch {
      throw new HttpError(503, "Import queue unavailable (configure REDIS_URL and run the worker)");
    }
    const job = await queue.add(
      "import",
      { userId: req.userId, testId, csvText },
      {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 1,
      }
    );
    const jobId = String(job.id);
    res.status(202).json({
      jobId,
      status: "queued",
      statusUrl: `/api/jobs/${jobId}`,
    });
  } catch (e) {
    next(e);
  }
});