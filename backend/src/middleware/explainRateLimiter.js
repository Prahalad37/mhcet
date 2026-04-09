import rateLimit from "express-rate-limit";

/** Burst protection for expensive explain enqueue (per IP). */
export const explainRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  message: { error: "Too many explanation requests from this IP, try again shortly" },
  standardHeaders: true,
  legacyHeaders: false,
});
