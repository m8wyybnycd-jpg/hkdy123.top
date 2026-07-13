import {
  jsonResponse,
  badRequest,
  serverError,
  forbidden,
} from "../lib/response";
import { requirePermission } from "../lib/permission";
import { logOperation, getClientIP } from "../lib/logger";
import { validateUrl } from "../lib/validation";

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
 * GET /admin/banners — 后台轮播图列表（分页 + 搜索 + 状态过滤）。
 *
 * 需要 banner:read 权限。
 * 支持 ?page=1&pageSize=10&search=xxx&status=active|inactive
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:read");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const url = new URL(context.request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.max(
      1,
      Math.min(100, Number(url.searchParams.get("pageSize") || "10"))
    );
    const search = (url.searchParams.get("search") || "").trim();
    const status = url.searchParams.get("status") || "";

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push("title LIKE ?");
      params.push(`%${search}%`);
    }

    if (status === "active") {
      conditions.push("is_active = 1");
    } else if (status === "inactive") {
      conditions.push("is_active = 0");
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count total
    const countResult = await DB.prepare(
      `SELECT COUNT(*) as total FROM banners ${whereClause}`
    )
      .bind(...params)
      .first<{ total: number }>();

    const total = countResult?.total ?? 0;
    const offset = (page - 1) * pageSize;

    // Fetch items
    const result = await DB.prepare(
      `SELECT id, title, image_url, link_url, sort_order, is_active,
              start_time, end_time, description, created_at, updated_at
       FROM banners ${whereClause}
       ORDER BY sort_order ASC, id ASC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<Record<string, unknown>>();

    const items = (result.results || []).map(mapBannerRow);

    return jsonResponse({
      items,
      total,
      page,
      pageSize,
    });
  } catch {
    return serverError("数据库查询失败");
  }
};

/**
 * POST /admin/banners — 创建轮播图。
 *
 * 需要 banner:write 权限。
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const body = await context.request.json<Record<string, unknown>>();

    const title = (body.title as string) || "";
    const imageUrl = body.imageUrl as string;

    if (!imageUrl) {
      return badRequest("imageUrl 为必填项");
    }
    const imageUrlErr = validateUrl(imageUrl, "imageUrl");
    if (imageUrlErr) return badRequest(imageUrlErr);

    const linkUrl = (body.linkUrl as string) ?? "";
    const linkUrlErr = validateUrl(linkUrl, "linkUrl");
    if (linkUrlErr) return badRequest(linkUrlErr);
    const sortOrder = (body.sortOrder as number) ?? 0;
    const isActive = (body.isActive as number) ?? 1;
    const startTime = body.startTime as string | null ?? null;
    const endTime = body.endTime as string | null ?? null;
    const description = (body.description as string) ?? "";

    const result = await DB.prepare(
      `INSERT INTO banners (title, image_url, link_url, sort_order, is_active,
                            start_time, end_time, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, title, image_url, link_url, sort_order, is_active,
                 start_time, end_time, description, created_at, updated_at`
    )
      .bind(
        title,
        imageUrl,
        linkUrl,
        sortOrder,
        isActive,
        startTime,
        endTime,
        description
      )
      .first<Record<string, unknown>>();

    if (!result) {
      return serverError("创建轮播图失败");
    }

    // Log the operation
    const user = context.data.user!;
    await logOperation(DB, {
      userId: user.userId,
      username: user.username,
      action: "create",
      module: "banner",
      target: String(result.id),
      ip: getClientIP(context.request),
      detail: body,
    });

    return jsonResponse(mapBannerRow(result));
  } catch {
    return serverError("创建轮播图失败");
  }
};

/**
 * Handle unsupported methods on /admin/banners.
 */
export const onRequest = async (context: PageContext): Promise<Response> => {
  const method = context.request.method;
  if (method === "GET" || method === "POST") {
    // Let the specific handlers deal with it
    return context.next();
  }
  return forbidden(`不支持的请求方法: ${method}`);
};
