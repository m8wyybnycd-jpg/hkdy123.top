import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";
import { logOperation, getClientIP } from "../../lib/logger";
import { validateUrl } from "../../lib/validation";

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
 * GET /api/admin/banners — 后台轮播图列表（分页 + 搜索 + 状态筛选）。
 * 需要 banner:read 权限。
 *
 * 查询参数：
 * - page: 页码（默认 1）
 * - pageSize: 每页条数（默认 10，最大 100）
 * - search: 模糊匹配 title
 * - status: active=启用, inactive=禁用, 不传则不过滤
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:read");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(url.searchParams.get("pageSize") || "10", 10))
  );
  const search = (url.searchParams.get("search") || "").trim();
  const status = url.searchParams.get("status");

  const offset = (page - 1) * pageSize;

  try {
    // 构建查询条件和参数
    const conditions: string[] = [];
    const params: (string | number)[] = [];

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

    // 查询总数
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as count FROM banners ${whereClause}`
    )
      .bind(...params)
      .first<{ count: number }>();
    const total = countRow?.count ?? 0;

    // 查询列表
    const result = await DB.prepare(
      `SELECT id, title, image_url, link_url, sort_order, is_active,
              start_time, end_time, description, created_at, updated_at
       FROM banners ${whereClause}
       ORDER BY sort_order ASC, id DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map(mapBannerRow);

    return jsonResponse({ list, total, page, pageSize });
  } catch {
    return serverError("数据库查询失败");
  }
};

/**
 * POST /api/admin/banners — 创建轮播图。
 * 需要 banner:write 权限。
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

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

  const title = body.title?.trim() ?? "";
  const imageUrl = body.imageUrl?.trim() ?? "";
  const linkUrl = body.linkUrl?.trim() ?? "";
  const sortOrder = body.sortOrder ?? 0;
  const isActive = body.isActive ?? 1;
  const startTime = body.startTime || null;
  const endTime = body.endTime || null;
  const description = body.description?.trim() ?? "";

  // 校验
  if (!title) {
    return badRequest("标题不能为空");
  }
  if (!imageUrl) {
    return badRequest("图片 URL 不能为空");
  }
  const imageUrlError = validateUrl(imageUrl, "imageUrl");
  if (imageUrlError) return badRequest(imageUrlError);
  const linkUrlError = validateUrl(linkUrl, "linkUrl");
  if (linkUrlError) return badRequest(linkUrlError);
  if (isActive !== 0 && isActive !== 1) {
    return badRequest("状态值无效");
  }

  const userId = context.data.user?.userId ?? null;

  try {
    const result = await DB.prepare(
      `INSERT INTO banners (title, image_url, link_url, sort_order, is_active, start_time, end_time, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(title, imageUrl, linkUrl, sortOrder, isActive, startTime, endTime, description)
      .run();

    const insertId = result.meta?.last_row_id;

    const row = await DB.prepare("SELECT * FROM banners WHERE id = ?")
      .bind(insertId)
      .first<Record<string, unknown>>();

    if (!row) {
      return serverError("创建成功但查询失败");
    }

    // 记录操作日志
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "create",
      module: "banner",
      target: String(insertId),
      ip: getClientIP(context.request),
      detail: { title, imageUrl, isActive },
    });

    return jsonResponse(mapBannerRow(row), "创建成功", 0, 201);
  } catch {
    return serverError("创建轮播图失败");
  }
};
