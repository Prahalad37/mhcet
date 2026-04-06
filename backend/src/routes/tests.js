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
       WHERE t.is_active = true
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
