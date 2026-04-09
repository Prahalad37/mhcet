/**
 * Background workers (BullMQ). Run alongside the API in production:
 *   cd backend && npm run worker
 *
 * Requires REDIS_URL and DATABASE_URL (same as API).
 */
import dotenv from "dotenv";
dotenv.config();

import { createExplainWorker } from "./explainWorker.js";
import { attachImportAuditHooks, createImportWorker } from "./importWorker.js";
import { closeRedisConnections } from "../jobs/connection.js";

if (!process.env.REDIS_URL) {
  console.error("REDIS_URL is required for workers");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for workers");
  process.exit(1);
}

const explainWorker = createExplainWorker();
const importWorker = createImportWorker();
attachImportAuditHooks(importWorker);

function log(msg, extra) {
  console.log(JSON.stringify({ msg, ...extra, t: new Date().toISOString() }));
}

explainWorker.on("completed", (job) => {
  log("worker_job_completed", { queue: "explain", jobId: job.id });
});
explainWorker.on("failed", (job, err) => {
  log("worker_job_failed", {
    queue: "explain",
    jobId: job?.id,
    error: err?.message,
  });
});

importWorker.on("completed", (job) => {
  log("worker_job_completed", { queue: "import", jobId: job.id });
});
importWorker.on("failed", (job, err) => {
  log("worker_job_failed", {
    queue: "import",
    jobId: job?.id,
    error: err?.message,
  });
});

async function shutdown(signal) {
  log("worker_shutdown", { signal });
  await explainWorker.close();
  await importWorker.close();
  await closeRedisConnections();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

log("workers_started", { pid: process.pid });
