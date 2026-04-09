import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { pool } from "./pool.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "migrations");

/** Single-app id for pg_advisory_lock (avoid collisions with other lock users on the same DB). */
const MIGRATE_ADVISORY_LOCK_KEY = 0x505245504d; // "PREPM" in hex

/**
 * Run all pending migrations. Does NOT close the pool — safe to call from
 * within a long-running server process (index.js imports this).
 */
export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATE_ADVISORY_LOCK_KEY]);
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);

      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();

      for (const file of files) {
        const applied = await client.query(
          "SELECT 1 FROM schema_migrations WHERE name = $1",
          [file]
        );
        if (applied.rowCount > 0) continue;

        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
            file,
          ]);
          await client.query("COMMIT");
          console.log("Applied:", file);
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        }
      }

      console.log("Migrations complete.");
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [
        MIGRATE_ADVISORY_LOCK_KEY,
      ]);
    }
  } finally {
    client.release();
  }
}

/**
 * Standalone entry point: run migrations then close the pool and exit.
 * Used by: npm run migrate
 */
async function migrateAndExit() {
  try {
    await runMigrations();
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run as a script when invoked directly (not imported as a module)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateAndExit();
}
