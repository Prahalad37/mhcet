/**
 * Deletes every user with role "user". All rows with role "admin" are kept.
 * Related data for removed users cascades (attempts, answers, practice, etc.).
 *
 * Preview only:
 *   cd backend && node scripts/deleteNonAdminUsers.js --dry-run
 *
 * Execute:
 *   cd backend && npm run purge-non-admin-users
 *
 * Uses DATABASE_URL from backend/.env; optional backend/.env.railway override (same as reset-admin-users).
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");

dotenv.config({ path: path.join(backendRoot, ".env") });
const railwayEnvPath = path.join(backendRoot, ".env.railway");
if (fs.existsSync(railwayEnvPath)) {
  dotenv.config({ path: railwayEnvPath, override: true });
  console.log("Using backend/.env.railway (overrides DATABASE_URL when set).\n");
}

const { pool } = await import("../src/db/pool.js");

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const yes = process.argv.includes("--yes");

  if (!dryRun && !yes) {
    console.error(
      "Refusing to run without --yes. Preview with: node scripts/deleteNonAdminUsers.js --dry-run\n" +
        "Then run: npm run purge-non-admin-users"
    );
    process.exit(1);
  }

  const { rows: admins } = await pool.query(
    `SELECT id, email FROM users WHERE role = 'admin' ORDER BY email`
  );
  const { rows: students } = await pool.query(
    `SELECT id, email, role FROM users WHERE role <> 'admin' ORDER BY email`
  );

  console.log(`Admins kept (${admins.length}):`);
  for (const a of admins) console.log(`  - ${a.email}`);
  console.log(
    `\nNon-admin users ${dryRun ? "to delete" : "deleted"} (${students.length}):`
  );
  for (const s of students) console.log(`  - ${s.email} (${s.role})`);

  if (dryRun) {
    console.log("\nDry run only — no rows removed. Re-run with --yes to delete.\n");
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const del = await client.query(
      `DELETE FROM users WHERE role <> 'admin' RETURNING id`
    );
    await client.query("COMMIT");
    console.log(`\nRemoved ${del.rowCount} user(s). ${admins.length} admin(s) unchanged.\n`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
