import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import { getContentLang } from "../utils/contentLocale.js";
import {
  mapQuestionRowToPublic,
  QUESTION_ROW_SELECT,
} from "../utils/questionLocale.js";

export const practiceRouter = Router();
practiceRouter.use(authMiddleware);

const startSchema = z.object({
  subject: z.string().min(1),
  count: z.number().int().min(1).max(20),
});

const checkSchema = z.object({
  questionId: z.string().uuid(),
  selectedOption: z.enum(["A", "B", "C", "D"]),
});

practiceRouter.get("/subjects", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT subject, COUNT(*)::int AS "questionCount"
       FROM questions
       WHERE subject IS NOT NULL
       GROUP BY subject
       ORDER BY subject`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

practiceRouter.post("/start", async (req, res, next) => {
  try {
    const { subject, count } = startSchema.parse(req.body);
    const userId = req.userId;

    const available = await pool.query(
      `SELECT COUNT(*)::int AS c FROM questions WHERE subject = $1`,
      [subject]
    );
    if (available.rows[0].c === 0) {
      throw new HttpError(404, `No questions found for subject "${subject}"`);
    }

    const { rows: questions } = await pool.query(
      `SELECT ${QUESTION_ROW_SELECT}
       FROM questions
       WHERE subject = $1
       ORDER BY RANDOM()
       LIMIT $2`,
      [subject, count]
    );

    const session = await pool.query(
      `INSERT INTO practice_sessions (user_id, subject, total_questions)
       VALUES ($1, $2, $3)
       RETURNING id, started_at`,
      [userId, subject, questions.length]
    );
    const lang = getContentLang(req);

    res.status(201).json({
      sessionId: session.rows[0].id,
      subject,
      startedAt: session.rows[0].started_at,
      totalQuestions: questions.length,
      questions: questions.map((r) => mapQuestionRowToPublic(r, lang)),
    });
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

practiceRouter.post("/:sessionId/check", async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.userId;
    const { questionId, selectedOption } = checkSchema.parse(req.body);

    const sess = await pool.query(
      `SELECT id FROM practice_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    if (sess.rowCount === 0) {
      throw new HttpError(404, "Practice session not found");
    }

    const q = await pool.query(
      `SELECT correct_option, hint, hint_hi, official_explanation, official_explanation_hi
       FROM questions WHERE id = $1`,
      [questionId]
    );
    if (q.rowCount === 0) {
      throw new HttpError(404, "Question not found");
    }

    const row = q.rows[0];
    const isCorrect = selectedOption === row.correct_option;
    const lang = getContentLang(req);
    const pick = (en, hi) =>
      lang === "hi" && hi != null && String(hi).trim() !== ""
        ? String(hi).trim()
        : en;

    const upsertAnswer = await pool.query(
      `INSERT INTO practice_answers (session_id, question_id, selected_option, is_correct)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id, question_id)
       DO NOTHING
       RETURNING id`,
      [sessionId, questionId, selectedOption, isCorrect]
    );

    if (isCorrect && upsertAnswer.rowCount > 0) {
      await pool.query(
        `UPDATE practice_sessions SET correct = correct + 1 WHERE id = $1`,
        [sessionId]
      );
    }

    res.json({
      correct: isCorrect,
      correctOption: row.correct_option,
      hint: pick(row.hint, row.hint_hi),
      officialExplanation: pick(row.official_explanation, row.official_explanation_hi),
    });
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

practiceRouter.post("/:sessionId/complete", async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.userId;

    const result = await pool.query(
      `UPDATE practice_sessions
       SET completed_at = now()
       WHERE id = $1 AND user_id = $2 AND completed_at IS NULL
       RETURNING id, subject, total_questions, correct, started_at, completed_at`,
      [sessionId, userId]
    );

    if (result.rowCount === 0) {
      throw new HttpError(404, "Session not found or already completed");
    }

    const s = result.rows[0];
    res.json({
      sessionId: s.id,
      subject: s.subject,
      totalQuestions: s.total_questions,
      correct: s.correct,
      startedAt: s.started_at,
      completedAt: s.completed_at,
    });
  } catch (e) {
    next(e);
  }
});
