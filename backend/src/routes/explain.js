import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  explainBodySchema,
  getExplanation,
} from "../services/explainService.js";

export const explainRouter = Router();
explainRouter.use(authMiddleware);

const explainLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  message: { error: "Too many explanation requests from this IP, try again shortly" },
  standardHeaders: true,
  legacyHeaders: false,
});

explainRouter.post("/", explainLimiter, async (req, res, next) => {
  try {
    const body = explainBodySchema.parse(req.body);
    const result = await getExplanation(pool, req.userId, body);
    const { cached: _c, ...payload } = result;
    res.json(payload);
  } catch (e) {
    next(e);
  }
});
