import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth.js";
import { testsRouter } from "./routes/tests.js";
import { attemptsRouter } from "./routes/attempts.js";
import { explainRouter } from "./routes/explain.js";
import { analyticsRouter } from "./routes/analytics.js";
import { configRouter } from "./routes/config.js";
import { practiceRouter } from "./routes/practice.js";
import { adminRouter } from "./routes/admin.js";
import { auditRouter } from "./routes/audit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { pool } from "./db/pool.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { httpLogMiddleware } from "./middleware/httpLog.js";
import { requestTimeoutMiddleware } from "./middleware/requestTimeout.js";
import { apiGlobalLimiter } from "./middleware/apiGlobalLimiter.js";
import { logWarn } from "./utils/logger.js";

dotenv.config();

const defaultDevOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function parseOrigins() {
  return (process.env.CORS_ORIGIN || "")
    .split(/[,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** When `CORS_ALLOW_VERCEL_APP=true`, allow any `https://*.vercel.app` origin (previews + production alias). */
function isHttpsVercelAppOrigin(origin) {
  try {
    const u = new URL(origin);
    return u.protocol === "https:" && u.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export function buildCorsOptions() {
  const envOrigins = parseOrigins();
  const isProd = process.env.NODE_ENV === "production";
  /** In production, allow `https://*.vercel.app` by default (opt out with CORS_ALLOW_VERCEL_APP=false). */
  const allowVercelApp =
    isProd &&
    process.env.CORS_ALLOW_VERCEL_APP !== "false" &&
    process.env.CORS_ALLOW_VERCEL_APP !== "0";

  const allowedOrigins = isProd
    ? envOrigins
    : [...new Set([...defaultDevOrigins, ...envOrigins])];

  if (isProd && allowedOrigins.length === 0) {
    logWarn({
      msg: "cors_config",
      hint: "NODE_ENV=production but CORS_ORIGIN is empty — set comma-separated origins for browser access.",
    });
  }

  return {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (!isProd && allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (isProd && allowVercelApp && isHttpsVercelAppOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };
}

export function createApp() {
  const app = express();

  if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      // Default `same-origin` blocks cross-origin browser reads even when CORS allows the origin.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(requestIdMiddleware);
  app.use(httpLogMiddleware);
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestTimeoutMiddleware(10_000));
  app.use("/api", apiGlobalLimiter);

  app.get("/", (_req, res) =>
    res.json({
      service: "MHCET API",
      health: "/health",
      docs: "REST routes under /api/* (use the Next.js app on port 3000 for the UI).",
    })
  );

  app.get("/health", async (_req, res) => {
    let databaseUp = false;
    let dbErrorShort = null;
    try {
      await pool.query("SELECT 1");
      databaseUp = true;
    } catch (e) {
      dbErrorShort = String(e?.code || e?.message || e).slice(0, 120);
    }
    const uptimeSec = Math.floor(process.uptime());
    const env = process.env.NODE_ENV || "development";
    const status = databaseUp ? "ok" : "degraded";
    const body = {
      status,
      database: databaseUp ? "up" : "down",
      uptime: uptimeSec,
      env,
      ...(databaseUp ? {} : { dbError: dbErrorShort }),
    };
    res.status(databaseUp ? 200 : 503).json(body);
  });

  app.use("/api/auth", authRouter);
  app.use("/api/tests", testsRouter);
  app.use("/api/attempts", attemptsRouter);
  app.use("/api/explain", explainRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/config", configRouter);
  app.use("/api/practice", practiceRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/audit", auditRouter);

  app.use(errorHandler);

  return app;
}
