import jwt from "jsonwebtoken";

export function signToken(userId, role = 'user') {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ sub: userId, role }, secret, { expiresIn });
}
