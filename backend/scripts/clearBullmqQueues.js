/**
 * Destroys all jobs in BullMQ queues (Redis). Use after DB reset / env switch when
 * stale import jobs reference deleted tests (worker_job_failed: Test not found).
 *
 * Usage:
 *   node scripts/clearBullmqQueues.js --yes
 *   node scripts/clearBullmqQueues.js --yes --import-only
 *   node scripts/clearBullmqQueues.js --yes --explain-only
 *
 * Requires REDIS_URL in .env (same as API/worker). Stops if --yes is missing.
 */
import "dotenv/config";
import Redis from "ioredis";
import { Queue } from "bullmq";
import { EXPLAIN_QUEUE_NAME, IMPORT_QUEUE_NAME } from "../src/jobs/queues.js";

async function obliterateQueue(name) {
  const connection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  try {
    const q = new Queue(name, { connection });
    await q.obliterate({ force: true });
    await q.close();
    console.log(
      JSON.stringify({
        msg: "queue_obliterated",
        queue: name,
        t: new Date().toISOString(),
      })
    );
  } finally {
    await connection.quit();
  }
}

async function main() {
  if (!process.env.REDIS_URL?.trim()) {
    console.error("REDIS_URL is required");
    process.exit(1);
  }
  if (!process.argv.includes("--yes")) {
    console.error(
      "Refusing to run without --yes. Example: node scripts/clearBullmqQueues.js --yes --import-only"
    );
    process.exit(1);
  }

  const importOnly = process.argv.includes("--import-only");
  const explainOnly = process.argv.includes("--explain-only");
  const both = !importOnly && !explainOnly;
  const runImport = both || importOnly;
  const runExplain = both || explainOnly;

  if (importOnly && explainOnly) {
    console.error("Use only one of --import-only or --explain-only, or neither for both.");
    process.exit(1);
  }

  if (runImport) await obliterateQueue(IMPORT_QUEUE_NAME);
  if (runExplain) await obliterateQueue(EXPLAIN_QUEUE_NAME);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
