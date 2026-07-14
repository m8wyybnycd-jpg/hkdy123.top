import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { requirePermission } from "../../../lib/permission";
import type { AdminUserItem } from "../../../../src/types";

/**
 * PUT /api/admin/users/:id
 *
 * Updates a user account. Currently supports toggling isAdmin and
 * updating username. Requires admin privileges.
 *
 * Body: { isAdmin?: boolean, username?: string }
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "user:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  const id = parseInt(context.params.id as string, 10);
  if (isNaN(id)) {
    return badRequest("无效的用户 ID");
  }

  let body: { isAdmin?: boolean; username?: string };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // Check user exists
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare(
      "SELECT id, email, username, is_admin, level, created_at, updated_at FROM users WHERE id = ?"
    )
      .bind(id)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!existing) {
    return notFound("用户不存在");
  }

  // Build dynamic UPDATE clause
  const updates: string[] = [];
  const params: unknown[] = [];

  if (typeof body.isAdmin === "boolean") {
    updates.push("is_admin = ?");
    params.push(body.isAdmin ? 1 : 0);
  }
  if (body.username !== undefined) {
    const username = body.username.trim();
    if (!username) {
      return badRequest("用户名不能为空");
    }
    updates.push("username = ?");
    params.push(username);
  }

  if (updates.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  updates.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  try {
    await DB.prepare(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...params)
      .run();
  } catch (err) {
    console.error("更新用户失败:", err);
    return serverError("更新失败");
  }

  // Return updated user
  const updated = await DB.prepare(
    "SELECT id, email, username, is_admin, level, created_at, updated_at FROM users WHERE id = ?"
  )
    .bind(id)
    .first();

  const user: AdminUserItem = {
    id: (updated?.id as number) ?? id,
    email: (updated?.email as string) ?? "",
    username: (updated?.username as string) ?? "",
    isAdmin: updated?.is_admin === 1,
    level: (updated?.level as number) ?? 1,
    createdAt: (updated?.created_at as string) ?? "",
    updatedAt: (updated?.updated_at as string) ?? "",
  };

  return jsonResponse(user, "更新成功");
};

/**
 * DELETE /api/admin/users/:id
 *
 * Deletes a user account. Requires admin privileges.
 * Prevents self-deletion to avoid locking out the admin.
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "user:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  const id = parseInt(context.params.id as string, 10);
  if (isNaN(id)) {
    return badRequest("无效的用户 ID");
  }

  // Prevent self-deletion
  if (id === context.data.user?.userId) {
    return badRequest("不能删除当前登录的管理员账号");
  }

  // Check user exists
  try {
    const existing = await DB.prepare("SELECT id FROM users WHERE id = ?")
      .bind(id)
      .first();
    if (!existing) {
      return notFound("用户不存在");
    }
  } catch {
    return serverError("数据库查询失败");
  }

  try {
    await DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  } catch (err) {
    console.error("删除用户失败:", err);
    return serverError("删除失败");
  }

  return jsonResponse(null, "删除成功");
};
