import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  forbidden,
  notFound,
  conflict,
  serverError,
} from "../../../lib/response";

/**
 * PUT /api/admin/roles/:id — Edit a role (code is not editable).
 * DELETE /api/admin/roles/:id — Delete a role (rejects if bound to users).
 *
 * Both require `role:manage` permission.
 */
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
  let body: { name?: string; description?: string; status?: number };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // Fetch existing role
  let roleRow: Record<string, unknown> | null;
  try {
    roleRow = await DB.prepare("SELECT * FROM roles WHERE id = ?")
      .bind(roleId)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!roleRow) {
    return notFound("角色不存在");
  }

  const isSystem = roleRow.is_system === 1;

  // System roles cannot be disabled
  if (isSystem && body.status === 0) {
    return forbidden("系统角色不可禁用");
  }

  // Build update fields dynamically
  const updates: string[] = [];
  const bindings: (string | number)[] = [];

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return badRequest("角色名称不能为空");
    }
    updates.push("name = ?");
    bindings.push(name);
  }

  if (body.description !== undefined) {
    updates.push("description = ?");
    bindings.push(body.description.trim());
  }

  if (body.status !== undefined) {
    if (body.status !== 0 && body.status !== 1) {
      return badRequest("状态值无效");
    }
    updates.push("status = ?");
    bindings.push(body.status);
  }

  updates.push("updated_at = datetime('now')");
  bindings.push(roleId);

  if (updates.length > 1) {
    try {
      await DB.prepare(
        `UPDATE roles SET ${updates.join(", ")} WHERE id = ?`
      )
        .bind(...bindings)
        .run();
    } catch {
      return serverError("更新角色失败");
    }
  }

  // Return updated role
  try {
    const row = await DB.prepare("SELECT * FROM roles WHERE id = ?")
      .bind(roleId)
      .first<Record<string, unknown>>();

    return jsonResponse({
      id: row!.id as number,
      name: row!.name as string,
      code: row!.code as string,
      description: row!.description as string,
      isSystem: row!.is_system === 1,
      status: row!.status as number,
      createdAt: row!.created_at as string,
      updatedAt: row!.updated_at as string,
    });
  } catch {
    return serverError("更新成功但查询失败");
  }
};

export const onRequestDelete = async (
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

  // Fetch existing role
  let roleRow: Record<string, unknown> | null;
  try {
    roleRow = await DB.prepare("SELECT * FROM roles WHERE id = ?")
      .bind(roleId)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!roleRow) {
    return notFound("角色不存在");
  }

  // System roles cannot be deleted
  if (roleRow.is_system === 1) {
    return forbidden("系统角色不可删除");
  }

  // Check if any users are bound to this role
  try {
    const boundCount = await DB.prepare(
      "SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?"
    )
      .bind(roleId)
      .first<{ count: number }>();

    if (boundCount && boundCount.count > 0) {
      return conflict("该角色已绑定用户，无法删除");
    }
  } catch {
    return serverError("数据库查询失败");
  }

  // Delete role (cascade will clean role_permissions)
  try {
    await DB.prepare("DELETE FROM roles WHERE id = ?")
      .bind(roleId)
      .run();
  } catch {
    return serverError("删除角色失败");
  }

  return jsonResponse(null, "删除成功");
};
