import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { pool } from "../db/pool.js";
import {
  computeExplainAvailable,
  getExplainProviderId,
} from "../services/ai/index.js";
import { freeTestsPerDay, loadUserPlanAndTodayCount } from "../utils/planLimits.js";

export const configRouter = Router();
configRouter.use(authMiddleware);

/** Logged-in clients: optional features + plan / daily mock usage (UTC day). */
configRouter.get("/", async (req, res, next) => {
  try {
    const userId = req.userId;
    const row = await loadUserPlanAndTodayCount(pool, userId);
    const plan = row?.plan === "paid" ? "paid" : "free";
    const testsTodayUtc = row?.tests_today ?? 0;
    const cap = freeTestsPerDay();
    const canStartMock = plan === "paid" || testsTodayUtc < cap;

    res.json({
      explainAvailable: computeExplainAvailable(),
      /** Effective provider (mock if EXPLAIN_KILL_SWITCH or AI_PROVIDER=mock) */
      aiProvider: getExplainProviderId(),
      plan,
      testsTodayUtc,
      freeTestsPerDay: cap,
      canStartMock,
    });
  } catch (e) {
    next(e);
  }
});
