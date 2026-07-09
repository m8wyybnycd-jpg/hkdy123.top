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
 * PUT /api/admin/desktops/:id
 *
 * Updates an existing cloud desktop entry. Requires admin privileges.
 * Supports partial updates — only provided fields are updated.
 *
 * Body (all optional): { name, url, description, scenarios, scenario, priceRange, activity, sortOrder }
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "desktop:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  const id = context.params.id as string;
  if (!id) {
    return badRequest("无效的云电脑 ID");
  }

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // Check desktop exists
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare(
      "SELECT id FROM cloud_desktops WHERE id = ?"
    )
      .bind(id)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!existing) {
    return notFound("云电脑不存在");
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
    url: "url",
    description: "description",
    priceRange: "price_range",
    activity: "activity",
    sortOrder: "sort_order",
  };

  for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
    if (body[bodyKey] !== undefined) {
      updates.push(`${dbCol} = ?`);
      params.push(body[bodyKey]);
    }
  }

  // Handle scenarios / scenario array → JSON string
  const scenarios = body.scenarios ?? body.scenario;
  if (scenarios !== undefined) {
    updates.push("scenarios = ?");
    params.push(
      JSON.stringify(Array.isArray(scenarios) ? scenarios : [])
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
      `UPDATE cloud_desktops SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...params)
      .run();
  } catch (err) {
    console.error("更新云电脑失败:", err);
    return serverError("更新失败");
  }

  // Return updated desktop
  const row = await DB.prepare(
    "SELECT id, name, url, description, scenarios, price_range, activity, sort_order, updated_at FROM cloud_desktops WHERE id = ?"
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
      url: row.url,
      desc: row.description,
      scenarios: parseJsonArray(row.scenarios),
      priceRange: row.price_range,
      activity: row.activity,
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
    },
    "更新成功"
  );
};

/**
 * DELETE /api/admin/desktops/:id
 *
 * Deletes a cloud desktop entry. Requires admin privileges.
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "desktop:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  const id = context.params.id as string;
  if (!id) {
    return badRequest("无效的云电脑 ID");
  }

  // Check desktop exists
  try {
    const existing = await DB.prepare(
      "SELECT id FROM cloud_desktops WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!existing) {
      return notFound("云电脑不存在");
    }
  } catch {
    return serverError("数据库查询失败");
  }

  try {
    await DB.prepare("DELETE FROM cloud_desktops WHERE id = ?").bind(id).run();
  } catch (err) {
    console.error("删除云电脑失败:", err);
    return serverError("删除失败");
  }

  return jsonResponse(null, "删除成功");
};
