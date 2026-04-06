/**
 * Remove all tests (full mocks). CASCADE deletes questions, attempts, answers, etc.
 * Does not re-seed. Run: cd backend && npm run clear-tests
 */
import dotenv from "dotenv";
import { pool } from "../src/db/pool.js";

dotenv.config();

async function main() {
  const r = await pool.query("DELETE FROM tests RETURNING id");
  console.log(`Removed ${r.rowCount} test(s) and related data (CASCADE).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
