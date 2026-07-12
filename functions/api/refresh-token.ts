import { verifyJWTAny, signJWT, getJWTSecrets } from "../lib/auth";
import { getUserRoleCodes, getUserPermissions } from "../lib/permission";
import { jsonResponse, unauthorized, serverError } from "../lib/response";

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

  // Check if user is still active / admin status
  const userRow = await DB.prepare(
    "SELECT is_admin, username FROM users WHERE id = ?"
  )
    .bind(payload.userId)
    .first<{ is_admin: number; username: string }>();

  if (!userRow) {
    return unauthorized("用户不存在");
  }

  const isAdmin = userRow.is_admin === 1;

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
