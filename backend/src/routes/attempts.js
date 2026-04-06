import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import {
  assertCanStartMockAttempt,
  loadUserPlanAndTodayCount,
} from "../utils/planLimits.js";

export const attemptsRouter = Router();
attemptsRouter.use(authMiddleware);

const createAttemptSchema = z.object({
  testId: z.string().uuid(),
});

const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOption: z.enum(["A", "B", "C", "D"]),
});

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

/** ISO deadline for attempt (server clock): started_at + duration from joined test. */
function endsAtIsoFromRow(row) {
  if (row.ends_at instanceof Date) {
    return row.ends_at.toISOString();
  }
  return new Date(row.ends_at).toISOString();
}

/**
 * Attempt list: in_progress first (newest activity), then submitted (newest first).
 */
attemptsRouter.get("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    const { rows } = await pool.query(
      `SELECT a.id, a.test_id, a.score, a.total_questions, a.started_at, a.submitted_at,
              a.status::text AS status,
              t.title AS test_title, t.topic
       FROM attempts a
       JOIN tests t ON t.id = a.test_id
       WHERE a.user_id = $1 AND a.status IN ('submitted', 'in_progress')
       ORDER BY
         (a.status::text <> 'in_progress'),
         COALESCE(a.submitted_at, a.started_at) DESC NULLS LAST`,
      [userId]
    );
    res.json(
      rows.map((r) => ({
        attemptId: r.id,
        testId: r.test_id,
        testTitle: r.test_title,
        topic: r.topic,
        status: r.status,
        score: r.score,
        totalQuestions: r.total_questions,
        startedAt: r.started_at,
        submittedAt: r.submitted_at,
      }))
    );
  } catch (e) {
    next(e);
  }
});

attemptsRouter.post("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    const { testId } = createAttemptSchema.parse(req.body);

    const planRow = await loadUserPlanAndTodayCount(pool, userId);
    assertCanStartMockAttempt(planRow);

    const testRes = await pool.query(
      `SELECT id, duration_seconds FROM tests WHERE id = $1 AND is_active = true`,
      [testId]
    );
    if (!testRes.rows[0]) {
      throw new HttpError(404, "Test not found");
    }

    const qRes = await pool.query(
      `SELECT id, prompt, option_a, option_b, option_c, option_d, order_index
       FROM questions WHERE test_id = $1 ORDER BY order_index ASC, id ASC`,
      [testId]
    );
    const questions = qRes.rows;
    const total = questions.length;

    const dur = testRes.rows[0].duration_seconds;
    const ins = await pool.query(
      `INSERT INTO attempts (user_id, test_id, total_questions, status)
       VALUES ($1, $2, $3, 'in_progress')
       RETURNING id, started_at,
         (started_at + ($4 * interval '1 second')) AS ends_at`,
      [userId, testId, total, dur]
    );
    const attempt = ins.rows[0];

    res.status(201).json({
      attemptId: attempt.id,
      startedAt: attempt.started_at,
      endsAt: endsAtIsoFromRow(attempt),
      durationSeconds: dur,
      totalQuestions: total,
      questions: questions.map(mapQuestionPublic),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return next(new HttpError(400, "Validation failed", { expose: true, details: e.flatten().fieldErrors }));
    }
    next(e);
  }
});

attemptsRouter.patch("/:attemptId/answers", async (req, res, next) => {
  try {
    const userId = req.userId;
    const attemptId = req.params.attemptId;
    const { questionId, selectedOption } = answerSchema.parse(req.body);

    const att = await pool.query(
      `SELECT a.id, a.status, a.test_id,
              (a.started_at + (t.duration_seconds * interval '1 second')) AS ends_at
       FROM attempts a
       JOIN tests t ON t.id = a.test_id
       WHERE a.id = $1 AND a.user_id = $2`,
      [attemptId, userId]
    );
    const attempt = att.rows[0];
    if (!attempt) {
      throw new HttpError(404, "Attempt not found");
    }
    if (attempt.status !== "in_progress") {
      throw new HttpError(400, "Attempt is already submitted");
    }
    if (new Date(attempt.ends_at) <= new Date()) {
      throw new HttpError(400, "Time has expired for this attempt. Submit to finish.");
    }

    const qCheck = await pool.query(
      `SELECT id FROM questions WHERE id = $1 AND test_id = $2`,
      [questionId, attempt.test_id]
    );
    if (!qCheck.rows[0]) {
      throw new HttpError(400, "Invalid question for this test");
    }

    await pool.query(
      `INSERT INTO answers (attempt_id, question_id, selected_option)
       VALUES ($1, $2, $3)
       ON CONFLICT (attempt_id, question_id)
       DO UPDATE SET selected_option = EXCLUDED.selected_option`,
      [attemptId, questionId, selectedOption]
    );

    res.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return next(new HttpError(400, "Validation failed", { expose: true, details: e.flatten().fieldErrors }));
    }
    next(e);
  }
});

