/**
 * Per-request response timeout. Prevents hung handlers from holding connections forever.
 */
export function requestTimeoutMiddleware(ms) {
  return (req, res, next) => {
    res.setTimeout(ms, () => {
      if (res.headersSent || res.writableEnded) return;
      res.status(503).json({ error: "Request timeout" });
    });
    next();
  };
}
