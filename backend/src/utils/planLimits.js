import { HttpError } from "./httpError.js";

/** Max mock attempts per UTC day for `plan = free`. Paid users are unlimited. */
export function freeTestsPerDay() {
  const n = Number(process.env.FREE_TESTS_PER_DAY);
  return Number.isFinite(n) && n >= 0 ? n : 999999;
}

/**
 * @param {import("pg").Pool} pool
 * @param {string} userId
 */
export async function loadUserPlanAndTodayCount(pool, userId) {
  const { rows } = await pool.query(
    `SELECT u.plan,
            (SELECT COUNT(*)::int FROM attempts a
             WHERE a.user_id = u.id
               AND (a.started_at AT TIME ZONE 'UTC')::date =
                   (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
            ) AS tests_today
     FROM users u WHERE u.id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * @param {{ plan: string, tests_today: number } | null} row
 */
export function assertCanStartMockAttempt(row) {
  if (!row) {
    throw new HttpError(401, "User not found", { expose: true });
  }
  if (row.plan === "paid") return;
  const limit = freeTestsPerDay();
  if (row.tests_today >= limit) {
    throw new HttpError(403, "Limit reached", { expose: true });
  }
}
