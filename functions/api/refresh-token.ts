import { verifyJWTAny, signJWT, getJWTSecrets } from "../lib/auth";
import { getUserRoleCodes, getUserPermissions } from "../lib/permission";
import { jsonResponse, unauthorized, serverError } from "../lib/response";
import { revokeToken } from "../lib/revocation";

/**
 * Extract auth token from Cookie header.
 * Supports __Host-auth_token (new) and auth_token (legacy) for migration.
 */
function getTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  // Check new __Host- prefixed cookie first
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");
    if (name.trim() === "__Host-auth_token" && valueParts.length > 0) {
      return valueParts.join("=");
    }
  }
  // Fallback to legacy cookie name
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");
    if (name.trim() === "auth_token" && valueParts.length > 0) {
      return valueParts.join("=");
    }
  }
  return null;
}

/**
 * POST /api/refresh-token
 *
 * Reads the JWT from the HttpOnly cookie (or Authorization header fallback),
 * verifies it, and issues a new JWT with a fresh 7-day expiration.
 * The new token is set via Set-Cookie header.
 *
 * Also re-queries roles and permissions from D1 to ensure the token
 * reflects the user's current access level.
 *
 * @returns User info (token is set via cookie, not in response body)
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  // Try cookie first, then Authorization header (backward compat)
  const token = getTokenFromCookie(context.request)
    || (() => {
      const authHeader = context.request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7);
      }
      return null;
    })();

  if (!token) {
    return unauthorized("缺少认证令牌");
  }

  const primarySecret = context.env.JWT_SECRET;
  if (!primarySecret) {
    return serverError("JWT_SECRET 未配置");
  }

  // Verify the existing token (must still be valid, not expired).
  // Accepts tokens signed with the current OR previous key (dual-key transition),
  // so a key rotation never invalidates still-valid sessions.
  const secrets = getJWTSecrets(context.env);
  let payload;
  try {
    payload = await verifyJWTAny(token, secrets);
  } catch {
    return unauthorized("令牌无效或已过期，请重新登录");
  }

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  // Re-query roles and permissions from D1 for fresh data
  const [roles, permissions] = await Promise.all([
    getUserRoleCodes(DB, payload.userId),
    getUserPermissions(DB, payload.userId),
  ]);

  // Check the user still exists
  const userRow = await DB.prepare(
    "SELECT username FROM users WHERE id = ?"
  )
    .bind(payload.userId)
    .first<{ username: string }>();

  if (!userRow) {
    return unauthorized("用户不存在");
  }

  // P2-1: isAdmin single source of truth = super_admin role.
  // Keeps refresh-token consistent with login.ts (which derives isAdmin
  // from roles, not the legacy is_admin column).
  const isAdmin = roles.includes("super_admin");

  // Issue a new JWT with fresh expiration and updated permissions
  const newToken = await signJWT(
    {
      userId: payload.userId,
      email: payload.email,
      username: userRow.username || payload.username,
      isAdmin,
      roles,
      permissions,
    },
    primarySecret
  );

  // P2-4: revoke the previously-valid token's jti so a refresh-rotated
  // token cannot be replayed after rotation. Fail-soft: a KV error here
  // must never block the refresh itself.
  const oldJti = payload.jti;
  const oldExp = (payload as unknown as { exp?: number }).exp;
  if (context.env.TOKEN_BLACKLIST && oldJti) {
    try {
      await revokeToken(context.env.TOKEN_BLACKLIST, oldJti, oldExp ?? 0, payload.userId);
    } catch {
      // best-effort; ignore KV errors
    }
  }

  // Set the refreshed token as an HttpOnly cookie
  // __Host- prefix: forces Secure + Path=/ + no Domain (strongest origin-binding)
  // SameSite=Strict: prevents CSRF
  const cookieValue = `__Host-auth_token=${newToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`;

  const response = jsonResponse({
    user: {
      userId: payload.userId,
      email: payload.email,
      username: userRow.username || payload.username,
      isAdmin,
      roles,
      permissions,
    },
  }, "令牌已刷新");
  response.headers.set("Set-Cookie", cookieValue);
  return response;
};
