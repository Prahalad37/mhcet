import { Router } from "express";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";

export const analyticsRouter = Router();
analyticsRouter.use(authMiddleware);

/** Min answered questions in a topic before we call out "weak" */
const MIN_FOR_WEAK = 3;
const WEAK_ACCURACY = 0.55;
/** Min answered to mention a "weakest" topic at all */
const MIN_FOR_INSIGHT = 2;

function sortRecommendedRows(rows) {
  return [...rows].sort((a, b) => {
    const aTaken =
      a.last_score != null &&
      a.last_total != null &&
      Number(a.last_total) > 0;
    const bTaken =
      b.last_score != null &&
      b.last_total != null &&
      Number(b.last_total) > 0;
    if (aTaken !== bTaken) return aTaken ? 1 : -1;
    const ra = aTaken ? Number(a.last_score) / Number(a.last_total) : 0;
    const rb = bTaken ? Number(b.last_score) / Number(b.last_total) : 0;
    if (ra !== rb) return ra - rb;
    return String(a.title).localeCompare(String(b.title));
  });
}

/**
 * GET /api/analytics/insights
 * Per-user topic accuracy from submitted attempts; weak-topic message; recommended tests.
 */
analyticsRouter.get("/insights", async (req, res, next) => {
  try {
    const userId = req.userId;

    const { rows: topicRows } = await pool.query(
      `SELECT t.topic,
              COUNT(*)::int AS attempted,
              SUM(CASE WHEN ans.is_correct THEN 1 ELSE 0 END)::int AS correct
       FROM attempts att
       JOIN tests t ON t.id = att.test_id
       JOIN answers ans ON ans.attempt_id = att.id
       WHERE att.user_id = $1
         AND att.status = 'submitted'
         AND ans.is_correct IS NOT NULL
       GROUP BY t.topic`,
      [userId]
    );

    const topicStats = topicRows.map((r) => {
      const attempted = r.attempted;
      const correct = r.correct;
      const accuracy = attempted > 0 ? correct / attempted : 0;
      return {
        topic: r.topic,
        attempted,
        correct,
        accuracy: Math.round(accuracy * 1000) / 1000,
      };
    });

    const weakTopics = topicStats
      .filter((s) => s.attempted >= MIN_FOR_WEAK && s.accuracy < WEAK_ACCURACY)
      .map((s) => s.topic);

    const withMinInsight = topicStats.filter(
      (s) => s.attempted >= MIN_FOR_INSIGHT
    );

    let primaryWeakTopic = null;
    if (weakTopics.length > 0) {
      const weakStats = topicStats.filter((s) => weakTopics.includes(s.topic));
      primaryWeakTopic = weakStats.reduce((a, b) =>
        a.accuracy <= b.accuracy ? a : b
      ).topic;
    } else if (withMinInsight.length > 0) {
      primaryWeakTopic = withMinInsight.reduce((a, b) =>
        a.accuracy <= b.accuracy ? a : b
      ).topic;
    }

    let insightMessage = null;
    if (primaryWeakTopic) {
      const row = topicStats.find((s) => s.topic === primaryWeakTopic);
      if (row && row.attempted >= MIN_FOR_WEAK && row.accuracy < WEAK_ACCURACY) {
        insightMessage = `You are weak in ${primaryWeakTopic}.`;
      } else if (row && row.attempted >= MIN_FOR_INSIGHT) {
        insightMessage = `Your weakest area so far is ${primaryWeakTopic}.`;
      }
    }

    const topicsForRecommend =
      weakTopics.length > 0
        ? weakTopics
        : primaryWeakTopic
          ? [primaryWeakTopic]
          : [];

    let recommendedTests = [];
    if (topicsForRecommend.length > 0) {
      const { rows: recRows } = await pool.query(
        `SELECT t.id,
                t.title,
                t.description,
                t.duration_seconds,
                t.topic,
                COUNT(q.id)::int AS question_count,
                (
                  SELECT att.score
                  FROM attempts att
                  WHERE att.user_id = $2
                    AND att.test_id = t.id
                    AND att.status = 'submitted'
                  ORDER BY att.submitted_at DESC
                  LIMIT 1
                ) AS last_score,
                (
                  SELECT att.total_questions
                  FROM attempts att
                  WHERE att.user_id = $2
                    AND att.test_id = t.id
                    AND att.status = 'submitted'
                  ORDER BY att.submitted_at DESC
                  LIMIT 1
                ) AS last_total
         FROM tests t
         LEFT JOIN questions q ON q.test_id = t.id
         WHERE t.is_active = true
           AND t.author_id IS NULL
           AND t.topic = ANY($1::text[])
         GROUP BY t.id`,
        [topicsForRecommend, userId]
      );

      const sorted = sortRecommendedRows(recRows);

      recommendedTests = sorted.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        durationSeconds: r.duration_seconds,
        topic: r.topic,
        questionCount: r.question_count,
        reason:
          weakTopics.includes(r.topic) && primaryWeakTopic === r.topic
            ? "Matches a topic to strengthen"
            : weakTopics.includes(r.topic)
              ? "Related to an area to review"
              : "Based on your recent performance",
      }));
    }

    if (recommendedTests.length === 0) {
      const { rows: anyRows } = await pool.query(
        `SELECT t.id,
                t.title,
                t.description,
                t.duration_seconds,
                t.topic,
                COUNT(q.id)::int AS question_count
         FROM tests t
         LEFT JOIN questions q ON q.test_id = t.id
         WHERE t.is_active = true
           AND t.author_id IS NULL
         GROUP BY t.id
         ORDER BY t.created_at DESC
         LIMIT 5`
      );
      recommendedTests = anyRows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        durationSeconds: r.duration_seconds,
        topic: r.topic,
        questionCount: r.question_count,
        reason: "Try these next",
      }));
    }

    res.json({
      topicStats,
      weakTopics,
      primaryWeakTopic,
      insightMessage,
      recommendedTests,
    });
  } catch (e) {
    next(e);
  }
});
