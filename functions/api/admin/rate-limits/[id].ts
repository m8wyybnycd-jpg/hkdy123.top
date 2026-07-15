/**
 * PUT    /api/admin/rate-limits/:id — Update a rate limit rule
 * DELETE /api/admin/rate-limits/:id — Delete a rate limit rule
 *
 * Both require `settings:manage` permission.
 */

import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
  notFound,
} from "../../../lib/response";
import { logOperation, getClientIP } from "../../../lib/logger";

/** Map rate_limits D1 row → camelCase DTO. */
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
 * PUT /api/admin/rate-limits/:id — 更新速率限制规则
 *
 * All fields are optional; only supplied fields are updated.
 *
 * Body: {
 *   name?, endpointPattern?, method?, maxRequests?, windowSeconds?,
 *   perUser?, enabled?
 * }
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "settings:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = parseInt(context.params.id as string, 10);
  if (isNaN(id)) return badRequest("无效的规则 ID");

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

  // Verify rule exists
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare("SELECT * FROM rate_limits WHERE id = ?")
      .bind(id)
      .first();
    if (!existing) return notFound("规则不存在");
  } catch {
    return serverError("数据库查询失败");
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  const changes: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return badRequest("规则名称不能为空");

    // Check name uniqueness (excluding self)
    const dupCheck = await DB.prepare(
      "SELECT id FROM rate_limits WHERE name = ? AND id != ?"
    )
      .bind(name, id)
      .first();
    if (dupCheck) {
      return badRequest("规则名称已存在");
    }

    updates.push("name = ?");
    params.push(name);
    changes.name = name;
  }

  if (body.endpointPattern !== undefined) {
    const pattern = body.endpointPattern.trim();
    if (!pattern) return badRequest("端点匹配模式不能为空");
    updates.push("endpoint_pattern = ?");
    params.push(pattern);
    changes.endpointPattern = pattern;
  }

  if (body.method !== undefined) {
    const method = body.method.trim().toUpperCase();
    const validMethods = ["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"];
    if (!validMethods.includes(method)) {
      return badRequest(`无效的 HTTP 方法: ${method}`);
    }
    updates.push("method = ?");
    params.push(method);
    changes.method = method;
  }

  if (body.maxRequests !== undefined) {
    if (typeof body.maxRequests !== "number" || body.maxRequests <= 0) {
      return badRequest("maxRequests 必须为正整数");
    }
    updates.push("max_requests = ?");
    params.push(body.maxRequests);
    changes.maxRequests = body.maxRequests;
  }

  if (body.windowSeconds !== undefined) {
    if (typeof body.windowSeconds !== "number" || body.windowSeconds <= 0) {
      return badRequest("windowSeconds 必须为正整数");
    }
    updates.push("window_seconds = ?");
    params.push(body.windowSeconds);
    changes.windowSeconds = body.windowSeconds;
  }

  if (body.perUser !== undefined) {
    updates.push("per_user = ?");
    params.push(body.perUser ? 1 : 0);
    changes.perUser = body.perUser;
  }

  if (body.enabled !== undefined) {
    updates.push("enabled = ?");
    params.push(body.enabled ? 1 : 0);
    changes.enabled = body.enabled;
  }

  if (updates.length === 0) {
    return badRequest("没有需要更新的字段");
  }

  const now = new Date().toISOString();
  updates.push("updated_at = ?");
  params.push(now);
  params.push(id);

  try {
    await DB.prepare(
      `UPDATE rate_limits SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...params)
      .run();

    // Audit log
    const operatorId = context.data.user?.userId ?? null;
    const operatorName = context.data.user?.username || context.data.user?.email || null;

    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: "update",
      module: "rate_limit",
      target: String(id),
      ip: getClientIP(context.request),
      detail: changes,
    });

    const updated = await DB.prepare("SELECT * FROM rate_limits WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();

    return jsonResponse(mapRateLimitRow(updated as Record<string, unknown>), "规则更新成功");
  } catch (err) {
    console.error("[rate_limits] 更新失败:", err);
    return serverError("规则更新失败");
  }
};

/**
 * DELETE /api/admin/rate-limits/:id — 删除速率限制规则
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "settings:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = parseInt(context.params.id as string, 10);
  if (isNaN(id)) return badRequest("无效的规则 ID");

  // Verify rule exists
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare("SELECT id, name FROM rate_limits WHERE id = ?")
      .bind(id)
      .first();
    if (!existing) return notFound("规则不存在");
  } catch {
    return serverError("数据库查询失败");
  }

  try {
    await DB.prepare("DELETE FROM rate_limits WHERE id = ?")
      .bind(id)
      .run();

    // Audit log
    const operatorId = context.data.user?.userId ?? null;
    const operatorName = context.data.user?.username || context.data.user?.email || null;

    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: "delete",
      module: "rate_limit",
      target: String(id),
      ip: getClientIP(context.request),
      detail: { id, name: existing.name },
    });

    return jsonResponse(null, "规则已删除");
  } catch (err) {
    console.error("[rate_limits] 删除失败:", err);
    return serverError("规则删除失败");
  }
};
