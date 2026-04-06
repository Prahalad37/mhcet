import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET missing");
    const payload = jwt.verify(token, secret);
    req.userId = payload.sub;
    req.userRole = payload.role || 'user'; // Default to 'user' for backward compatibility
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
