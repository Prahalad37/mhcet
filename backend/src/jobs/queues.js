import { Queue } from "bullmq";
import { getRedisConnection } from "./connection.js";

export const EXPLAIN_QUEUE_NAME = "mhcet-explain";
export const IMPORT_QUEUE_NAME = "mhcet-import";

/** @type {Queue | null} */
let explainQueue = null;
/** @type {Queue | null} */
let importQueue = null;

function connectionOpts() {
  return getRedisConnection();
}

export function getExplainQueue() {
  if (!explainQueue) {
    explainQueue = new Queue(EXPLAIN_QUEUE_NAME, {
      connection: connectionOpts(),
    });
  }
  return explainQueue;
}

export function getImportQueue() {
  if (!importQueue) {
    importQueue = new Queue(IMPORT_QUEUE_NAME, {
      connection: connectionOpts(),
    });
  }
  return importQueue;
}

/**
 * Find a job by id and verify ownership.
 * @returns {Promise<{ job: import("bullmq").Job, kind: "explain" | "import" } | null>}
 */
export async function findOwnedJob(jobId, userId) {
  const eq = getExplainQueue();
  const iq = getImportQueue();
  let job = await eq.getJob(jobId);
  if (job) {
    if (job.data?.userId !== userId) return null;
    return { job, kind: "explain" };
  }
  job = await iq.getJob(jobId);
  if (job) {
    if (job.data?.userId !== userId) return null;
    return { job, kind: "import" };
  }
  return null;
}

export async function closeQueues() {
  const tasks = [];
  if (explainQueue) {
    tasks.push(explainQueue.close());
    explainQueue = null;
  }
  if (importQueue) {
    tasks.push(importQueue.close());
    importQueue = null;
  }
  await Promise.all(tasks);
}
