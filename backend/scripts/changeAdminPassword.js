import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");

dotenv.config({ path: path.join(backendRoot, ".env") });
const railwayEnvPath = path.join(backendRoot, ".env.railway");
if (fs.existsSync(railwayEnvPath)) {
  dotenv.config({ path: railwayEnvPath, override: true });
}

const { pool } = await import("../src/db/pool.js");

const newPassword = process.env.NEW_ADMIN_PASSWORD || "AntigravityAdmin2026!";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Find the admin user
    const res = await client.query("SELECT email FROM users WHERE role = 'admin' LIMIT 1");
    if (res.rows.length === 0) {
      console.log("No admin user found to update. Run resetAdminUsers.js first if needed.");
      await client.query("ROLLBACK");
      return;
    }
    
    const email = res.rows[0].email;
    const hash = await bcrypt.hash(newPassword, 12);
    
    await client.query(
      `UPDATE users SET password_hash = $1 WHERE email = $2`,
      [hash, email]
    );
    
    console.log(`Successfully updated the password for admin user: ${email}`);
    console.log(`New password: ${newPassword}`);

    await client.query("COMMIT");
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
