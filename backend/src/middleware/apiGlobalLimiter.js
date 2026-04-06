import rateLimit from "express-rate-limit";

/**
 * Broad protection for /api (scraping / accidental loops). Stricter limits on expensive routes (e.g. explain).
 */
export const apiGlobalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: "Too many requests from this IP, try again shortly" },
  standardHeaders: true,
  legacyHeaders: false,
});
