import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { signToken } from "../utils/jwt.js";
import { authRateLimiter } from "../middleware/authRateLimiter.js";

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
       RETURNING id, role`,
      [email.toLowerCase(), hash]
    );
    const { id: userId, role } = result.rows[0];
    const token = signToken(userId, role);
    res.status(201).json({ token, user: { id: userId, email: email.toLowerCase(), role } });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await pool.query(
      `SELECT id, password_hash, role FROM users WHERE email = $1`,
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
    const token = signToken(user.id, user.role);
    res.json({ token, user: { id: user.id, email: email.toLowerCase(), role: user.role } });
  } catch (e) {
    next(e);
  }
});
