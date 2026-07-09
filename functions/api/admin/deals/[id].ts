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
 * PUT /api/admin/deals/:id
 *
 * Updates an existing deal entry. Requires admin privileges.
 * Supports partial updates — only provided fields are updated.
 *
 * Body (all optional): { title, description, link, url, category, tags, expiresAt, expiryDate, sortOrder }
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "deal:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  const id = context.params.id as string;
  if (!id) {
    return badRequest("无效的优惠 ID");
  }

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // Check deal exists
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare("SELECT id FROM deals WHERE id = ?")
      .bind(id)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!existing) {
    return notFound("优惠不存在");
  }

  // 校验 URL 协议
  const linkValue = body.link ?? body.url;
  if (linkValue !== undefined) {
    const linkError = validateUrl(String(linkValue).trim(), "link");
    if (linkError) return badRequest(linkError);
  }

  // Build dynamic UPDATE clause
  const updates: string[] = [];
  const params: unknown[] = [];

  const fieldMap: Record<string, string> = {
    title: "title",
    description: "description",
    category: "category",
    sortOrder: "sort_order",
  };

  for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
    if (body[bodyKey] !== undefined) {
      updates.push(`${dbCol} = ?`);
      params.push(body[bodyKey]);
    }
  }

  // Handle link / url → link
  const link = body.link ?? body.url;
  if (link !== undefined) {
    updates.push("link = ?");
    params.push(link);
  }

  // Handle tags array → JSON string
  if (body.tags !== undefined) {
    updates.push("tags = ?");
    params.push(
      JSON.stringify(Array.isArray(body.tags) ? body.tags : [])
    );
  }

  // Handle expiresAt / expiryDate → expires_at
  const expiresAt = body.expiresAt ?? body.expiryDate;
  if (expiresAt !== undefined) {
    updates.push("expires_at = ?");
    params.push(expiresAt ?? "");
  }

  if (updates.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  updates.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  try {
    await DB.prepare(
      `UPDATE deals SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...params)
      .run();
  } catch (err) {
    console.error("更新优惠失败:", err);
    return serverError("更新失败");
  }

  // Return updated deal
  const row = await DB.prepare(
    "SELECT id, title, description, link, category, tags, updated_at, expires_at, sort_order FROM deals WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!row) {
    return serverError("更新后查询失败");
  }

  return jsonResponse(
    {
      id: row.id,
      title: row.title,
      description: row.description,
      link: row.link,
      category: row.category,
      tags: parseJsonArray(row.tags),
      updatedAt: row.updated_at,
      expiresAt: (row.expires_at as string) || null,
      sortOrder: row.sort_order,
    },
    "更新成功"
  );
};

/**
 * DELETE /api/admin/deals/:id
 *
 * Deletes a deal entry. Requires admin privileges.
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "deal:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  const id = context.params.id as string;
  if (!id) {
    return badRequest("无效的优惠 ID");
  }

  // Check deal exists
  try {
    const existing = await DB.prepare("SELECT id FROM deals WHERE id = ?")
      .bind(id)
      .first();
    if (!existing) {
      return notFound("优惠不存在");
    }
  } catch {
    return serverError("数据库查询失败");
  }

  try {
    await DB.prepare("DELETE FROM deals WHERE id = ?").bind(id).run();
  } catch (err) {
    console.error("删除优惠失败:", err);
    return serverError("删除失败");
  }

  return jsonResponse(null, "删除成功");
};
