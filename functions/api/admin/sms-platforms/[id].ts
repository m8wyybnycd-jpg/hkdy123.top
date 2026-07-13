import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { requirePermission } from "../../../lib/permission";
import { validateUrl } from "../../../lib/validation";

function toInt(v: unknown, fallback: number): number {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v ? 1 : 0;
  if (typeof v === "string") return v === "true" || v === "1" ? 1 : 0;
  return fallback;
}

/**
 * PUT /api/admin/sms-platforms/:id
 *
 * Updates an existing SMS-receiving platform. Requires `sms_platform:manage`.
 * Supports partial updates.
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "sms_platform:manage");
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
    existing = await DB.prepare("SELECT id FROM sms_platforms WHERE id = ?")
      .bind(id)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }
  if (!existing) return notFound("平台不存在");

  if (body.url !== undefined) {
    const urlError = validateUrl(String(body.url).trim(), "url");
    if (urlError) return badRequest(urlError);
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  const fieldMap: Record<string, string> = {
    name: "name",
    category: "category",
    countries: "countries",
    retention: "retention",
    description: "description",
    sortOrder: "sort_order",
  };
  for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
    if (body[bodyKey] !== undefined) {
      updates.push(`${dbCol} = ?`);
      params.push(body[bodyKey]);
    }
  }
  if (body.url !== undefined) {
    updates.push("url = ?");
    params.push(String(body.url).trim());
  }
  if (body.isFree !== undefined) {
    updates.push("is_free = ?");
    params.push(toInt(body.isFree, 1));
  }
  if (body.needRegister !== undefined) {
    updates.push("need_register = ?");
    params.push(toInt(body.needRegister, 0));
  }
  if (body.supportChinese !== undefined) {
    updates.push("support_chinese = ?");
    params.push(toInt(body.supportChinese, 0));
  }
  if (body.features !== undefined) {
    updates.push("features = ?");
    params.push(
      JSON.stringify(Array.isArray(body.features) ? body.features : [])
    );
  }

  if (updates.length === 0) return badRequest("没有需要更新的字段");

  updates.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  try {
    await DB.prepare(
      `UPDATE sms_platforms SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...params)
      .run();
  } catch (err) {
    console.error("更新接码平台失败:", err);
    return serverError("更新失败");
  }

  const row = await DB.prepare(
    "SELECT id, name, url, category, countries, is_free, need_register, support_chinese, retention, description, features, sort_order, updated_at FROM sms_platforms WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!row) return serverError("更新后查询失败");

  return jsonResponse(
    {
      id: row.id,
      name: row.name,
      url: row.url,
      category: row.category,
      countries: row.countries,
      isFree: row.is_free === 1,
      needRegister: row.need_register === 1,
      supportChinese: row.support_chinese === 1,
      retention: row.retention,
      description: row.description,
      features:
        typeof row.features === "string" ? JSON.parse(row.features) : [],
      sortOrder: row.sort_order,
      updatedAt: row.updated_at,
    },
    "更新成功"
  );
};

/**
 * DELETE /api/admin/sms-platforms/:id
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "sms_platform:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = context.params.id as string;
  if (!id) return badRequest("无效的 ID");

  try {
    const existing = await DB.prepare(
      "SELECT id FROM sms_platforms WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!existing) return notFound("平台不存在");
  } catch {
    return serverError("数据库查询失败");
  }

  try {
    await DB.prepare("DELETE FROM sms_platforms WHERE id = ?").bind(id).run();
  } catch (err) {
    console.error("删除接码平台失败:", err);
    return serverError("删除失败");
  }

  return jsonResponse(null, "删除成功");
};
