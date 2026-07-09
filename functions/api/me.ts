import { jsonResponse, unauthorized } from "../lib/response";
import { getUserRoleCodes, getUserPermissions } from "../lib/permission";

/**
 * GET /api/me
 *
 * Returns the current authenticated user's info (including is_admin,
 * roles, and permissions). Requires a valid JWT.
 */
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const user = context.data.user;
  if (!user) {
    return unauthorized("未授权，请登录");
  }

  const { DB } = context.env;

  // Try to get full user info from D1 (including is_admin, created_at, email)
  if (DB) {
    try {
      const dbUser = await DB.prepare(
        "SELECT id, email, username, is_admin, phone, created_at FROM users WHERE id = ?"
      )
        .bind(user.userId)
        .first();

      if (dbUser) {
        const roles = await getUserRoleCodes(DB, user.userId);
        const permissions = await getUserPermissions(DB, user.userId);
        return jsonResponse({
          id: dbUser.id as number,
          email: dbUser.email as string,
          username: dbUser.username as string,
          isAdmin: roles.includes("super_admin"),
          roles,
          permissions,
          phone: dbUser.phone as string | null,
          createdAt: dbUser.created_at as string,
        });
      }
    } catch {
      // D1 query failed — fall back to JWT payload
    }
  }

  // Fallback: return info from JWT payload (without created_at, phone)
  return jsonResponse({
    id: user.userId,
    email: user.email,
    username: user.username,
    isAdmin: user.isAdmin,
    roles: user.roles || [],
    permissions: user.permissions || [],
    phone: null,
    createdAt: "",
  });
};
