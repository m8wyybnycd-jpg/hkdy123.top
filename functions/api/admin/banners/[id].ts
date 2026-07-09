import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { logOperation, getClientIP } from "../../../lib/logger";
import { validateUrl } from "../../../lib/validation";

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
 * GET /api/admin/banners/:id — 获取轮播图详情。
 * 需要 banner:read 权限。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:read");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) {
    return badRequest("无效的 ID");
  }

  try {
    const row = await DB.prepare("SELECT * FROM banners WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) {
      return notFound("轮播图不存在");
    }

    return jsonResponse(mapBannerRow(row));
  } catch {
    return serverError("数据库查询失败");
  }
};

/**
 * PUT /api/admin/banners/:id — 编辑轮播图。
 * 需要 banner:write 权限。
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) {
    return badRequest("无效的 ID");
  }

  let body: {
    title?: string;
    imageUrl?: string;
    linkUrl?: string;
    sortOrder?: number;
    isActive?: number;
    startTime?: string | null;
    endTime?: string | null;
    description?: string;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // 校验必填字段
  if (body.title !== undefined && !body.title.trim()) {
    return badRequest("标题不能为空");
  }
  if (body.imageUrl !== undefined && !body.imageUrl.trim()) {
    return badRequest("图片 URL 不能为空");
  }

  // 校验 URL 协议
  if (body.imageUrl !== undefined) {
    const imageUrlError = validateUrl(body.imageUrl.trim(), "imageUrl");
    if (imageUrlError) return badRequest(imageUrlError);
  }
  if (body.linkUrl !== undefined) {
    const linkUrlError = validateUrl(body.linkUrl.trim(), "linkUrl");
    if (linkUrlError) return badRequest(linkUrlError);
  }

  // 构建动态更新语句
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (body.title !== undefined) {
    fields.push("title = ?");
    params.push(body.title.trim());
  }
  if (body.imageUrl !== undefined) {
    fields.push("image_url = ?");
    params.push(body.imageUrl.trim());
  }
  if (body.linkUrl !== undefined) {
    fields.push("link_url = ?");
    params.push(body.linkUrl.trim());
  }
  if (body.sortOrder !== undefined) {
    fields.push("sort_order = ?");
    params.push(body.sortOrder);
  }
  if (body.isActive !== undefined) {
    fields.push("is_active = ?");
    params.push(body.isActive);
  }
  if (body.startTime !== undefined) {
    fields.push("start_time = ?");
    params.push(body.startTime || null);
  }
  if (body.endTime !== undefined) {
    fields.push("end_time = ?");
    params.push(body.endTime || null);
  }
  if (body.description !== undefined) {
    fields.push("description = ?");
    params.push(body.description.trim());
  }

  if (fields.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  fields.push("updated_at = datetime('now')");
  params.push(id);

  const userId = context.data.user?.userId ?? null;

  try {
    const result = await DB.prepare(
      `UPDATE banners SET ${fields.join(", ")} WHERE id = ?`
    )
      .bind(...params)
      .run();

    if (result.meta?.changes === 0) {
      return notFound("轮播图不存在");
    }

    const row = await DB.prepare("SELECT * FROM banners WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) {
      return serverError("更新成功但查询失败");
    }

    // 记录操作日志
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "update",
      module: "banner",
      target: String(id),
      ip: getClientIP(context.request),
      detail: body,
    });

    return jsonResponse(mapBannerRow(row), "更新成功");
  } catch {
    return serverError("更新轮播图失败");
  }
};

/**
 * DELETE /api/admin/banners/:id — 删除轮播图。
 * 需要 banner:write 权限。
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) {
    return badRequest("无效的 ID");
  }

  const userId = context.data.user?.userId ?? null;

  try {
    // 先查询是否存在（用于日志记录标题）
    const existing = await DB.prepare("SELECT title FROM banners WHERE id = ?")
      .bind(id)
      .first<{ title: string }>();

    if (!existing) {
      return notFound("轮播图不存在");
    }

    await DB.prepare("DELETE FROM banners WHERE id = ?").bind(id).run();

    // 记录操作日志
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "delete",
      module: "banner",
      target: String(id),
      ip: getClientIP(context.request),
      detail: { title: existing.title },
    });

    return jsonResponse(null, "删除成功");
  } catch {
    return serverError("删除轮播图失败");
  }
};