attemptsRouter.post("/:attemptId/submit", async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const userId = req.userId;
    const attemptId = req.params.attemptId;

    await client.query("BEGIN");

    const att = await client.query(
      `SELECT id, status, test_id, score FROM attempts
       WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [attemptId, userId]
    );
    const attempt = att.rows[0];
    if (!attempt) {
      await client.query("ROLLBACK");
      throw new HttpError(404, "Attempt not found");
    }
    if (attempt.status === "submitted") {
      await client.query("ROLLBACK");
      return res.json({
        attemptId,
        score: attempt.score ?? 0,
      });
    }

    await client.query(
      `INSERT INTO answers (attempt_id, question_id, selected_option)
       SELECT $1, q.id, NULL
       FROM questions q
       WHERE q.test_id = $2
       ON CONFLICT (attempt_id, question_id) DO NOTHING`,
      [attemptId, attempt.test_id]
    );

    await client.query(
      `UPDATE answers ans
       SET is_correct = (
         ans.selected_option IS NOT NULL
         AND TRIM(BOTH FROM ans.selected_option::text) = TRIM(BOTH FROM q.correct_option::text)
       )
       FROM questions q
       WHERE ans.attempt_id = $1 AND ans.question_id = q.id AND q.test_id = $2`,
      [attemptId, attempt.test_id]
    );

    await client.query(
      `INSERT INTO attempt_question_snapshots (
         attempt_id, question_id, prompt, option_a, option_b, option_c, option_d,
         correct_option, hint, official_explanation, order_index
       )
       SELECT
         $1, q.id, q.prompt, q.option_a, q.option_b, q.option_c, q.option_d,
         q.correct_option, q.hint, q.official_explanation, q.order_index
       FROM questions q
       WHERE q.test_id = $2
       ON CONFLICT (attempt_id, question_id) DO NOTHING`,
      [attemptId, attempt.test_id]
    );

    const scoreRes = await client.query(
      `SELECT COUNT(*)::int AS correct
       FROM answers ans
       INNER JOIN questions q ON q.id = ans.question_id AND q.test_id = $2
       WHERE ans.attempt_id = $1 AND ans.is_correct = true`,
      [attemptId, attempt.test_id]
    );
    const correct = scoreRes.rows[0].correct;

    await client.query(
      `UPDATE attempts
       SET status = 'submitted', submitted_at = now(), score = $1
       WHERE id = $2`,
      [correct, attemptId]
    );

    await client.query("COMMIT");

    res.json({
      attemptId,
      score: correct,
    });
  } catch (e) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* ignore rollback failures */
      }
    }
    next(e);
  } finally {
    if (client) client.release();
  }
});

/** Resume an in-progress attempt (same payload shape as POST start + selections). */
attemptsRouter.get("/:attemptId/resume", async (req, res, next) => {
  try {
    const userId = req.userId;
    const attemptId = req.params.attemptId;

    const att = await pool.query(
      `SELECT a.id, a.test_id, a.started_at, a.status,
              t.duration_seconds,
              (a.started_at + (t.duration_seconds * interval '1 second')) AS ends_at
       FROM attempts a
       JOIN tests t ON t.id = a.test_id
       WHERE a.id = $1 AND a.user_id = $2`,
      [attemptId, userId]
    );
    const row = att.rows[0];
    if (!row) {
      throw new HttpError(404, "Attempt not found");
    }
    if (row.status !== "in_progress") {
      throw new HttpError(400, "This attempt is already submitted. Open results from History.");
    }

    const qRes = await pool.query(
      `SELECT id, prompt, option_a, option_b, option_c, option_d, order_index
       FROM questions WHERE test_id = $1 ORDER BY order_index ASC, id ASC`,
      [row.test_id]
    );

    const ansRes = await pool.query(
      `SELECT question_id, selected_option
       FROM answers
       WHERE attempt_id = $1 AND selected_option IS NOT NULL`,
      [attemptId]
    );

    const selections = {};
    for (const a of ansRes.rows) {
      selections[a.question_id] = a.selected_option;
    }

    res.json({
      attemptId: row.id,
      testId: row.test_id,
      startedAt: row.started_at,
      endsAt: endsAtIsoFromRow(row),
      durationSeconds: row.duration_seconds,
      totalQuestions: qRes.rows.length,
      questions: qRes.rows.map(mapQuestionPublic),
      selections,
    });
  } catch (e) {
    next(e);
  }
});

attemptsRouter.get("/:attemptId/results", async (req, res, next) => {
  try {
    const userId = req.userId;
    const attemptId = req.params.attemptId;

    const att = await pool.query(
      `SELECT a.id, a.test_id, a.score, a.total_questions, a.status, a.submitted_at,
              t.title AS test_title, t.duration_seconds
       FROM attempts a
       JOIN tests t ON t.id = a.test_id
       WHERE a.id = $1 AND a.user_id = $2`,
      [attemptId, userId]
    );
    const attempt = att.rows[0];
    if (!attempt) {
      throw new HttpError(404, "Attempt not found");
    }
    if (attempt.status !== "submitted") {
      throw new HttpError(400, "Results available after submission");
    }

    const detail = await pool.query(
      `SELECT s.question_id AS id, s.prompt, s.option_a, s.option_b, s.option_c, s.option_d,
              s.correct_option, s.order_index, s.hint, s.official_explanation,
              ans.selected_option, ans.is_correct
       FROM attempt_question_snapshots s
       LEFT JOIN answers ans ON ans.question_id = s.question_id AND ans.attempt_id = $1
       WHERE s.attempt_id = $1
       ORDER BY s.order_index ASC, s.question_id ASC`,
      [attemptId]
    );

    res.json({
      attemptId: attempt.id,
      testTitle: attempt.test_title,
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      submittedAt: attempt.submitted_at,
      durationSeconds: attempt.duration_seconds,
      questions: detail.rows.map((r) => ({
        id: r.id,
        prompt: r.prompt,
        optionA: r.option_a,
        optionB: r.option_b,
        optionC: r.option_c,
        optionD: r.option_d,
        correctOption: r.correct_option,
        selectedOption: r.selected_option,
        isCorrect: r.is_correct,
        orderIndex: r.order_index,
        hint: r.hint,
        officialExplanation: r.official_explanation,
      })),
    });
  } catch (e) {
    next(e);
  }
});
