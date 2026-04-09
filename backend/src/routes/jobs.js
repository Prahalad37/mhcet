import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import { findOwnedJob } from "../jobs/queues.js";

export const jobsRouter = Router();
jobsRouter.use(authMiddleware);

function mapState(bullState) {
  if (bullState === "completed") return "completed";
  if (bullState === "failed") return "failed";
  if (bullState === "active") return "active";
  if (
    bullState === "delayed" ||
    bullState === "waiting" ||
    bullState === "waiting-children" ||
    bullState === "prioritized" ||
    bullState === "repeat"
  ) {
    return "queued";
  }
  if (bullState === "paused") return "queued";
  return "queued";
}

jobsRouter.get("/:jobId", async (req, res, next) => {
  try {
    const jobId = req.params.jobId;
    const userId = req.userId;
    const found = await findOwnedJob(jobId, userId);
    if (!found) {
      throw new HttpError(404, "Job not found");
    }
    const { job, kind } = found;
    const state = await job.getState();
    const status = mapState(state);
    const body = {
      jobId: job.id,
      kind,
      status,
    };
    if (status === "completed") {
      const rv = job.returnvalue;
      body.result = rv ?? null;
    }
    if (status === "failed") {
      body.error =
        typeof job.failedReason === "string" && job.failedReason
          ? job.failedReason
          : "Job failed";
    }
    res.json(body);
  } catch (e) {
    next(e);
  }
});
