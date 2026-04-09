import jwt from "jsonwebtoken";

/**
 * @param {string} userId
 * @param {string} [role]
 * @param {string | null | undefined} tenantId — from DB only; omit from payload when null (B2C).
 */
export function signToken(userId, role = "user", tenantId = null) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  /** @type {{ sub: string; role: string; tenantId?: string }} */
  const payload = { sub: userId, role };
  if (tenantId != null && tenantId !== "") {
    payload.tenantId = tenantId;
  }
  return jwt.sign(payload, secret, { expiresIn });
}
