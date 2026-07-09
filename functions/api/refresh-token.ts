import { verifyJWT, signJWT } from "../lib/auth";
import { getUserRoleCodes, getUserPermissions } from "../lib/permission";
import { jsonResponse, unauthorized, serverError } from "../lib/response";

/**
 * Extract auth_token from Cookie header.
 */
function getTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
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

  const secret = context.env.JWT_SECRET;
  if (!secret) {
    return serverError("JWT_SECRET 未配置");
  }

  // Verify the existing token (must still be valid, not expired)
  let payload;
  try {
    payload = await verifyJWT(token, secret);
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
    secret
  );

  // Set the refreshed token as an HttpOnly cookie
  const cookieValue = `auth_token=${newToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;

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
