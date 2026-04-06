/**
 * Dev / local: delete ALL users (CASCADE clears attempts, practice, audit, etc.),
 * then insert two admins with plan=paid.
 *
 *   cd backend && npm run reset-admin-users
 *
 * Change passwords after first login in production.
 */
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { pool } from "../src/db/pool.js";

dotenv.config();

const ADMINS = [
  {
    email: "superadmin@mhcet.local",
    password: "MhcetSuperAdmin!2026",
    note: "Super admin (admin + paid)",
  },
  {
    email: "premiumadmin@mhcet.local",
    password: "MhcetPremiumAdmin!2026",
    note: "Premium super admin (admin + paid)",
  },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const del = await client.query("DELETE FROM users RETURNING id");
    console.log(`Removed ${del.rowCount} existing user(s).`);

    for (const u of ADMINS) {
      const hash = await bcrypt.hash(u.password, 12);
      await client.query(
        `INSERT INTO users (email, password_hash, role, plan)
         VALUES ($1, $2, 'admin', 'paid')`,
        [u.email.toLowerCase(), hash]
      );
      console.log(`Created: ${u.email} — ${u.note}`);
    }

    await client.query("COMMIT");
    console.log("\nLogin with either account (both are admin + premium/paid).");
    console.log("Passwords printed above — rotate in production.\n");
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
