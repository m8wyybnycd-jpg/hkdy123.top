import { requirePermission } from "../../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  forbidden,
  notFound,
  serverError,
} from "../../../../lib/response";

/**
 * GET /api/admin/roles/:id/permissions — Get role's assigned permission IDs.
 * PUT /api/admin/roles/:id/permissions — Full overwrite of role permissions.
 *
 * Both require `role:manage` permission.
 * super_admin role permissions cannot be modified (PUT returns 403).
 */

export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "role:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const roleId = Number(context.params.id);
  if (!roleId || isNaN(roleId)) {
    return badRequest("无效的角色ID");
  }

  try {
    // Fetch all permissions ordered by sort_order
    const allPermsResult = await DB.prepare(
      "SELECT id, code, name, module, action, sort_order FROM permissions ORDER BY sort_order ASC"
    ).all<Record<string, unknown>>();

    const allPermissions = (allPermsResult.results || []).map((row) => ({
      id: row.id as number,
      code: row.code as string,
      name: row.name as string,
      module: row.module as string,
      action: row.action as string,
      sortOrder: row.sort_order as number,
    }));

    // Fetch this role's assigned permission IDs
    const assignedResult = await DB.prepare(
      "SELECT permission_id FROM role_permissions WHERE role_id = ?"
    )
      .bind(roleId)
      .all<{ permission_id: number }>();

    const permissionIds = (assignedResult.results || []).map(
      (row) => row.permission_id
    );

    return jsonResponse({
      permissionIds,
      allPermissions,
    });
  } catch {
    return serverError("数据库查询失败");
  }
};

export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "role:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const roleId = Number(context.params.id);
  if (!roleId || isNaN(roleId)) {
    return badRequest("无效的角色ID");
  }

  // Parse request body
  let body: { permissionIds?: number[] };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const permissionIds = body.permissionIds;
  if (!Array.isArray(permissionIds)) {
    return badRequest("permissionIds 必须为数组");
  }

  // Verify role exists and is not super_admin
  try {
    const roleRow = await DB.prepare(
      "SELECT code FROM roles WHERE id = ?"
    )
      .bind(roleId)
      .first<{ code: string }>();

    if (!roleRow) {
      return notFound("角色不存在");
    }

    if (roleRow.code === "super_admin") {
      return forbidden("超级管理员权限不可修改");
    }
  } catch {
    return serverError("数据库查询失败");
  }

  // Full overwrite: DELETE existing + INSERT new (batch for atomicity)
  try {
    const statements: D1PreparedStatement[] = [
      DB.prepare("DELETE FROM role_permissions WHERE role_id = ?").bind(roleId),
    ];

    for (const permId of permissionIds) {
      if (typeof permId === "number" && !isNaN(permId)) {
        statements.push(
          DB.prepare(
            "INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)"
          )
            .bind(roleId, permId)
        );
      }
    }

    await DB.batch(statements);
  } catch {
    return serverError("更新权限失败");
  }

  return jsonResponse(null, "权限已更新");
};
