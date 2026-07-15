/**
 * GET /api/admin/audit/credential-logs
 *
 * Returns credential audit logs (credential_audit_logs) with
 * pagination and filtering support.
 *
 * Requires `audit:view` permission.
 *
 * Query params:
 * - page, pageSize: pagination
 * - action: filter by action ('create', 'view', 'update', 'delete', 'test', 'renew')
 * - operator: filter by operator name (fuzzy)
 * - credentialId: filter by credential ID
 * - dateFrom, dateTo: date range
 */

import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  serverError,
} from "../../../lib/response";

/** Valid credential audit action types. */
const VALID_ACTIONS = ["create", "view", "update", "delete", "test", "renew"];

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
    conditions.push("c.action = ?");
    params.push(action);
  }

  const operator = url.searchParams.get("operator")?.trim();
  if (operator) {
    conditions.push("c.operator_name LIKE ?");
    params.push(`%${operator}%`);
  }

  const credentialId = url.searchParams.get("credentialId");
  if (credentialId) {
    const cid = parseInt(credentialId, 10);
    if (!isNaN(cid)) {
      conditions.push("c.credential_id = ?");
      params.push(cid);
    }
  }

  const dateFrom = url.searchParams.get("dateFrom")?.trim();
  if (dateFrom) {
    conditions.push("c.created_at >= ?");
    params.push(dateFrom);
  }

  const dateTo = url.searchParams.get("dateTo")?.trim();
  if (dateTo) {
    conditions.push("c.created_at <= ?");
    params.push(dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    // Total count
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as total FROM credential_audit_logs c ${whereClause}`
    )
      .bind(...params)
      .first<{ total: number }>();
    const total = countRow?.total ?? 0;

    // Paginated results with credential name join
    const result = await DB.prepare(
      `SELECT c.id, c.credential_id, c.action, c.operator_id, c.operator_name,
              c.ip, c.detail, c.created_at,
              cr.name as credential_name
       FROM credential_audit_logs c
       LEFT JOIN credentials cr ON cr.id = c.credential_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map((row) => ({
      id: row.id as number,
      credentialId: row.credential_id as number,
      credentialName: (row.credential_name as string) ?? "",
      action: row.action as string,
      operatorId: (row.operator_id as number) ?? null,
      operatorName: (row.operator_name as string) ?? "",
      ip: (row.ip as string) ?? "",
      detail: (row.detail as string) ?? "{}",
      createdAt: row.created_at as string,
    }));

    return jsonResponse({ list, total, page, pageSize });
  } catch (err) {
    console.error("[audit_credential_logs] 查询失败:", err);
    return serverError("凭证审计日志查询失败");
  }
};
