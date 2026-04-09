import Redis from "ioredis";

/** @type {Redis | null} */
let shared = null;

/**
 * Shared Redis connection for BullMQ Queue producers.
 * Workers should use `duplicateConnection()` for separate connections.
 */
export function getRedisConnection() {
  const url = process.env.REDIS_URL;
  if (!url || !String(url).trim()) {
    throw new Error("REDIS_URL is not set");
  }
  if (!shared) {
    shared = new Redis(url, { maxRetriesPerRequest: null });
  }
  return shared;
}

export function duplicateConnection() {
  return getRedisConnection().duplicate({ maxRetriesPerRequest: null });
}

export async function closeRedisConnections() {
  if (shared) {
    await shared.quit();
    shared = null;
  }
}
