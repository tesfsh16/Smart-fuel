import bcrypt from "bcrypt";
import { query } from "../../db/pool.js";
import { ApiError } from "../../middleware/error.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";

// Load a user's roles with their scopes.
async function loadRoles(userId) {
  const { rows } = await query(
    `SELECT r.name AS role_name, ur.scope_type, ur.scope_id
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1`,
    [userId]
  );
  return rows.map((r) => ({
    name: r.role_name,
    scopeType: r.scope_type,
    scopeId: r.scope_id,
  }));
}

// Shape the user object returned to the client (no password hash).
function publicUser(row, roles) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    status: row.status,
    roles,
  };
}

export async function register({ email, fullName, password, role }) {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (email, full_name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, full_name, status`,
    [email, fullName, hash]
  );
  const user = rows[0];

  await query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE name = $2`,
    [user.id, role]
  );

  const roles = await loadRoles(user.id);
  return publicUser(user, roles);
}

export async function login({ email, password }) {
  const { rows } = await query(
    `SELECT id, email, full_name, password_hash, status
       FROM users WHERE email = $1`,
    [email]
  );
  const user = rows[0];
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }
  if (user.status !== "active") {
    throw new ApiError(403, "This account is suspended.");
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const roles = await loadRoles(user.id);
  const tokenPayload = { userId: user.id, roles };

  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  // Persist a hash of the refresh token so it can be revoked.
  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [user.id, refreshHash]
  );

  return {
    user: publicUser(user, roles),
    accessToken,
    refreshToken,
  };
}

export async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  // Find a matching, non-revoked token hash.
  const { rows } = await query(
    `SELECT id, token_hash, revoked_at, expires_at
       FROM refresh_tokens
      WHERE user_id = $1 AND revoked_at IS NULL
      ORDER BY created_at DESC`,
    [payload.userId]
  );

  let matched = null;
  for (const row of rows) {
    const ok = await bcrypt.compare(refreshToken, row.token_hash);
    if (ok) {
      matched = row;
      break;
    }
  }
  if (!matched) {
    throw new ApiError(401, "Refresh token not recognized.");
  }

  const roles = await loadRoles(payload.userId);
  const accessToken = signAccessToken({ userId: payload.userId, roles });
  return { accessToken };
}

export async function logout({ refreshToken }) {
  // Mark all non-revoked tokens for this user as revoked.
  // We revoke by user since we cannot easily match the hash without comparing.
  let payload = null;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    // Even if invalid, swallow — logout should always succeed for the client.
    return;
  }
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [payload.userId]
  );
}

export async function getMe(userId) {
  const { rows } = await query(
    `SELECT id, email, full_name, status FROM users WHERE id = $1`,
    [userId]
  );
  const user = rows[0];
  if (!user) {
    throw new ApiError(404, "User not found.");
  }
  const roles = await loadRoles(userId);
  return publicUser(user, roles);
}
