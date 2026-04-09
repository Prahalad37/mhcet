import { Worker } from "bullmq";
import { duplicateConnection } from "../jobs/connection.js";
import { EXPLAIN_QUEUE_NAME } from "../jobs/queues.js";
import { runExplainJob } from "../services/explainService.js";

export function createExplainWorker() {
  const connection = duplicateConnection();
  return new Worker(
    EXPLAIN_QUEUE_NAME,
    async (job) => {
      const result = await runExplainJob(job.data);
      return result;
    },
    {
      connection,
      concurrency: Number(process.env.EXPLAIN_WORKER_CONCURRENCY || 3),
    }
  );
}
