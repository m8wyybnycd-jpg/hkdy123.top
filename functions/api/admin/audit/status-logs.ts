/**
 * GET /api/admin/audit/status-logs
 *
 * Returns global user status change logs (user_status_logs) with
 * pagination and filtering support.
 *
 * Unlike /api/admin/users/:id/status (which is per-user), this
 * endpoint returns ALL status logs across all users.
 *
 * Requires `audit:view` permission.
 *
 * Query params:
 * - page, pageSize: pagination
 * - action: filter by action type ('ban', 'unban', 'level_change', 'role_change')
 * - operator: filter by operator name (fuzzy)
 * - dateFrom, dateTo: date range
 */

import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  serverError,
} from "../../../lib/response";

/** Valid action types for filtering. */
const VALID_ACTIONS = ["ban", "unban", "level_change", "role_change"];

export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "audit:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10) || 20)
  );
  const offset = (page - 1) * pageSize;

  // Build WHERE conditions
  const conditions: string[] = [];
  const params: unknown[] = [];

  const action = url.searchParams.get("action")?.trim();
  if (action && VALID_ACTIONS.includes(action)) {
    conditions.push("s.action = ?");
    params.push(action);
  }

  const operator = url.searchParams.get("operator")?.trim();
  if (operator) {
    conditions.push("s.operator_name LIKE ?");
    params.push(`%${operator}%`);
  }

  const dateFrom = url.searchParams.get("dateFrom")?.trim();
  if (dateFrom) {
    conditions.push("s.created_at >= ?");
    params.push(dateFrom);
  }

  const dateTo = url.searchParams.get("dateTo")?.trim();
  if (dateTo) {
    conditions.push("s.created_at <= ?");
    params.push(dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    // Total count
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as total FROM user_status_logs s ${whereClause}`
    )
      .bind(...params)
      .first<{ total: number }>();
    const total = countRow?.total ?? 0;

    // Paginated results with user email join
    const result = await DB.prepare(
      `SELECT s.id, s.user_id, s.action, s.old_value, s.new_value,
              s.operator_id, s.operator_name, s.reason, s.created_at,
              u.email as user_email
       FROM user_status_logs s
       LEFT JOIN users u ON u.id = s.user_id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map((row) => ({
      id: row.id as number,
      userId: row.user_id as number,
      userEmail: (row.user_email as string) ?? "",
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
    console.error("[audit_status_logs] 查询失败:", err);
    return serverError("状态日志查询失败");
  }
};
