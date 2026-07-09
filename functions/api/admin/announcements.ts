import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";
import { logOperation, getClientIP } from "../../lib/logger";

/** 公告类型白名单。 */
const VALID_TYPES = ["notice", "announcement", "maintenance"];

/** 公告状态白名单：0=草稿, 1=已发布, 2=已归档。 */
const VALID_STATUSES = [0, 1, 2];

/**
 * GET /api/admin/announcements — 公告列表（分页 + 状态筛选）。
 * POST /api/admin/announcements — 创建公告。
 *
 * GET  需要 announcement:view 权限。
 * POST 需要 announcement:manage 权限。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "announcement:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  // 解析查询参数
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(url.searchParams.get("pageSize") || "20", 10))
  );
  const statusParam = url.searchParams.get("status");

  const offset = (page - 1) * pageSize;

  try {
    let total: number;
    let results: Record<string, unknown>[];

    if (statusParam !== null && statusParam !== "") {
      const status = parseInt(statusParam, 10);
      const countRow = await DB.prepare(
        "SELECT COUNT(*) as count FROM announcements WHERE status = ?"
      )
        .bind(status)
        .first<{ count: number }>();
      total = countRow?.count ?? 0;

      const result = await DB.prepare(
        `SELECT * FROM announcements WHERE status = ? ORDER BY sort_order DESC, created_at DESC LIMIT ? OFFSET ?`
      )
        .bind(status, pageSize, offset)
        .all<Record<string, unknown>>();
      results = result.results || [];
    } else {
      const countRow = await DB.prepare(
        "SELECT COUNT(*) as count FROM announcements"
      ).first<{ count: number }>();
      total = countRow?.count ?? 0;

      const result = await DB.prepare(
        `SELECT * FROM announcements ORDER BY sort_order DESC, created_at DESC LIMIT ? OFFSET ?`
      )
        .bind(pageSize, offset)
        .all<Record<string, unknown>>();
      results = result.results || [];
    }

    const list = results.map((row) => ({
      id: row.id as number,
      title: row.title as string,
      content: row.content as string,
      type: row.type as string,
      status: row.status as number,
      sortOrder: row.sort_order as number,
      createdBy: row.created_by as number | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      publishedAt: row.published_at as string | null,
    }));

    return jsonResponse({ list, total, page, pageSize });
  } catch {
    return serverError("数据库查询失败");
  }
};

export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "announcement:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  // 解析请求体
  let body: {
    title?: string;
    content?: string;
    type?: string;
    status?: number;
    sortOrder?: number;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const title = body.title?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  const type = body.type?.trim() ?? "notice";
  const status = body.status ?? 0;
  const sortOrder = body.sortOrder ?? 0;

  // 校验
  if (!title) {
    return badRequest("公告标题不能为空");
  }
  if (!content) {
    return badRequest("公告内容不能为空");
  }
  if (!VALID_TYPES.includes(type)) {
    return badRequest("公告类型无效");
  }
  if (!VALID_STATUSES.includes(status)) {
    return badRequest("公告状态无效");
  }

  const userId = context.data.user?.userId ?? null;
  const publishedAt = status === 1 ? new Date().toISOString() : null;

  try {
    const result = await DB.prepare(
      `INSERT INTO announcements (title, content, type, status, sort_order, created_by, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(title, content, type, status, sortOrder, userId, publishedAt)
      .run();

    const insertId = result.meta?.last_row_id;

    const row = await DB.prepare("SELECT * FROM announcements WHERE id = ?")
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
      module: "announcement",
      target: String(insertId),
      ip: getClientIP(context.request),
      detail: { title, type, status },
    });

    return jsonResponse(
      {
        id: row.id as number,
        title: row.title as string,
        content: row.content as string,
        type: row.type as string,
        status: row.status as number,
        sortOrder: row.sort_order as number,
        createdBy: row.created_by as number | null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        publishedAt: row.published_at as string | null,
      },
      "创建成功",
      0,
      201
    );
  } catch {
    return serverError("创建公告失败");
  }
};
