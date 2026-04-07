import { Router } from "express";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";

export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware);

/**
 * GET /api/dashboard
 * Returns everything the dashboard needs in one call:
 *  - stats: totalTests, overallAccuracy, practiceAnswered, activeDays
 *  - recentAttempts: last 3 submitted attempts
 *  - weakSubjects: top 3 lowest accuracy subjects (min 2 answered)
 *  - nextTest: one recommended test to take next
 *  - inProgressAttemptId: resume banner data if exists
 */
dashboardRouter.get("/", async (req, res, next) => {
  try {
    const userId = req.userId;

    // ── 1. Core stats ───────────────────────────────────────────────
    const { rows: statRows } = await pool.query(
      `SELECT
         COUNT(DISTINCT att.id)::int                                          AS total_tests,
         COALESCE(SUM(att.score), 0)::int                                    AS total_correct,
         COALESCE(SUM(att.total_questions), 0)::int                          AS total_questions,
         COUNT(DISTINCT DATE(att.submitted_at AT TIME ZONE 'UTC'))::int      AS active_days
       FROM attempts att
       WHERE att.user_id = $1 AND att.status = 'submitted'`,
      [userId]
    );

    const { rows: practiceRows } = await pool.query(
      `SELECT COUNT(*)::int AS practice_answered
       FROM practice_answers pa
       JOIN practice_sessions ps ON ps.id = pa.session_id
       WHERE ps.user_id = $1`,
      [userId]
    );

    const stat = statRows[0];
    const totalTests = stat.total_tests ?? 0;
    const totalCorrect = stat.total_correct ?? 0;
    const totalQuestions = stat.total_questions ?? 0;
    const activeDays = stat.active_days ?? 0;
    const overallAccuracy =
      totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;
    const practiceAnswered = practiceRows[0]?.practice_answered ?? 0;

    // ── 2. Recent 3 submitted attempts ──────────────────────────────
    const { rows: recentRows } = await pool.query(
      `SELECT att.id, att.score, att.total_questions, att.submitted_at,
              t.title, t.topic, t.id AS test_id
       FROM attempts att
       JOIN tests t ON t.id = att.test_id
       WHERE att.user_id = $1 AND att.status = 'submitted'
       ORDER BY att.submitted_at DESC
       LIMIT 3`,
      [userId]
    );

    const recentAttempts = recentRows.map((r) => ({
      attemptId: r.id,
      testId: r.test_id,
      title: r.title,
      topic: r.topic,
      score: r.score ?? 0,
      total: r.total_questions ?? 0,
      accuracy:
        r.total_questions > 0
          ? Math.round((r.score / r.total_questions) * 100)
          : null,
      submittedAt: r.submitted_at,
    }));

    // ── 3. Weak subjects (min 2 answered, lowest accuracy first) ────
    const { rows: subjectRows } = await pool.query(
      `SELECT
         q.subject,
         COUNT(*)::int                                             AS attempted,
         SUM(CASE WHEN ans.is_correct THEN 1 ELSE 0 END)::int    AS correct
       FROM attempts att
       JOIN answers ans ON ans.attempt_id = att.id
       JOIN questions q  ON q.id = ans.question_id
       WHERE att.user_id = $1
         AND att.status = 'submitted'
         AND ans.is_correct IS NOT NULL
         AND q.subject IS NOT NULL AND q.subject != ''
       GROUP BY q.subject
       HAVING COUNT(*) >= 2
       ORDER BY (SUM(CASE WHEN ans.is_correct THEN 1 ELSE 0 END)::float / COUNT(*)) ASC
       LIMIT 3`,
      [userId]
    );

    const weakSubjects = subjectRows.map((r) => ({
      subject: r.subject,
      attempted: r.attempted,
      correct: r.correct,
      accuracy: Math.round((r.correct / r.attempted) * 100),
    }));

    // ── 4. In-progress attempt (resume banner) ──────────────────────
    const { rows: ipRows } = await pool.query(
      `SELECT att.id AS attempt_id, t.id AS test_id, t.title
       FROM attempts att
       JOIN tests t ON t.id = att.test_id
       WHERE att.user_id = $1 AND att.status = 'in_progress'
       ORDER BY att.started_at DESC
       LIMIT 1`,
      [userId]
    );
    const inProgress = ipRows[0]
      ? {
          attemptId: ipRows[0].attempt_id,
          testId: ipRows[0].test_id,
          title: ipRows[0].title,
        }
      : null;

    // ── 5. Next recommended test ─────────────────────────────────────
    // First try: unattempted test in weakest topic
    let nextTest = null;
    if (weakSubjects.length > 0) {
      const { rows: nextRows } = await pool.query(
        `SELECT t.id, t.title, t.topic, COUNT(q.id)::int AS question_count, t.duration_seconds
         FROM tests t
         LEFT JOIN questions q ON q.test_id = t.id
         WHERE t.is_active = true
           AND t.author_id IS NULL
           AND t.id NOT IN (
             SELECT test_id FROM attempts WHERE user_id = $1 AND status = 'submitted'
           )
         GROUP BY t.id
         ORDER BY RANDOM()
         LIMIT 1`,
        [userId]
      );
      if (nextRows[0]) nextTest = nextRows[0];
    }

    // Fallback: any unattempted test
    if (!nextTest) {
      const { rows: fallbackRows } = await pool.query(
        `SELECT t.id, t.title, t.topic, COUNT(q.id)::int AS question_count, t.duration_seconds
         FROM tests t
         LEFT JOIN questions q ON q.test_id = t.id
         WHERE t.is_active = true AND t.author_id IS NULL
         GROUP BY t.id
         ORDER BY t.created_at DESC
         LIMIT 1`
      );
      if (fallbackRows[0]) nextTest = fallbackRows[0];
    }

    const nextTestFormatted = nextTest
      ? {
          id: nextTest.id,
          title: nextTest.title,
          topic: nextTest.topic,
          questionCount: nextTest.question_count,
          durationSeconds: nextTest.duration_seconds,
        }
      : null;

    res.json({
      stats: {
        totalTests,
        overallAccuracy,
        practiceAnswered,
        activeDays,
      },
      recentAttempts,
      weakSubjects,
      inProgress,
      nextTest: nextTestFormatted,
    });
  } catch (e) {
    next(e);
  }
});
