/**
 * One-shot script: Creates MHCET Mock Test 1 and seeds all questions from CSV.
 *
 * Usage (from backend/ directory):
 *   node scripts/seedMockTest.mjs
 *
 * Reads DATABASE_URL from backend/.env.railway (production) or backend/.env (local).
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");

// Load env — .env.railway overrides .env (same as resetAdminUsers)
dotenv.config({ path: path.join(backendRoot, ".env") });
const railwayEnvPath = path.join(backendRoot, ".env.railway");
if (fs.existsSync(railwayEnvPath)) {
  dotenv.config({ path: railwayEnvPath, override: true });
  console.log("📡 Using backend/.env.railway → production DB\n");
} else {
  console.log("💻 Using backend/.env → local DB\n");
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i += 2; }
      else { inQuotes = !inQuotes; i++; }
    } else if (char === "," && !inQuotes) {
      result.push(current); current = ""; i++;
    } else { current += char; i++; }
  }
  result.push(current);
  return result;
}

function parseCSV(csvText) {
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map((h) =>
    h.trim().toLowerCase().replace(/[\s\-_]+/g, "")
  );

  const ALIAS = {
    question: "question", prompt: "question",
    optiona: "optionA", optionb: "optionB", optionc: "optionC", optiond: "optionD",
    correct: "correct", correctoption: "correct", answer: "correct",
    subject: "subject", hint: "hint",
    explanation: "explanation", officialexplanation: "explanation",
  };

  const canonicalHeaders = headers.map((h) => ALIAS[h] || h);

  return lines.slice(1).map((line, idx) => {
    const values = parseCSVLine(line);
    if (values.length !== rawHeaders.length) {
      throw new Error(`Row ${idx + 2}: expected ${rawHeaders.length} columns got ${values.length}`);
    }
    const row = {};
    canonicalHeaders.forEach((key, i) => { row[key] = values[i]; });
    return row;
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.join(__dirname, "mhcet_mock_1.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV not found at ${csvPath}`);
    process.exit(1);
  }

  const rows = parseCSV(fs.readFileSync(csvPath, "utf8"));
  console.log(`📄 Parsed ${rows.length} questions from CSV`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── Check if test already exists ─────────────────────────────────────────
    const existing = await client.query(
      "SELECT id, title FROM tests WHERE title = $1",
      ["MHCET Mock Test 1"]
    );

    let testId;
    if (existing.rows.length > 0) {
      testId = existing.rows[0].id;
      console.log(`ℹ️  Test already exists (id: ${testId}) — appending questions.\n`);
    } else {
      // ── Create fresh test ───────────────────────────────────────────────────
      const testRes = await client.query(
        `INSERT INTO tests (title, description, duration_seconds, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          "MHCET Mock Test 1",
          "Full-length MHCET mock covering Legal Aptitude, GK & Current Affairs, Logical Reasoning, Basic Math, and English. 159 questions · 120 minutes.",
          7200,
          true,
        ]
      );
      testId = testRes.rows[0].id;
      console.log(`✅ Created test: MHCET Mock Test 1 (id: ${testId})\n`);
    }

    // ── Get current max order_index ───────────────────────────────────────────
    const maxOrd = await client.query(
      "SELECT COALESCE(MAX(order_index), 0) AS m FROM questions WHERE test_id = $1",
      [testId]
    );
    let orderIndex = Number(maxOrd.rows[0].m) + 1;

    // ── Batch insert questions ─────────────────────────────────────────────────
    const VALID_SUBJECTS = new Set([
      "Legal Aptitude",
      "GK & Current Affairs",
      "Logical Reasoning",
      "Basic Math",
      "English",
    ]);

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const q = row.question?.trim();
      const a = row.optionA?.trim();
      const b = row.optionB?.trim();
      const c = row.optionC?.trim();
      const d = row.optionD?.trim();
      const correct = row.correct?.trim().toUpperCase();
      const subject = row.subject?.trim();

      if (!q || !a || !b || !c || !d || !correct || !subject) {
        console.warn(`  ⚠️  Skipping incomplete row: "${q?.slice(0, 40)}..."`);
        skipped++;
        continue;
      }
      if (!["A", "B", "C", "D"].includes(correct)) {
        console.warn(`  ⚠️  Skipping row with invalid correct option '${correct}': "${q?.slice(0, 40)}..."`);
        skipped++;
        continue;
      }
      if (!VALID_SUBJECTS.has(subject)) {
        console.warn(`  ⚠️  Skipping row with invalid subject '${subject}': "${q?.slice(0, 40)}..."`);
        skipped++;
        continue;
      }

      await client.query(
        `INSERT INTO questions
           (test_id, prompt, option_a, option_b, option_c, option_d,
            correct_option, subject, hint, official_explanation, order_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          testId, q, a, b, c, d, correct, subject,
          row.hint?.trim() || null,
          row.explanation?.trim() || null,
          orderIndex++,
        ]
      );
      inserted++;
    }

    await client.query("COMMIT");

    console.log("─".repeat(50));
    console.log(`✅ Done!`);
    console.log(`   Test ID  : ${testId}`);
    console.log(`   Inserted : ${inserted} questions`);
    console.log(`   Skipped  : ${skipped} rows`);
    console.log("─".repeat(50));
    console.log(`\n🔗 View at: /admin/tests/${testId}/questions`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error — rolled back:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
