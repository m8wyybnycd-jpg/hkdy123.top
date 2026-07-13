import { jsonResponse, badRequest, serverError, notFound } from "../../../lib/response";
import { requirePermission } from "../../../lib/permission";

/**
 * PUT /api/admin/games/[id] — update a game entry.
 * Requires `game:manage` permission.
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const auth = await requirePermission(context, "game:manage");
  if (auth instanceof Response) return auth;

  const id = context.params.id as string;
  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的 JSON 请求体");
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { fields.push("name = ?"); values.push((body.name as string).trim()); }
  if (body.type !== undefined) { fields.push("type = ?"); values.push((body.type as string).trim()); }
  if (body.rating !== undefined) { fields.push("rating = ?"); values.push(parseFloat(body.rating as string) || 0); }
  if (body.config !== undefined) { fields.push("config = ?"); values.push((body.config as string).trim()); }
  if (body.platforms !== undefined) { fields.push("platforms = ?"); values.push(JSON.stringify(body.platforms)); }
  if (body.description !== undefined) { fields.push("description = ?"); values.push((body.description as string).trim()); }
  if (body.reason !== undefined) { fields.push("reason = ?"); values.push((body.reason as string).trim()); }
  if (body.tags !== undefined) { fields.push("tags = ?"); values.push(JSON.stringify(body.tags)); }
  if (body.emoji !== undefined) { fields.push("emoji = ?"); values.push((body.emoji as string).trim()); }
  if (body.cover !== undefined) { fields.push("cover = ?"); values.push((body.cover as string).trim() || null); }
  if (body.sort_order !== undefined) { fields.push("sort_order = ?"); values.push(parseInt(body.sort_order as string) || 0); }
  if (body.is_enabled !== undefined) { fields.push("is_enabled = ?"); values.push(body.is_enabled ? 1 : 0); }

  if (fields.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  try {
    const result = await context.env.DB.prepare(
      `UPDATE games SET ${fields.join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

    if (!result.success) return serverError("更新失败");

    return jsonResponse({ code: 0, message: "更新成功" });
  } catch {
    return serverError("数据库更新失败");
  }
};

/**
 * DELETE /api/admin/games/[id] — delete a game entry.
 * Requires `game:manage` permission.
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const auth = await requirePermission(context, "game:manage");
  if (auth instanceof Response) return auth;

  const id = context.params.id as string;

  try {
    const result = await context.env.DB.prepare(
      "DELETE FROM games WHERE id = ?"
    )
      .bind(id)
      .run();

    if (!result.success) return serverError("删除失败");

    return jsonResponse({ code: 0, message: "删除成功" });
  } catch {
    return serverError("数据库删除失败");
  }
};
