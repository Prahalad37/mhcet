import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import { explainRateLimiter } from "../middleware/explainRateLimiter.js";
import { getExplainQueue } from "../jobs/queues.js";

const bodySchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  question: z.string().optional(),
  options: z
    .object({
      A: z.string(),
      B: z.string(),
      C: z.string(),
      D: z.string(),
    })
    .optional(),
  correctAnswer: z.enum(["A", "B", "C", "D"]).optional(),
});

export const explainRouter = Router();
explainRouter.use(authMiddleware);
explainRouter.use(explainRateLimiter);

explainRouter.post("/", async (req, res, next) => {
  try {
    if (process.env.EXPLAIN_AI_ENABLED === "false" || process.env.EXPLAIN_AI_ENABLED === "0") {
      throw new HttpError(503, "AI explanations are disabled");
    }

    if (!process.env.REDIS_URL) {
      throw new HttpError(503, "Explanation queue is unavailable (configure REDIS_URL and run the worker)");
    }

    const parsed = bodySchema.parse(req.body);
    const userId = req.userId;

    const clientExtras =
      parsed.question != null || parsed.options != null || parsed.correctAnswer != null
        ? {
            question: parsed.question,
            options: parsed.options,
            correctAnswer: parsed.correctAnswer,
          }
        : undefined;

    let queue;
    try {
      queue = getExplainQueue();
    } catch {
      throw new HttpError(503, "Explanation queue is unavailable (configure REDIS_URL and run the worker)");
    }

    const job = await queue.add(
      "explain",
      {
        userId,
        attemptId: parsed.attemptId,
        questionId: parsed.questionId,
        clientExtras,
      },
      {
        removeOnComplete: 500,
        removeOnFail: 200,
        attempts: 1,
      }
    );

    const jobId = String(job.id);
    res.status(202).json({
      jobId,
      status: "queued",
      statusUrl: `/api/jobs/${jobId}`,
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
