import { logInfo } from "../utils/logger.js";

/**
 * One structured access line per request after the response finishes.
 * Does not log Authorization, cookies, or bodies.
 */
export function httpLogMiddleware(req, res, next) {
  const start = Date.now();
  const method = req.method;
  const path = req.originalUrl?.split("?")[0] || req.url;

  logInfo({
    msg: "http_request_start",
    requestId: req.requestId,
    method,
    path,
  });

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logInfo({
      msg: "http_request",
      requestId: req.requestId,
      method,
      path,
      status: res.statusCode,
      durationMs,
    });
  });

  next();
}
