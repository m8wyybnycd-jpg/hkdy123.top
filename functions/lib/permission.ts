/**
 * Backend permission check utilities.
 *
 * Provides functions to query user permissions/roles from D1 in real-time
 * (does NOT trust JWT permissions for authorization decisions).
 *
 * Used by all admin API endpoints via `requirePermission()`.
 */

/**
 * Query all permission codes for a user (real-time D1 query).
 *
 * Joins user_roles → roles → role_permissions → permissions,
 * filtering by enabled roles only (status = 1).
 *
 * @param db     - D1 database binding
 * @param userId - User ID
 * @returns Array of permission code strings (deduplicated)
 */
export async function getUserPermissions(
  db: D1Database,
  userId: number
): Promise<string[]> {
  try {
    const result = await db
      .prepare(
        `SELECT DISTINCT p.code
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         JOIN user_roles ur ON ur.role_id = rp.role_id
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ? AND r.status = 1`
      )
      .bind(userId)
      .all<{ code: string }>();

    return (result.results || []).map((row) => row.code);
  } catch {
    return [];
  }
}

/**
 * Query all role codes for a user (real-time D1 query).
 *
 * Only returns enabled roles (status = 1).
 *
 * @param db     - D1 database binding
 * @param userId - User ID
 * @returns Array of role code strings
 */
export async function getUserRoleCodes(
  db: D1Database,
  userId: number
): Promise<string[]> {
  try {
    const result = await db
      .prepare(
        `SELECT r.code
         FROM roles r
         JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = ? AND r.status = 1`
      )
      .bind(userId)
      .all<{ code: string }>();

    return (result.results || []).map((row) => row.code);
  } catch {
    return [];
  }
}

/**
 * Check if a user has a specific permission (real-time D1 query).
 *
 * @param db     - D1 database binding
 * @param userId - User ID
 * @param code   - Permission code, e.g. "role:manage"
 * @returns true if the user has the permission
 */
export async function hasPermission(
  db: D1Database,
  userId: number,
  code: string
): Promise<boolean> {
  const permissions = await getUserPermissions(db, userId);
  return permissions.includes(code);
}

/**
 * API endpoint authorization guard.
 *
 * Checks authentication first (returns 401 if not logged in),
 * then checks permission via real-time D1 query (returns 403 if denied).
 *
 * Usage pattern in endpoints:
 * ```typescript
 * const denied = await requirePermission(context, 'role:manage');
 * if (denied) return denied;
 * // ... normal business logic
 * ```
 *
 * @param context - Pages Functions context (contains data.user and env.DB)
 * @param code    - Required permission code
 * @returns null if authorized, or a 401/403 Response if denied
 */
export async function requirePermission(
  context: PageContext,
  code: string
): Promise<Response | null> {
  const user = context.data.user;

  // Not authenticated
  if (!user) {
    return new Response(
      JSON.stringify({ code: 401, data: null, message: "未授权，请登录" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const db = context.env.DB;
  if (!db) {
    return new Response(
      JSON.stringify({ code: 500, data: null, message: "数据库不可用" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const permissions = await getUserPermissions(db, user.userId);
  if (!permissions.includes(code)) {
    return new Response(
      JSON.stringify({ code: 403, data: null, message: "无权访问该功能" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}
