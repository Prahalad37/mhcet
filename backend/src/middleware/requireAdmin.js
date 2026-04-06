import { authMiddleware } from "./auth.js";
import { pool } from "../db/pool.js";

/**
 * Middleware that requires admin role.
 * Must be used after authMiddleware to ensure req.userRole is set.
 */
export async function requireAdmin(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // Re-check role from DB to enforce revocations immediately.
    const { rows } = await pool.query(
      `SELECT role FROM users WHERE id = $1`,
      [req.userId]
    );
    const role = rows[0]?.role;
    if (role !== "admin") {
      return res.status(403).json({
        error: "Admin access required. Contact an administrator to upgrade your account.",
      });
    }
  } catch (e) {
    return next(e);
  }

  next();
}

/**
 * Combined middleware that checks authentication and admin role.
 * Use this for admin-only routes instead of applying both middlewares separately.
 */
export function adminOnly(req, res, next) {
  authMiddleware(req, res, (err) => {
    if (err) return next(err);
    requireAdmin(req, res, next);
  });
}