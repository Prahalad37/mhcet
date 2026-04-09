import { Worker } from "bullmq";
import { duplicateConnection } from "../jobs/connection.js";
import { IMPORT_QUEUE_NAME } from "../jobs/queues.js";
import { importQuestionsFromCSV } from "../services/importService.js";
import { pool } from "../db/pool.js";

export function createImportWorker() {
  const connection = duplicateConnection();
  return new Worker(
    IMPORT_QUEUE_NAME,
    async (job) => {
      const { testId, csvText, userId } = job.data;
      const result = await importQuestionsFromCSV(testId, csvText, userId);
      return result;
    },
    {
      connection,
      concurrency: 1,
    }
  );
}

/**
 * Best-effort audit log when import completes (async routes skip res.json middleware).
 */
export function attachImportAuditHooks(worker) {
  worker.on("completed", async (job) => {
    try {
      const userId = job.data?.userId;
      const testId = job.data?.testId;
      const returnvalue = job.returnvalue;
      if (!userId || !returnvalue) return;
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_data, new_data, metadata)
         VALUES ($1, 'import', 'question', $2, NULL, $3, $4)`,
        [
          userId,
          testId,
          JSON.stringify({
            imported: returnvalue.imported,
            total: returnvalue.total,
            testTitle: returnvalue.testTitle,
            jobId: job.id,
          }),
          JSON.stringify({
            source: "bullmq",
            jobId: job.id,
            completedAt: new Date().toISOString(),
          }),
        ]
      );
    } catch (e) {
      console.error("import audit log failed:", e);
    }
  });
}
