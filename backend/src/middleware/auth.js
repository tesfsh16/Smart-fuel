import { verifyAccessToken } from "../utils/jwt.js";

// Reads the Bearer token, verifies it, and attaches the user payload to req.user.
// req.user = { userId, roles: [{ name, scopeType, scopeId }] }
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header." });
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      roles: payload.roles || [],
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
