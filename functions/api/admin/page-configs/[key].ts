import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { logOperation, getClientIP } from "../../../lib/logger";

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

/** 查询单条页面配置的 SQL 字段列表。 */
const SELECT_FIELDS =
  "page_key, page_name, title, subtitle, description, is_enabled, params, sort_order, updated_at, updated_by";

/**
 * GET /api/admin/page-configs/:key — 获取单个页面配置详情。
 * 需要 page:manage 权限。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "page:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const pageKey = context.params.key;
  if (!pageKey) {
    return badRequest("无效的页面标识");
  }

  try {
    const row = await DB.prepare(
      `SELECT ${SELECT_FIELDS} FROM page_configs WHERE page_key = ?`
    )
      .bind(pageKey)
      .first<Record<string, unknown>>();

    if (!row) {
      return notFound("页面配置不存在");
    }

    return jsonResponse(mapPageConfigRow(row));
  } catch {
    return serverError("数据库查询失败");
  }
};

/**
 * PUT /api/admin/page-configs/:key — 更新页面配置。
 * 需要 page:manage 权限。
 *
 * 请求体（UpdatePageConfigPayload）：
 * - page_name:   页面名称
 * - title:       主标题
 * - subtitle:    副标题
 * - description: 描述
 * - is_enabled:  是否启用
 * - params:      JSON 字符串
 * - sort_order:  排序权重
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "page:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const pageKey = context.params.key;
  if (!pageKey) {
    return badRequest("无效的页面标识");
  }

  let body: {
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

  // 校验必填字段（如果提供了则不能为空）
  if (body.page_name !== undefined && !body.page_name.trim()) {
    return badRequest("页面名称不能为空");
  }

  // 构建动态更新语句
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (body.page_name !== undefined) {
    fields.push("page_name = ?");
    params.push(body.page_name.trim());
  }
  if (body.title !== undefined) {
    fields.push("title = ?");
    params.push(body.title.trim());
  }
  if (body.subtitle !== undefined) {
    fields.push("subtitle = ?");
    params.push(body.subtitle.trim());
  }
  if (body.description !== undefined) {
    fields.push("description = ?");
    params.push(body.description.trim());
  }
  if (body.is_enabled !== undefined) {
    fields.push("is_enabled = ?");
    params.push(body.is_enabled === true ? 1 : 0);
  }
  if (body.params !== undefined) {
    fields.push("params = ?");
    params.push(body.params);
  }
  if (body.sort_order !== undefined) {
    fields.push("sort_order = ?");
    params.push(body.sort_order);
  }

  if (fields.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  fields.push("updated_at = datetime('now')");
  fields.push("updated_by = ?");

  const userId = context.data.user?.userId ?? null;
  params.push(userId);
  params.push(pageKey);

  try {
    const result = await DB.prepare(
      `UPDATE page_configs SET ${fields.join(", ")} WHERE page_key = ?`
    )
      .bind(...params)
      .run();

    if (result.meta?.changes === 0) {
      return notFound("页面配置不存在");
    }

    const row = await DB.prepare(
      `SELECT ${SELECT_FIELDS} FROM page_configs WHERE page_key = ?`
    )
      .bind(pageKey)
      .first<Record<string, unknown>>();

    if (!row) {
      return serverError("更新成功但查询失败");
    }

    // 记录操作日志
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "update",
      module: "page_config",
      target: pageKey,
      ip: getClientIP(context.request),
      detail: body,
    });

    return jsonResponse(mapPageConfigRow(row), "更新成功");
  } catch {
    return serverError("更新页面配置失败");
  }
};

/**
 * DELETE /api/admin/page-configs/:key — 删除页面配置。
 * 需要 page:manage 权限。
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "page:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const pageKey = context.params.key;
  if (!pageKey) {
    return badRequest("无效的页面标识");
  }

  const userId = context.data.user?.userId ?? null;

  try {
    // 先查询是否存在（用于日志记录）
    const existing = await DB.prepare(
      "SELECT page_name FROM page_configs WHERE page_key = ?"
    )
      .bind(pageKey)
      .first<{ page_name: string }>();

    if (!existing) {
      return notFound("页面配置不存在");
    }

    await DB.prepare("DELETE FROM page_configs WHERE page_key = ?")
      .bind(pageKey)
      .run();

    // 记录操作日志
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "delete",
      module: "page_config",
      target: pageKey,
      ip: getClientIP(context.request),
      detail: { page_key: pageKey, page_name: existing.page_name },
    });

    return jsonResponse(null, "删除成功");
  } catch {
    return serverError("删除页面配置失败");
  }
};
