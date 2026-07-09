import { requirePermission } from "../../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../../lib/response";

/**
 * GET /api/admin/users/:id/roles — Get user's assigned roles.
 * PUT /api/admin/users/:id/roles — Full overwrite of user's roles.
 *
 * GET requires `user:view` permission.
 * PUT requires `user:manage` permission.
 * When PUT assigns/unassigns super_admin, syncs users.is_admin for consistency.
 */

export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "user:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const userId = Number(context.params.id);
  if (!userId || isNaN(userId)) {
    return badRequest("无效的用户ID");
  }

  try {
    const result = await DB.prepare(
      `SELECT r.id, r.name, r.code, r.status
       FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?
       ORDER BY r.id ASC`
    )
      .bind(userId)
      .all<Record<string, unknown>>();

    const roles = (result.results || []).map((row) => ({
      id: row.id as number,
      name: row.name as string,
      code: row.code as string,
      status: row.status as number,
    }));

    // Also fetch all enabled roles for the dropdown
    const allRolesResult = await DB.prepare(
      "SELECT id, name, code, status FROM roles WHERE status = 1 ORDER BY id ASC"
    ).all<Record<string, unknown>>();

    const allRoles = (allRolesResult.results || []).map((row) => ({
      id: row.id as number,
      name: row.name as string,
      code: row.code as string,
      status: row.status as number,
    }));

    return jsonResponse({ currentRoleIds: roles.map((r) => r.id), allRoles });
  } catch {
    return serverError("数据库查询失败");
  }
};

export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "user:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const userId = Number(context.params.id);
  if (!userId || isNaN(userId)) {
    return badRequest("无效的用户ID");
  }

  // Parse request body
  let body: { roleIds?: number[] };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const roleIds = body.roleIds;
  if (!Array.isArray(roleIds)) {
    return badRequest("roleIds 必须为数组");
  }

  // Verify user exists
  try {
    const userExists = await DB.prepare("SELECT id FROM users WHERE id = ?")
      .bind(userId)
      .first();
    if (!userExists) {
      return notFound("用户不存在");
    }
  } catch {
    return serverError("数据库查询失败");
  }

  // Full overwrite: DELETE existing + INSERT new (batch for atomicity)
  // Also sync is_admin based on whether super_admin is in the new roles
  try {
    const statements: D1PreparedStatement[] = [
      DB.prepare("DELETE FROM user_roles WHERE user_id = ?").bind(userId),
    ];

    for (const roleId of roleIds) {
      if (typeof roleId === "number" && !isNaN(roleId)) {
        statements.push(
          DB.prepare(
            "INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)"
          )
            .bind(userId, roleId)
        );
      }
    }

    // Check if super_admin role is among the new roles
    if (roleIds.length > 0) {
      const placeholders = roleIds.map(() => "?").join(",");
      const superAdminCheck = await DB.prepare(
        `SELECT id FROM roles WHERE code = 'super_admin' AND id IN (${placeholders})`
      )
        .bind(...roleIds)
        .first();

      const isAdmin = superAdminCheck ? 1 : 0;
      statements.push(
        DB.prepare("UPDATE users SET is_admin = ?, updated_at = datetime('now') WHERE id = ?")
          .bind(isAdmin, userId)
      );
    } else {
      // No roles assigned → is_admin = 0
      statements.push(
        DB.prepare("UPDATE users SET is_admin = 0, updated_at = datetime('now') WHERE id = ?")
          .bind(userId)
      );
    }

    await DB.batch(statements);
  } catch {
    return serverError("更新用户角色失败");
  }

  return jsonResponse(null, "用户角色已更新");
};
