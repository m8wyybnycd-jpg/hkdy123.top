import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { requirePermission } from "../../../lib/permission";
import { parseJsonArray } from "../../../lib/db";

/**
 * PUT /api/admin/games/:id
 *
 * Updates an existing game entry. Requires admin privileges.
 * Supports partial updates — only provided fields are updated.
 *
 * Body (all optional): { name, type, rating, config, specs, platforms, description, reason, tags, emoji, sortOrder }
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "game:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  const id = context.params.id as string;
  if (!id) {
    return badRequest("无效的游戏 ID");
  }

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // Check game exists
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare("SELECT id FROM games WHERE id = ?")
      .bind(id)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!existing) {
    return notFound("游戏不存在");
  }

  // Build dynamic UPDATE clause
  const updates: string[] = [];
  const params: unknown[] = [];

  const fieldMap: Record<string, string> = {
    name: "name",
    type: "type",
    rating: "rating",
    description: "description",
    reason: "reason",
    emoji: "emoji",
    sortOrder: "sort_order",
  };

  for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
    if (body[bodyKey] !== undefined) {
      updates.push(`${dbCol} = ?`);
      params.push(body[bodyKey]);
    }
  }

  // Handle config / specs → config
  const config = body.config ?? body.specs;
  if (config !== undefined) {
    updates.push("config = ?");
    params.push(config);
  }

  // Handle platforms array → JSON string
  if (body.platforms !== undefined) {
    updates.push("platforms = ?");
    params.push(
      JSON.stringify(Array.isArray(body.platforms) ? body.platforms : [])
    );
  }

  // Handle tags array → JSON string
  if (body.tags !== undefined) {
    updates.push("tags = ?");
    params.push(
      JSON.stringify(Array.isArray(body.tags) ? body.tags : [])
    );
  }

  if (updates.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  params.push(id);

  try {
    await DB.prepare(
      `UPDATE games SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...params)
      .run();
  } catch (err) {
    console.error("更新游戏失败:", err);
    return serverError("更新失败");
  }

  // Return updated game
  const row = await DB.prepare(
    "SELECT id, name, type, rating, config, platforms, description, reason, tags, emoji, sort_order FROM games WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!row) {
    return serverError("更新后查询失败");
  }

  return jsonResponse(
    {
      id: row.id,
      name: row.name,
      type: row.type,
      rating: row.rating,
      config: row.config,
      platforms: parseJsonArray(row.platforms),
      desc: row.description,
      reason: row.reason,
      tags: parseJsonArray(row.tags),
      emoji: row.emoji,
      sortOrder: row.sort_order,
    },
    "更新成功"
  );
};

/**
 * DELETE /api/admin/games/:id
 *
 * Deletes a game entry. Requires admin privileges.
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "game:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  const id = context.params.id as string;
  if (!id) {
    return badRequest("无效的游戏 ID");
  }

  // Check game exists
  try {
    const existing = await DB.prepare("SELECT id FROM games WHERE id = ?")
      .bind(id)
      .first();
    if (!existing) {
      return notFound("游戏不存在");
    }
  } catch {
    return serverError("数据库查询失败");
  }

  try {
    await DB.prepare("DELETE FROM games WHERE id = ?").bind(id).run();
  } catch (err) {
    console.error("删除游戏失败:", err);
    return serverError("删除失败");
  }

  return jsonResponse(null, "删除成功");
};
