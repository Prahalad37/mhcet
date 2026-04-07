import { Router } from "express";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";

export const testsRouter = Router();
testsRouter.use(authMiddleware);

function mapQuestionPublic(row) {
  return {
    id: row.id,
    prompt: row.prompt,
    optionA: row.option_a,
    optionB: row.option_b,
    optionC: row.option_c,
    optionD: row.option_d,
    orderIndex: row.order_index,
  };
}

testsRouter.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.title, t.description, t.duration_seconds, t.topic,
              COUNT(q.id)::int AS question_count
       FROM tests t
       LEFT JOIN questions q ON q.test_id = t.id
       WHERE t.author_id IS NULL AND t.is_active = true
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        durationSeconds: r.duration_seconds,
        topic: r.topic,
        questionCount: r.question_count,
      }))
    );
  } catch (e) {
    next(e);
  }
});

testsRouter.get("/my", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.title, t.description, t.duration_seconds, t.topic, t.created_at,
              COUNT(q.id)::int AS question_count
       FROM tests t
       LEFT JOIN questions q ON q.test_id = t.id
       WHERE t.author_id = $1
       GROUP BY t.id
       ORDER BY t.created_at DESC`,
      [req.userId]
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        durationSeconds: r.duration_seconds,
        topic: r.topic,
        questionCount: r.question_count,
        authorId: req.userId,
        createdAt: r.created_at,
      }))
    );
  } catch (e) {
    next(e);
  }
});

testsRouter.get("/:testId", async (req, res, next) => {
  try {
    const testId = req.params.testId;
    const testRes = await pool.query(
      `SELECT id, title, description, duration_seconds, topic FROM tests
       WHERE id = $1 AND is_active = true`,
      [testId]
    );
    const test = testRes.rows[0];
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }
    const qRes = await pool.query(
      `SELECT id, prompt, option_a, option_b, option_c, option_d, order_index
       FROM questions WHERE test_id = $1 ORDER BY order_index ASC, id ASC`,
      [testId]
    );
    res.json({
      id: test.id,
      title: test.title,
      description: test.description,
      durationSeconds: test.duration_seconds,
      topic: test.topic,
      questions: qRes.rows.map(mapQuestionPublic),
    });
  } catch (e) {
    next(e);
  }
});

testsRouter.post("/", async (req, res, next) => {
  try {
    const { title, description, durationSeconds, topic, isActive } = req.body;
    if (!title || !durationSeconds || durationSeconds <= 0) {
      return res.status(400).json({ error: "Invalid title or duration" });
    }
    const { rows } = await pool.query(
      `INSERT INTO tests (title, description, duration_seconds, topic, is_active, author_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [title, description, durationSeconds, topic || "Other / custom topic", isActive ?? true, req.userId]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (e) {
    next(e);
  }
});

testsRouter.patch("/:testId/questions/reorder", async (req, res, next) => {
  try {
    const testId = req.params.testId;
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: "questionIds must be a non-empty array" });
    }

    // Auth check — ensure the test belongs to this user
    const authCheck = await pool.query(
      `SELECT id FROM tests WHERE id = $1 AND author_id = $2`,
      [testId, req.userId]
    );
    if (authCheck.rowCount === 0) return res.status(403).json({ error: "Forbidden or not found" });

    // Update order_index for each question id positionally
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < questionIds.length; i++) {
        await client.query(
          `UPDATE questions SET order_index = $1 WHERE id = $2 AND test_id = $3`,
          [i, questionIds[i], testId]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    res.json({ message: "Reordered successfully" });
  } catch (e) {
    next(e);
  }
});

