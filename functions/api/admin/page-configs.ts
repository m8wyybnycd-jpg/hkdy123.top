import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  conflict,
  serverError,
} from "../../lib/response";
import { logOperation, getClientIP } from "../../lib/logger";

/**
 * 将 D1 行（snake_case）映射为 PageConfig 对象（camelCase）。
 * is_enabled 在数据库中为 INTEGER (0/1)，映射为 boolean。
 */
function mapPageConfigRow(row: Record<string, unknown>) {
  return {
    page_key: row.page_key as string,
    page_name: row.page_name as string,
    title: (row.title as string) ?? "",
    subtitle: (row.subtitle as string) ?? "",
    description: (row.description as string) ?? "",
    is_enabled: row.is_enabled === 1,
    params: (row.params as string) ?? "{}",
    sort_order: row.sort_order as number,
    updated_at: row.updated_at as string,
    updated_by: (row.updated_by as number | null) ?? null,
  };
}

/**
 * GET /api/admin/page-configs — 后台页面配置列表（含禁用项）。
 * 需要 page:manage 权限。
 *
 * 返回所有页面配置（包括 is_enabled = 0 的），按 sort_order ASC 排序。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "page:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const result = await DB.prepare(
      `SELECT page_key, page_name, title, subtitle, description,
              is_enabled, params, sort_order, updated_at, updated_by
       FROM page_configs
       ORDER BY sort_order ASC`
    ).all<Record<string, unknown>>();

    const list = (result.results || []).map(mapPageConfigRow);

    return jsonResponse(list);
  } catch {
    return serverError("数据库查询失败");
  }
};

/**
 * POST /api/admin/page-configs — 创建页面配置。
 * 需要 page:manage 权限。
 *
 * 请求体（CreatePageConfigPayload）：
 * - page_key:    唯一标识（必填）
 * - page_name:   页面名称（必填）
 * - title:       主标题
 * - subtitle:    副标题
 * - description: 描述
 * - is_enabled:  是否启用
 * - params:      JSON 字符串
 * - sort_order:  排序权重
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "page:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  let body: {
    page_key?: string;
    page_name?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    is_enabled?: boolean;
    params?: string;
    sort_order?: number;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const pageKey = body.page_key?.trim() ?? "";
  const pageName = body.page_name?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const subtitle = body.subtitle?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const isEnabled = body.is_enabled === true ? 1 : 0;
  const params = body.params ?? "{}";
  const sortOrder = body.sort_order ?? 0;

  // 校验必填字段
  if (!pageKey) {
    return badRequest("页面标识（page_key）不能为空");
  }
  if (!pageName) {
    return badRequest("页面名称（page_name）不能为空");
  }

  const userId = context.data.user?.userId ?? null;

  try {
    // 检查 page_key 是否已存在
    const existing = await DB.prepare(
      "SELECT page_key FROM page_configs WHERE page_key = ?"
    )
      .bind(pageKey)
      .first<{ page_key: string }>();

    if (existing) {
      return conflict("页面标识已存在");
    }

    await DB.prepare(
      `INSERT INTO page_configs (page_key, page_name, title, subtitle, description, is_enabled, params, sort_order, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(pageKey, pageName, title, subtitle, description, isEnabled, params, sortOrder, userId)
      .run();

    const row = await DB.prepare(
      "SELECT page_key, page_name, title, subtitle, description, is_enabled, params, sort_order, updated_at, updated_by FROM page_configs WHERE page_key = ?"
    )
      .bind(pageKey)
      .first<Record<string, unknown>>();

    if (!row) {
      return serverError("创建成功但查询失败");
    }

    // 记录操作日志
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "create",
      module: "page_config",
      target: pageKey,
      ip: getClientIP(context.request),
      detail: { page_key: pageKey, page_name: pageName, title, is_enabled: isEnabled },
    });

    return jsonResponse(mapPageConfigRow(row), "创建成功", 0, 201);
  } catch {
    return serverError("创建页面配置失败");
  }
};
