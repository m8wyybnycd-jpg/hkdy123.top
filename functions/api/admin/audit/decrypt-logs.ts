/**
 * GET /api/admin/audit/decrypt-logs
 *
 * Returns credential decryption audit logs (credential_decrypt_logs)
 * with pagination and filtering support.
 *
 * Requires `audit:view` permission.
 *
 * Query params:
 * - page, pageSize: pagination
 * - success: filter by success status ('true' = only successes, 'false' = only failures)
 * - credentialId: filter by credential ID
 * - callerService: filter by caller service name (fuzzy)
 * - dateFrom, dateTo: date range
 */

import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  serverError,
} from "../../../lib/response";

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

  const successFilter = url.searchParams.get("success")?.trim();
  if (successFilter === "true") {
    conditions.push("d.success = 1");
  } else if (successFilter === "false") {
    conditions.push("d.success = 0");
  }

  const credentialId = url.searchParams.get("credentialId");
  if (credentialId) {
    const cid = parseInt(credentialId, 10);
    if (!isNaN(cid)) {
      conditions.push("d.credential_id = ?");
      params.push(cid);
    }
  }

  const callerService = url.searchParams.get("callerService")?.trim();
  if (callerService) {
    conditions.push("d.caller_service LIKE ?");
    params.push(`%${callerService}%`);
  }

  const dateFrom = url.searchParams.get("dateFrom")?.trim();
  if (dateFrom) {
    conditions.push("d.created_at >= ?");
    params.push(dateFrom);
  }

  const dateTo = url.searchParams.get("dateTo")?.trim();
  if (dateTo) {
    conditions.push("d.created_at <= ?");
    params.push(dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    // Total count
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as total FROM credential_decrypt_logs d ${whereClause}`
    )
      .bind(...params)
      .first<{ total: number }>();
    const total = countRow?.total ?? 0;

    // Paginated results
    const result = await DB.prepare(
      `SELECT d.id, d.credential_id, d.credential_name, d.key_version,
              d.success, d.caller_ip, d.caller_user_id, d.caller_service,
              d.error_message, d.created_at
       FROM credential_decrypt_logs d
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map((row) => ({
      id: row.id as number,
      credentialId: row.credential_id as number,
      credentialName: (row.credential_name as string) ?? "",
      keyVersion: (row.key_version as number) ?? null,
      success: (row.success as number) === 1,
      callerIp: (row.caller_ip as string) ?? "",
      callerUserId: (row.caller_user_id as number) ?? null,
      callerService: (row.caller_service as string) ?? "",
      errorMessage: (row.error_message as string) ?? "",
      createdAt: row.created_at as string,
    }));

    return jsonResponse({ list, total, page, pageSize });
  } catch (err) {
    console.error("[audit_decrypt_logs] 查询失败:", err);
    return serverError("解密审计日志查询失败");
  }
};
