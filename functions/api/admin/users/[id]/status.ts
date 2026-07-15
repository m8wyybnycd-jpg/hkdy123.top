/**
 * GET /api/admin/users/:id/status
 *
 * Returns the user's status change history (user_status_logs),
 * with pagination support.
 *
 * Requires `user:view` permission.
 *
 * Query params:
 * - page: 页码 (default 1)
 * - pageSize: 每页条数 (default 20, max 100)
 * - action: 操作类型筛选 ('ban', 'unban', 'level_change', 'role_change')
 */

import { requirePermission } from "../../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../../lib/response";

/** Valid action types for filtering. */
const VALID_ACTIONS = ["ban", "unban", "level_change", "role_change"];

export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "user:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const targetId = parseInt(context.params.id as string, 10);
  if (isNaN(targetId)) return badRequest("无效的用户 ID");

  // Verify user exists
  try {
    const userExists = await DB.prepare("SELECT id FROM users WHERE id = ?")
      .bind(targetId)
      .first();
    if (!userExists) return notFound("用户不存在");
  } catch {
    return serverError("数据库查询失败");
  }

  // Parse query parameters
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10) || 20)
  );
  const offset = (page - 1) * pageSize;
  const actionFilter = url.searchParams.get("action")?.trim();

  // Build WHERE clause
  const conditions: string[] = ["user_id = ?"];
  const params: unknown[] = [targetId];

  if (actionFilter && VALID_ACTIONS.includes(actionFilter)) {
    conditions.push("action = ?");
    params.push(actionFilter);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  try {
    // Total count
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as total FROM user_status_logs ${whereClause}`
    )
      .bind(...params)
      .first<{ total: number }>();
    const total = countRow?.total ?? 0;

    // Paginated results
    const result = await DB.prepare(
      `SELECT id, user_id, action, old_value, new_value, operator_id, operator_name, reason, created_at
       FROM user_status_logs ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map((row) => ({
      id: row.id as number,
      userId: row.user_id as number,
      action: row.action as string,
      oldValue: (row.old_value as string) ?? null,
      newValue: (row.new_value as string) ?? null,
      operatorId: (row.operator_id as number) ?? null,
      operatorName: (row.operator_name as string) ?? null,
      reason: (row.reason as string) ?? null,
      createdAt: row.created_at as string,
    }));

    return jsonResponse({ list, total, page, pageSize });
  } catch (err) {
    console.error("[user_status] 查询状态历史失败:", err);
    return serverError("状态历史查询失败");
  }
};
