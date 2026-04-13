/**
 * Inserts five empty MHCET Law catalog tests (title, description, duration, topic only).
 * Skips any row whose title already exists (idempotent).
 *
 * Usage: npm run seed:blank-mocks
 * Optional: --force  → delete existing tests with the same titles, then re-insert (no questions).
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
}

const { pool } = await import("../src/db/pool.js");
const { mhcetBlankMockShells } = await import("../src/db/seedData/mhcetBlankMockShells.js");

const force = process.argv.includes("--force");

async function main() {
  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;
  try {
    await client.query("BEGIN");
    for (const t of mhcetBlankMockShells) {
      if (force) {
        await client.query(`DELETE FROM tests WHERE title = $1 AND author_id IS NULL`, [t.title]);
      } else {
        const dup = await client.query(`SELECT 1 FROM tests WHERE title = $1 LIMIT 1`, [t.title]);
        if (dup.rowCount > 0) {
          skipped += 1;
          console.log(`Skip (exists): ${t.title}`);
          continue;
        }
      }
      await client.query(
        `INSERT INTO tests (title, description, duration_seconds, topic, is_active, tenant_id, author_id)
         VALUES ($1, $2, $3, $4, true, NULL, NULL)`,
        [t.title, t.description, t.durationSeconds, t.topic]
      );
      inserted += 1;
      console.log(`Inserted: ${t.title}`);
    }
    await client.query("COMMIT");
    console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}. Questions: add via Admin.`);
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
