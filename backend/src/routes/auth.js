import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { signToken } from "../utils/jwt.js";
import { authRateLimiter } from "../middleware/authRateLimiter.js";
import { authMiddleware } from "../middleware/auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/register", authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       RETURNING id, role, tenant_id`,
      [email.toLowerCase(), hash]
    );
    const { id: userId, role, tenant_id: tenantId } = result.rows[0];
    const token = signToken(userId, role, tenantId);
    res.status(201).json({
      token,
      user: {
        id: userId,
        email: email.toLowerCase(),
        role,
        tenantId: tenantId ?? null,
        tenantName: null,
      },
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await pool.query(
      `SELECT u.id, u.password_hash, u.role, u.tenant_id, t.name AS tenant_name
       FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signToken(user.id, user.role, user.tenant_id);
    res.json({
      token,
      user: {
        id: user.id,
        email: email.toLowerCase(),
        role: user.role,
        tenantId: user.tenant_id ?? null,
        tenantName: user.tenant_name ?? null,
      },
    });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.role, u.tenant_id, t.name AS tenant_name
       FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const row = rows[0];
    res.json({
      user: {
        id: row.id,
        email: row.email,
        role: row.role,
        tenantId: row.tenant_id ?? null,
        tenantName: row.tenant_name ?? null,
      },
    });
  } catch (e) {
    next(e);
  }
});
