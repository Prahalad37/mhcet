import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { pool } from "../db/pool.js";
import { freeTestsPerDay, loadUserPlanAndTodayCount } from "../utils/planLimits.js";

export const configRouter = Router();
configRouter.use(authMiddleware);

/** Logged-in clients: plan / daily mock usage (UTC day). */
configRouter.get("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    const row = await loadUserPlanAndTodayCount(pool, userId);
    const plan = row?.plan === "paid" ? "paid" : "free";
    const testsTodayUtc = row?.tests_today ?? 0;
    const cap = freeTestsPerDay();
    const canStartMock = plan === "paid" || testsTodayUtc < cap;

    const explainDisabled =
      process.env.EXPLAIN_AI_ENABLED === "false" || process.env.EXPLAIN_AI_ENABLED === "0";
    const explainAvailable = !explainDisabled && !!process.env.REDIS_URL;
    const aiProvider = (process.env.AI_PROVIDER || "mock").toLowerCase();

    res.json({
      plan,
      testsTodayUtc,
      freeTestsPerDay: cap,
      canStartMock,
      explainAvailable,
      aiProvider,
    });
  } catch (e) {
    next(e);
  }
});