testsRouter.post("/:testId/questions", async (req, res, next) => {
  try {
    const testId = req.params.testId;
    const { prompt, optionA, optionB, optionC, optionD, correctOption, subject, hint, officialExplanation } = req.body;
    
    // Auth check
    const authCheck = await pool.query(`SELECT id FROM tests WHERE id = $1 AND author_id = $2`, [testId, req.userId]);
    if (authCheck.rowCount === 0) return res.status(403).json({ error: "Forbidden" });

    // Validate required fields
    if (!prompt || !optionA || !optionB || !optionC || !optionD || !correctOption || !subject) {
      return res.status(400).json({ error: "prompt, options A–D, correctOption, and subject are all required" });
    }
    if (!['A','B','C','D'].includes(correctOption.toUpperCase())) {
      return res.status(400).json({ error: "correctOption must be A, B, C, or D" });
    }

    // Insert
    const { rows } = await pool.query(
      `INSERT INTO questions
         (test_id, prompt, option_a, option_b, option_c, option_d,
          correct_option, subject, hint, official_explanation, order_index)
       SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         COALESCE((SELECT MAX(order_index) + 1 FROM questions WHERE test_id = $1), 0)
       RETURNING id`,
      [testId, prompt.trim(), optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim(),
       correctOption.toUpperCase(), subject.trim(), hint?.trim() || null, officialExplanation?.trim() || null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (e) {
    next(e);
  }
});

// GET /api/tests/questions/:id — fetch single question
testsRouter.get("/questions/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT q.id, q.prompt, q.option_a, q.option_b, q.option_c, q.option_d,
              q.correct_option, q.subject, q.hint, q.official_explanation, q.order_index,
              q.test_id
       FROM questions q
       JOIN tests t ON t.id = q.test_id
       WHERE q.id = $1 AND t.author_id = $2`,
      [req.params.id, req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Question not found" });
    const q = rows[0];
    res.json({
      id: q.id, prompt: q.prompt, optionA: q.option_a, optionB: q.option_b,
      optionC: q.option_c, optionD: q.option_d, correctOption: q.correct_option,
      subject: q.subject, hint: q.hint, officialExplanation: q.official_explanation,
      orderIndex: q.order_index, testId: q.test_id,
    });
  } catch (e) { next(e); }
});

testsRouter.put("/:testId", async (req, res, next) => {
  try {
    const testId = req.params.testId;
    const { title, description, durationSeconds, topic, isActive } = req.body;
    
    const authCheck = await pool.query(`SELECT id FROM tests WHERE id = $1 AND author_id = $2`, [testId, req.userId]);
    if (authCheck.rowCount === 0) return res.status(403).json({ error: "Forbidden or not found" });

    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (title !== undefined) { updates.push(`title = $${paramIndex++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (durationSeconds !== undefined) { updates.push(`duration_seconds = $${paramIndex++}`); values.push(durationSeconds); }
    if (topic !== undefined) { updates.push(`topic = $${paramIndex++}`); values.push(topic); }
    if (isActive !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(isActive); }
    
    if (updates.length === 0) return res.json({ id: testId });
    
    values.push(testId);
    await pool.query(`UPDATE tests SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    res.json({ id: testId });
  } catch (e) {
    next(e);
  }
});

testsRouter.delete("/:testId", async (req, res, next) => {
  try {
    const testId = req.params.testId;
    const authCheck = await pool.query(`SELECT id FROM tests WHERE id = $1 AND author_id = $2`, [testId, req.userId]);
    if (authCheck.rowCount === 0) return res.status(403).json({ error: "Forbidden or not found" });

    await pool.query(`DELETE FROM tests WHERE id = $1`, [testId]);
    res.json({ message: "Test deleted" });
  } catch (e) {
    next(e);
  }
});

testsRouter.delete("/questions/:id", async (req, res, next) => {
  try {
    const questionId = req.params.id;
    const authCheck = await pool.query(
      `SELECT q.id FROM questions q JOIN tests t ON q.test_id = t.id WHERE q.id = $1 AND t.author_id = $2`,
      [questionId, req.userId]
    );
    if (authCheck.rowCount === 0) return res.status(403).json({ error: "Forbidden or not found" });

    await pool.query(`DELETE FROM questions WHERE id = $1`, [questionId]);
    res.json({ message: "Question deleted" });
  } catch (e) {
    next(e);
  }
});

testsRouter.put("/questions/:id", async (req, res, next) => {
  try {
    const questionId = req.params.id;
    const { prompt, optionA, optionB, optionC, optionD, correctOption, subject, hint, officialExplanation } = req.body;

    const authCheck = await pool.query(
      `SELECT q.id FROM questions q JOIN tests t ON q.test_id = t.id WHERE q.id = $1 AND t.author_id = $2`,
      [questionId, req.userId]
    );
    if (authCheck.rowCount === 0) return res.status(403).json({ error: "Forbidden or not found" });

    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (prompt !== undefined)              { updates.push(`prompt = $${paramIndex++}`);               values.push(prompt.trim()); }
    if (optionA !== undefined)             { updates.push(`option_a = $${paramIndex++}`);             values.push(optionA.trim()); }
    if (optionB !== undefined)             { updates.push(`option_b = $${paramIndex++}`);             values.push(optionB.trim()); }
    if (optionC !== undefined)             { updates.push(`option_c = $${paramIndex++}`);             values.push(optionC.trim()); }
    if (optionD !== undefined)             { updates.push(`option_d = $${paramIndex++}`);             values.push(optionD.trim()); }
    if (correctOption !== undefined)       { updates.push(`correct_option = $${paramIndex++}`);       values.push(correctOption.toUpperCase().trim()); }
    if (subject !== undefined)             { updates.push(`subject = $${paramIndex++}`);              values.push(subject.trim()); }
    if (hint !== undefined)                { updates.push(`hint = $${paramIndex++}`);                 values.push(hint?.trim() || null); }
    if (officialExplanation !== undefined) { updates.push(`official_explanation = $${paramIndex++}`); values.push(officialExplanation?.trim() || null); }

    if (updates.length === 0) return res.json({ id: questionId });
    
    values.push(questionId);
    await pool.query(`UPDATE questions SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    res.json({ id: questionId });
  } catch (e) {
    next(e);
  }
});

