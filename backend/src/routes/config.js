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

    res.json({
      plan,
      testsTodayUtc,
      freeTestsPerDay: cap,
      canStartMock,
    });
  } catch (e) {
    next(e);
  }
});
