import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";
import { logError, logWarn } from "../utils/logger.js";

/**
 * Maps infra failures to 503 + a concrete message so deploy issues are visible in the UI
 * (frontend shows `error` from JSON) instead of a generic 500.
 */
function classifyInfrastructureError(err) {
  if (!err) return null;
  if (err.message === "JWT_SECRET is required") {
    return {
      status: 503,
      error: "Server misconfiguration: JWT_SECRET is not set on the API",
    };
  }
  const c = err.code;
  if (
    c === "ECONNREFUSED" ||
    c === "ENOTFOUND" ||
    c === "ETIMEDOUT" ||
    c === "EAI_AGAIN" ||
    c === "57P03" ||
    c === "28P01" ||
    c === "3D000"
  ) {
    return {
      status: 503,
      error:
        "Database unavailable — check DATABASE_URL on the API host and that Postgres is reachable",
    };
  }
  return null;
}

export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId;

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      if (err.status === 503 && err.expose === true) {
        logWarn({
          msg: "http_error",
          requestId,
          status: err.status,
          error: err.message,
        });
      } else {
        logError({ msg: "http_error", requestId, status: err.status }, err);
      }
    }
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.flatten().fieldErrors,
    });
  }

  if (err.message === "Not allowed by CORS") {
    logWarn({ msg: "cors_rejected", requestId, origin: req.headers.origin });
    return res.status(403).json({ error: "CORS: origin not allowed" });
  }

  if (err.code === "23505") {
    return res.status(409).json({ error: "Resource already exists" });
  }

  const infra = classifyInfrastructureError(err);
  if (infra) {
    logError(
      { msg: "infrastructure_error", requestId, path: req.originalUrl, code: err.code },
      err
    );
    return res.status(infra.status).json({ error: infra.error });
  }

  const status = err.statusCode || err.status || 500;
  const expose = err.expose === true;
  const message =
    status >= 500 && !expose
      ? "Something went wrong"
      : err.message || "Request failed";

  if (status >= 500) {
    logError({ msg: "unhandled_error", requestId, path: req.originalUrl }, err);
  }

  return res.status(status).json({ error: message });
}
