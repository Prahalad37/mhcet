/**
 * Deletes ALL users (CASCADE clears attempts, practice, audit, etc.), then creates exactly
 * ONE admin with plan=paid — full app access (admin routes + paid limits).
 *
 * Local:
 *   cd backend && npm run reset-admin-users
 *
 * Production (Railway / any host): set DATABASE_URL to prod, then same command.
 * Override defaults without editing this file:
 *   SINGLE_ADMIN_EMAIL=you@example.com SINGLE_ADMIN_PASSWORD='YourLongPass!' npm run reset-admin-users
 *
 * Change the password after first login in production.
 */
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { pool } from "../src/db/pool.js";

dotenv.config();

const email = (process.env.SINGLE_ADMIN_EMAIL || "superadmin@mhcet.local").toLowerCase().trim();
const password = process.env.SINGLE_ADMIN_PASSWORD || "MhcetSuperAdmin!2026";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const del = await client.query("DELETE FROM users RETURNING id");
    console.log(`Removed ${del.rowCount} existing user(s).`);

    const hash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO users (email, password_hash, role, plan)
       VALUES ($1, $2, 'admin', 'paid')`,
      [email, hash]
    );
    console.log(`Created single admin: ${email} (role=admin, plan=paid)`);

    await client.query("COMMIT");
    console.log("\nOnly this account exists now. Log in and rotate the password in production.\n");
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
