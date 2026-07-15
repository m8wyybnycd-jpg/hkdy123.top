/**
 * GET  /api/admin/rate-limits — List all rate limit rules
 * POST /api/admin/rate-limits — Create a new rate limit rule
 *
 * Both require `settings:manage` permission.
 */

import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
  conflict,
} from "../../lib/response";
import { logOperation, getClientIP } from "../../lib/logger";

/** Map a rate_limits D1 row to a camelCase DTO. */
function mapRateLimitRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    name: row.name as string,
    endpointPattern: row.endpoint_pattern as string,
    method: (row.method as string) ?? "ALL",
    maxRequests: row.max_requests as number,
    windowSeconds: row.window_seconds as number,
    perUser: (row.per_user as number) === 1,
    enabled: (row.enabled as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * GET /api/admin/rate-limits — 查询所有速率限制规则
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "settings:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const result = await DB.prepare(
      "SELECT * FROM rate_limits ORDER BY id ASC"
    ).all<Record<string, unknown>>();

    const list = (result.results || []).map(mapRateLimitRow);

    return jsonResponse({ list, total: list.length });
  } catch (err) {
    console.error("[rate_limits] 查询失败:", err);
    return serverError("速率限制规则查询失败");
  }
};

/**
 * POST /api/admin/rate-limits — 创建新速率限制规则
 *
 * Body: {
 *   name: string,
 *   endpointPattern: string,
 *   method?: string (default "ALL"),
 *   maxRequests: number,
 *   windowSeconds: number,
 *   perUser?: boolean (default true),
 *   enabled?: boolean (default true)
 * }
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "settings:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  let body: {
    name?: string;
    endpointPattern?: string;
    method?: string;
    maxRequests?: number;
    windowSeconds?: number;
    perUser?: boolean;
    enabled?: boolean;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // Validate required fields
  const name = (body.name || "").trim();
  if (!name) return badRequest("规则名称不能为空");

  const endpointPattern = (body.endpointPattern || "").trim();
  if (!endpointPattern) return badRequest("端点匹配模式不能为空");

  if (typeof body.maxRequests !== "number" || body.maxRequests <= 0) {
    return badRequest("maxRequests 必须为正整数");
  }

  if (typeof body.windowSeconds !== "number" || body.windowSeconds <= 0) {
    return badRequest("windowSeconds 必须为正整数");
  }

  const method = (body.method || "ALL").trim().toUpperCase();
  const validMethods = ["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"];
  if (!validMethods.includes(method)) {
    return badRequest(`无效的 HTTP 方法: ${method}`);
  }

  const perUser = body.perUser !== false ? 1 : 0;
  const enabled = body.enabled !== false ? 1 : 0;

  // Check name uniqueness
  try {
    const existing = await DB.prepare(
      "SELECT id FROM rate_limits WHERE name = ?"
    )
      .bind(name)
      .first();
    if (existing) return conflict("规则名称已存在");
  } catch {
    return serverError("数据库查询失败");
  }

  const now = new Date().toISOString();

  try {
    const result = await DB.prepare(
      `INSERT INTO rate_limits (name, endpoint_pattern, method, max_requests, window_seconds, per_user, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(name, endpointPattern, method, body.maxRequests, body.windowSeconds, perUser, enabled, now, now)
      .run();

    const newId = result.meta?.last_row_id;

    // Audit log
    const operatorId = context.data.user?.userId ?? null;
    const operatorName = context.data.user?.username || context.data.user?.email || null;

    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: "create",
      module: "rate_limit",
      target: String(newId),
      ip: getClientIP(context.request),
      detail: { name, endpointPattern, method, maxRequests: body.maxRequests, windowSeconds: body.windowSeconds },
    });

    const row = await DB.prepare("SELECT * FROM rate_limits WHERE id = ?")
      .bind(newId)
      .first<Record<string, unknown>>();

    return jsonResponse(mapRateLimitRow(row as Record<string, unknown>), "规则创建成功", 0, 201);
  } catch (err) {
    console.error("[rate_limits] 创建失败:", err);
    return serverError("规则创建失败");
  }
};
