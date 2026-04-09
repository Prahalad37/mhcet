import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..");

dotenv.config({ path: path.join(backendRoot, ".env") });
const railwayEnvPath = path.join(backendRoot, ".env.railway");
if (fs.existsSync(railwayEnvPath)) {
  dotenv.config({ path: railwayEnvPath, override: true });
  console.log("Using backend/.env.railway (overrides DATABASE_URL from .env when set).\n");
}

const { pool } = await import("./pool.js");
const { mhcetLaw5YearTests } = await import("./seedData/mhcetLaw5YearCourse.js");

const reset = process.argv.includes("--reset");

/** Single MHCET Law (5-Year LLB) catalog mock; see seedData/mhcetLaw5YearCourse.js */
const sampleTests = mhcetLaw5YearTests;

async function seed() {
  const client = await pool.connect();
  try {
    if (reset) {
      await client.query("DELETE FROM tests");
      console.log("Cleared tests (and related attempts/questions via FK CASCADE).");
    } else {
      const { rows: existing } = await client.query(
        "SELECT COUNT(*)::int AS c FROM tests"
      );
      if (existing[0].c > 0) {
        console.log("Tests already present, skipping seed. Use: npm run seed:reset");
        return;
      }
    }

    for (const t of sampleTests) {
      const tr = await client.query(
        `INSERT INTO tests (title, description, duration_seconds, is_active, topic)
         VALUES ($1, $2, $3, true, $4)
         RETURNING id`,
        [t.title, t.description, t.durationSeconds, t.topic]
      );
      const testId = tr.rows[0].id;

      for (const row of t.questions) {
        await client.query(
          `INSERT INTO questions (
             test_id, prompt, option_a, option_b, option_c, option_d, correct_option, order_index,
             hint, official_explanation, subject
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            testId,
            row.prompt,
            row.option_a,
            row.option_b,
            row.option_c,
            row.option_d,
            row.correct,
            row.order,
            row.hint ?? null,
            row.official_explanation ?? null,
            row.subject ?? null,
          ]
        );
      }
    }

    console.log(`Seed complete (${sampleTests.length} tests, ${sampleTests.reduce((n, x) => n + x.questions.length, 0)} questions).`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
