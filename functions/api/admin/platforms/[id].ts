import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { requirePermission } from "../../../lib/permission";
import { parseJsonArray } from "../../../lib/db";
import { validateUrl } from "../../../lib/validation";

/**
 * PUT /api/admin/platforms/:id
 *
 * Updates an existing cloud gaming platform. Requires admin privileges.
 * Supports partial updates — only provided fields are updated.
 *
 * Body (all optional): { name, color, price, freeInfo, freeTrial, url, description, tags, activity, promo, sortOrder }
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "platform:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  const id = context.params.id as string;
  if (!id) {
    return badRequest("无效的平台 ID");
  }

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // Check platform exists
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare("SELECT id FROM platforms WHERE id = ?")
      .bind(id)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!existing) {
    return notFound("平台不存在");
  }

  // 校验 URL 协议
  if (body.url !== undefined) {
    const urlError = validateUrl(String(body.url).trim(), "url");
    if (urlError) return badRequest(urlError);
  }

  // Build dynamic UPDATE clause
  const updates: string[] = [];
  const params: unknown[] = [];

  const fieldMap: Record<string, string> = {
    name: "name",
    color: "color",
    price: "price",
    url: "url",
    description: "description",
    sortOrder: "sort_order",
  };

  for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
    if (body[bodyKey] !== undefined) {
      updates.push(`${dbCol} = ?`);
      params.push(body[bodyKey]);
    }
  }

  // Handle activity / promo → activity (prefer activity over promo)
  const activity = body.activity ?? body.promo;
  if (activity !== undefined) {
    updates.push("activity = ?");
    params.push(activity);
  }

  // Handle freeInfo / freeTrial → free_info
  const freeInfo = body.freeInfo ?? body.freeTrial;
  if (freeInfo !== undefined) {
    updates.push("free_info = ?");
    params.push(freeInfo);
  }

  // Handle tags array → JSON string
  if (body.tags !== undefined) {
    updates.push("tags = ?");
    params.push(
      JSON.stringify(
        Array.isArray(body.tags) ? body.tags : []
      )
    );
  }

  if (updates.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  updates.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  try {
    await DB.prepare(
      `UPDATE platforms SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...params)
      .run();
  } catch (err) {
    console.error("更新平台失败:", err);
    return serverError("更新失败");
  }

  // Return updated platform
  const row = await DB.prepare(
    "SELECT id, name, color, price, free_info, url, description, tags, activity, sort_order, updated_at FROM platforms WHERE id = ?"
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
      color: row.color,
      price: row.price,
      freeInfo: row.free_info,
      url: row.url,
      desc: row.description,
      tags: parseJsonArray(row.tags),
      activity: row.activity,
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
    },
    "更新成功"
  );
};

/**
 * DELETE /api/admin/platforms/:id
 *
 * Deletes a cloud gaming platform. Requires admin privileges.
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "platform:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  const id = context.params.id as string;
  if (!id) {
    return badRequest("无效的平台 ID");
  }

  // Check platform exists
  try {
    const existing = await DB.prepare(
      "SELECT id FROM platforms WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!existing) {
      return notFound("平台不存在");
    }
  } catch {
    return serverError("数据库查询失败");
  }

  try {
    await DB.prepare("DELETE FROM platforms WHERE id = ?").bind(id).run();
  } catch (err) {
    console.error("删除平台失败:", err);
    return serverError("删除失败");
  }

  return jsonResponse(null, "删除成功");
};
