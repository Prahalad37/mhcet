import dns from "dns/promises";
import Redis from "ioredis";
import { logError, logInfo, logWarn, redactSecrets } from "../utils/logger.js";

/** @type {Redis | null} */
let shared = null;

/**
 * Resolve and normalize Redis URL for ioredis/BullMQ.
 * - Prefers REDIS_URL, then UPSTASH_REDIS_REDIS_URL (some dashboards only set the latter).
 * - Upstash uses TLS: `redis-cli --tls -u redis://...` maps to Node needing `rediss://`.
 *   We upgrade `redis://` → `rediss://` only when the host is `*.upstash.io` (not localhost).
 * - Writes back to process.env.REDIS_URL so the rest of the process sees one canonical value.
 */
export function resolveRedisUrl() {
  let raw = String(process.env.REDIS_URL || "").trim();
  if (!raw) raw = String(process.env.UPSTASH_REDIS_REDIS_URL || "").trim();
  if (!raw) return "";

  let url = raw;
  try {
    const u = new URL(url);
    const host = u.hostname || "";
    const isUpstash = host === "upstash.io" || host.endsWith(".upstash.io");
    if (u.protocol === "redis:" && isUpstash) {
      const next = url.replace(/^redis:\/\//i, "rediss://");
      if (next !== url) {
        logInfo({
          msg: "redis_url_normalized",
          detail: "Upstash uses TLS; use rediss:// in Node (was redis:// from redis-cli style).",
        });
      }
      url = next;
    }
  } catch {
    process.env.REDIS_URL = raw;
    return raw;
  }
  process.env.REDIS_URL = url;
  return url;
}

/** Last log time per error signature — avoids spamming logs on reconnect storms */
const errorLogThrottle = new Map();
const ERROR_LOG_INTERVAL_MS = 10_000;

function attachErrorHandler(redis, label) {
  redis.on("error", (err) => {
    const sig = `${label}:${err.code || "ERR"}`;
    const now = Date.now();
    const last = errorLogThrottle.get(sig) ?? 0;
    if (now - last < ERROR_LOG_INTERVAL_MS) return;
    errorLogThrottle.set(sig, now);
    logWarn({
      msg: "redis_connection_error",
      label,
      errCode: err.code,
      errMessage: redactSecrets(String(err.message || err)),
    });
  });
}

/**
 * BullMQ requires maxRetriesPerRequest: null.
 * Bounded retries stop infinite reconnect loops when REDIS_URL is wrong or Redis is down.
 */
function bullMqRedisOptions(extra = {}) {
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 40) {
        logWarn({
          msg: "redis_reconnect_stopped",
          attempts: times,
          hint: "Check REDIS_URL and that Redis is reachable; worker will not reconnect until restart.",
        });
        return null;
      }
      return Math.min(times * 400, 20_000);
    },
    ...extra,
  };
}

/**
 * Fail fast with a clear message if the Redis hostname does not resolve (common misconfigured Upstash URL).
 */
export async function assertRedisHostResolvable() {
  const url = resolveRedisUrl();
  if (!url) return;
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    logError({ msg: "redis_url_invalid" }, new Error("REDIS_URL is not a valid URL"));
    process.exit(1);
  }
  if (!hostname) {
    logError({ msg: "redis_url_no_hostname" }, new Error("REDIS_URL has no hostname"));
    process.exit(1);
  }
  try {
    await dns.lookup(hostname);
  } catch (e) {
    logError(
      {
        msg: "redis_host_dns_failed",
        hostname,
        hint:
          "Update REDIS_URL in backend/.env with the current connection string from your Redis host (e.g. Upstash dashboard). For local Docker Redis use redis://127.0.0.1:6379",
      },
      e
    );
    process.exit(1);
  }
}

/**
 * Shared Redis connection for BullMQ Queue producers.
 * Workers should use `duplicateConnection()` for separate connections.
 */
export function getRedisConnection() {
  const url = resolveRedisUrl();
  if (!url) {
    throw new Error("REDIS_URL is not set (or set UPSTASH_REDIS_REDIS_URL)");
  }
  if (!shared) {
    shared = new Redis(url, bullMqRedisOptions());
    attachErrorHandler(shared, "bullmq_shared");
  }
  return shared;
}

export function duplicateConnection() {
  const conn = getRedisConnection().duplicate(
    bullMqRedisOptions({
      enableOfflineQueue: false,
    })
  );
  attachErrorHandler(conn, "bullmq_worker");
  return conn;
}

export async function closeRedisConnections() {
  if (shared) {
    await shared.quit();
    shared = null;
  }
}
