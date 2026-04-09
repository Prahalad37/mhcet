import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend/ regardless of what the cwd is.
// When run from repo root (Railway): __dirname = /app/backend/src/db → ../../.env = /app/backend/.env ✓
// When run from backend/ (local dev): same result ✓
// If DATABASE_URL is already in process.env (Railway injects it), dotenv is a no-op.
dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config(); // fallback: also try cwd/.env

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2000,
  ssl: (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('.internal')) 
    ? { rejectUnauthorized: false } 
    : undefined,
});
