import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";
import { logError, logWarn } from "../utils/logger.js";

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
