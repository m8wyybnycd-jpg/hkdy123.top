import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { requirePermission } from "../../../lib/permission";
import { validateUrl } from "../../../lib/validation";

/**
 * PUT /api/admin/free-games/:id
 *
 * Updates an existing free game resource. Requires `free_game:manage`.
 * Supports partial updates.
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "free_game:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = context.params.id as string;
  if (!id) return badRequest("无效的 ID");

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare("SELECT id FROM free_games WHERE id = ?")
      .bind(id)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }
  if (!existing) return notFound("游戏不存在");

  if (body.quarkLink !== undefined) {
    const urlError = validateUrl(String(body.quarkLink).trim(), "quarkLink");
    if (urlError) return badRequest(urlError);
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  const fieldMap: Record<string, string> = {
    name: "name",
    type: "type",
    platform: "platform",
    description: "description",
    emoji: "emoji",
    sortOrder: "sort_order",
  };
  for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
    if (body[bodyKey] !== undefined) {
      updates.push(`${dbCol} = ?`);
      params.push(body[bodyKey]);
    }
  }
  if (body.quarkLink !== undefined) {
    updates.push("quark_link = ?");
    params.push(String(body.quarkLink).trim());
  }

  if (updates.length === 0) return badRequest("没有需要更新的字段");

  updates.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  try {
    await DB.prepare(
      `UPDATE free_games SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...params)
      .run();
  } catch (err) {
    console.error("更新免费游戏失败:", err);
    return serverError("更新失败");
  }

  const row = await DB.prepare(
    "SELECT id, name, type, platform, description, quark_link, emoji, sort_order, updated_at FROM free_games WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!row) return serverError("更新后查询失败");

  return jsonResponse(
    {
      id: row.id,
      name: row.name,
      type: row.type,
      platform: row.platform,
      description: row.description,
      quarkLink: row.quark_link,
      emoji: row.emoji,
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
    },
    "更新成功"
  );
};

/**
 * DELETE /api/admin/free-games/:id
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "free_game:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = context.params.id as string;
  if (!id) return badRequest("无效的 ID");

  try {
    const existing = await DB.prepare("SELECT id FROM free_games WHERE id = ?")
      .bind(id)
      .first();
    if (!existing) return notFound("游戏不存在");
  } catch {
    return serverError("数据库查询失败");
  }

  try {
    await DB.prepare("DELETE FROM free_games WHERE id = ?").bind(id).run();
  } catch (err) {
    console.error("删除免费游戏失败:", err);
    return serverError("删除失败");
  }

  return jsonResponse(null, "删除成功");
};
