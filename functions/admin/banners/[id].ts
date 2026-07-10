import {
  jsonResponse,
  notFound,
  badRequest,
  serverError,
  forbidden,
} from "../../lib/response";
import { requirePermission } from "../../lib/permission";
import { logOperation, getClientIP } from "../../lib/logger";

/**
 * 将 D1 行（snake_case）映射为 Banner 对象（camelCase）。
 */
function mapBannerRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    title: row.title as string,
    imageUrl: row.image_url as string,
    linkUrl: (row.link_url as string) ?? "",
    sortOrder: row.sort_order as number,
    isActive: row.is_active as number,
    startTime: (row.start_time as string) ?? null,
    endTime: (row.end_time as string) ?? null,
    description: (row.description as string) ?? "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * GET /admin/banners/:id — 获取单条轮播图。
 *
 * 需要 banner:read 权限。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:read");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = Number(context.params.id);
  if (!id) return badRequest("无效的 ID");

  try {
    const row = await DB.prepare(
      `SELECT id, title, image_url, link_url, sort_order, is_active,
              start_time, end_time, description, created_at, updated_at
       FROM banners WHERE id = ?`
    )
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) return notFound("轮播图不存在");

    return jsonResponse(mapBannerRow(row));
  } catch {
    return serverError("数据库查询失败");
  }
};

/**
 * PUT /admin/banners/:id — 更新轮播图。
 *
 * 需要 banner:write 权限。
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = Number(context.params.id);
  if (!id) return badRequest("无效的 ID");

  try {
    const body = await context.request.json<Record<string, unknown>>();

    // Build dynamic UPDATE
    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.title !== undefined) {
      fields.push("title = ?");
      values.push(body.title as string);
    }
    if (body.imageUrl !== undefined) {
      fields.push("image_url = ?");
      values.push(body.imageUrl as string);
    }
    if (body.linkUrl !== undefined) {
      fields.push("link_url = ?");
      values.push(body.linkUrl as string);
    }
    if (body.sortOrder !== undefined) {
      fields.push("sort_order = ?");
      values.push(body.sortOrder as number);
    }
    if (body.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(body.isActive as number);
    }
    if (body.startTime !== undefined) {
      fields.push("start_time = ?");
      values.push(body.startTime as string | null);
    }
    if (body.endTime !== undefined) {
      fields.push("end_time = ?");
      values.push(body.endTime as string | null);
    }
    if (body.description !== undefined) {
      fields.push("description = ?");
      values.push(body.description as string);
    }

    if (fields.length === 0) {
      return badRequest("没有需要更新的字段");
    }

    // Always update updated_at
    fields.push("updated_at = datetime('now')");

    const sql = `UPDATE banners SET ${fields.join(", ")} WHERE id = ? RETURNING
      id, title, image_url, link_url, sort_order, is_active,
      start_time, end_time, description, created_at, updated_at`;

    const row = await DB.prepare(sql)
      .bind(...values, id)
      .first<Record<string, unknown>>();

    if (!row) return notFound("轮播图不存在");

    // Log the operation
    const user = context.data.user;
    await logOperation(DB, {
      userId: user.userId,
      username: user.username,
      action: "update",
      module: "banner",
      target: String(id),
      ip: getClientIP(context.request),
      detail: body,
    });

    return jsonResponse(mapBannerRow(row));
  } catch {
    return serverError("更新轮播图失败");
  }
};

/**
 * DELETE /admin/banners/:id — 删除轮播图。
 *
 * 需要 banner:write 权限。
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = Number(context.params.id);
  if (!id) return badRequest("无效的 ID");

  try {
    // Check existence first
    const existing = await DB.prepare(
      "SELECT id FROM banners WHERE id = ?"
    )
      .bind(id)
      .first();

    if (!existing) return notFound("轮播图不存在");

    await DB.prepare("DELETE FROM banners WHERE id = ?").bind(id).run();

    // Log the operation
    const user = context.data.user;
    await logOperation(DB, {
      userId: user.userId,
      username: user.username,
      action: "delete",
      module: "banner",
      target: String(id),
      ip: getClientIP(context.request),
    });

    return jsonResponse(null, "删除成功");
  } catch {
    return serverError("删除轮播图失败");
  }
};

/**
 * Handle unsupported methods.
 */
export const onRequest = async (context: PageContext): Promise<Response> => {
  const method = context.request.method;
  if (
    method === "GET" ||
    method === "PUT" ||
    method === "DELETE"
  ) {
    return context.next();
  }
  return forbidden(`不支持的请求方法: ${method}`);
};
