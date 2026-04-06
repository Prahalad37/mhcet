import crypto from "crypto";

/**
 * Ensures each request has a stable id for logs and responses.
 * Accepts incoming X-Request-Id or generates one.
 */
export function requestIdMiddleware(req, res, next) {
  const incoming =
    typeof req.headers["x-request-id"] === "string"
      ? req.headers["x-request-id"].trim().slice(0, 128)
      : "";
  const id =
    incoming && /^[\w-]+$/.test(incoming)
      ? incoming
      : crypto.randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
