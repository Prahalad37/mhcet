#!/usr/bin/env node
/**
 * Pre-deploy sanity check for required API environment variables.
 * Run from repo root: `node backend/scripts/verifyProductionEnv.js`
 * or `npm run verify:prod-env` from backend/.
 *
 * Does not start the server or connect to Redis; use GET /health for runtime checks.
 * For explain-queue failures in production, check worker logs for worker_job_failed / job errors.
 */
import "dotenv/config";

function fail(msg) {
  console.error(`[verifyProductionEnv] ${msg}`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`[verifyProductionEnv] WARN: ${msg}`);
}

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  fail("DATABASE_URL is missing or empty.");
}
if (dbUrl.includes("DATABASE_URL=")) {
  fail(
    'DATABASE_URL appears duplicated (e.g. "DATABASE_URL=DATABASE_URL=..."). Use a single URL value.'
  );
}

const jwt = process.env.JWT_SECRET?.trim();
if (!jwt || jwt.length < 32) {
  fail("JWT_SECRET must be set and at least 32 characters.");
}

const nodeEnv = process.env.NODE_ENV || "development";
if (nodeEnv === "production") {
  if (!process.env.CORS_ORIGIN?.trim()) {
    warn(
      "CORS_ORIGIN is empty in production — browser requests from the web app may be rejected unless defaults cover your origin."
    );
  }
}

if (!process.env.REDIS_URL?.trim()) {
  warn(
    "REDIS_URL is not set — POST /api/explain queue jobs will not run until Redis is configured and a worker is running."
  );
}

console.log("[verifyProductionEnv] OK — DATABASE_URL, JWT_SECRET present; see warnings above if any.");
