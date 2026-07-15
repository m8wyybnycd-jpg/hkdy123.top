/**
 * GET /api/admin/tokens/usage
 *
 * Paginated query of token_usage_logs with filtering support.
 * Requires `token:view` permission.
 *
 * Query params:
 * - page, pageSize: 分页参数
 * - userId:  按用户 ID 筛选
 * - credentialId: 按凭证 ID 筛选
 * - model:   按模型名称筛选（模糊匹配）
 * - status:  按状态筛选 ('success', 'blocked', 'error')
 * - dateFrom, dateTo: 日期范围筛选 (ISO 8601 date strings)
 * - aggregate: 聚合模式 ('daily', 'by_user', 'by_model')
 */

import { requirePermission } from "../../../lib/permission";
import { jsonResponse, badRequest, serverError } from "../../../lib/response";

/** Valid token usage statuses. */
const VALID_STATUSES = ["success", "blocked", "error"];

/** Supported aggregate modes. */
const AGGREGATE_MODES = ["daily", "by_user", "by_model"];

export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "token:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const url = new URL(context.request.url);
  const aggregate = url.searchParams.get("aggregate")?.trim();

  // ── Aggregate mode: return summarized data ──
  if (aggregate && AGGREGATE_MODES.includes(aggregate)) {
    return handleAggregate(context, aggregate);
  }

  // ── List mode: paginated detail records ──
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10) || 20)
  );
  const offset = (page - 1) * pageSize;

  // Build filters
  const conditions: string[] = [];
  const params: unknown[] = [];

  const userId = url.searchParams.get("userId");
  if (userId) {
    const uid = parseInt(userId, 10);
    if (!isNaN(uid)) {
      conditions.push("t.user_id = ?");
      params.push(uid);
    }
  }

  const credentialId = url.searchParams.get("credentialId");
  if (credentialId) {
    const cid = parseInt(credentialId, 10);
    if (!isNaN(cid)) {
      conditions.push("t.credential_id = ?");
      params.push(cid);
    }
  }

  const model = url.searchParams.get("model")?.trim();
  if (model) {
    conditions.push("t.model LIKE ?");
    params.push(`%${model}%`);
  }

  const status = url.searchParams.get("status")?.trim();
  if (status && VALID_STATUSES.includes(status)) {
    conditions.push("t.status = ?");
    params.push(status);
  }

  const dateFrom = url.searchParams.get("dateFrom")?.trim();
  if (dateFrom) {
    conditions.push("t.created_at >= ?");
    params.push(dateFrom);
  }

  const dateTo = url.searchParams.get("dateTo")?.trim();
  if (dateTo) {
    conditions.push("t.created_at <= ?");
    params.push(dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    // Total count
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as total FROM token_usage_logs t ${whereClause}`
    )
      .bind(...params)
      .first<{ total: number }>();
    const total = countRow?.total ?? 0;

    // Paginated results
    const result = await DB.prepare(
      `SELECT t.id, t.user_id, t.credential_id, t.model, t.endpoint,
              t.tokens_in, t.tokens_out, t.total_tokens, t.cost,
              t.ip, t.user_agent, t.status, t.block_reason, t.created_at
       FROM token_usage_logs t ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map(mapUsageRow);

    return jsonResponse({ list, total, page, pageSize });
  } catch (err) {
    console.error("[token_usage] 查询失败:", err);
    return serverError("Token 用量查询失败");
  }
};

/**
 * Handle aggregate queries: daily, by_user, by_model.
 */
async function handleAggregate(
  context: PageContext,
  mode: string
): Promise<Response> {
  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const url = new URL(context.request.url);
  const dateFrom = url.searchParams.get("dateFrom") || null;
  const dateTo = url.searchParams.get("dateTo") || null;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (dateFrom) {
    conditions.push("created_at >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("created_at <= ?");
    params.push(dateTo);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    if (mode === "daily") {
      const result = await DB.prepare(
        `SELECT DATE(created_at) as date,
                SUM(tokens_in) as total_tokens_in,
                SUM(tokens_out) as total_tokens_out,
                SUM(total_tokens) as total_tokens,
                SUM(cost) as total_cost,
                COUNT(*) as request_count
         FROM token_usage_logs ${whereClause}
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 90`
      )
        .bind(...params)
        .all<Record<string, unknown>>();

      return jsonResponse({
        mode: "daily",
        data: (result.results || []).map((r) => ({
          date: r.date,
          totalTokensIn: r.total_tokens_in,
          totalTokensOut: r.total_tokens_out,
          totalTokens: r.total_tokens,
          totalCost: r.total_cost,
          requestCount: r.request_count,
        })),
      });
    }

    if (mode === "by_user") {
      const result = await DB.prepare(
        `SELECT t.user_id, u.email,
                SUM(t.tokens_in) as total_tokens_in,
                SUM(t.tokens_out) as total_tokens_out,
                SUM(t.total_tokens) as total_tokens,
                SUM(t.cost) as total_cost,
                COUNT(*) as request_count
         FROM token_usage_logs t
         LEFT JOIN users u ON u.id = t.user_id
         ${whereClause}
         GROUP BY t.user_id
         ORDER BY total_tokens DESC
         LIMIT 100`
      )
        .bind(...params)
        .all<Record<string, unknown>>();

      return jsonResponse({
        mode: "by_user",
        data: (result.results || []).map((r) => ({
          userId: r.user_id,
          email: r.email,
          totalTokensIn: r.total_tokens_in,
          totalTokensOut: r.total_tokens_out,
          totalTokens: r.total_tokens,
          totalCost: r.total_cost,
          requestCount: r.request_count,
        })),
      });
    }

    if (mode === "by_model") {
      const result = await DB.prepare(
        `SELECT model,
                SUM(tokens_in) as total_tokens_in,
                SUM(tokens_out) as total_tokens_out,
                SUM(total_tokens) as total_tokens,
                SUM(cost) as total_cost,
                COUNT(*) as request_count
         FROM token_usage_logs ${whereClause}
         GROUP BY model
         ORDER BY total_tokens DESC
         LIMIT 50`
      )
        .bind(...params)
        .all<Record<string, unknown>>();

      return jsonResponse({
        mode: "by_model",
        data: (result.results || []).map((r) => ({
          model: r.model || "unknown",
          totalTokensIn: r.total_tokens_in,
          totalTokensOut: r.total_tokens_out,
          totalTokens: r.total_tokens,
          totalCost: r.total_cost,
          requestCount: r.request_count,
        })),
      });
    }

    return badRequest("未知的聚合模式");
  } catch (err) {
    console.error("[token_usage] 聚合查询失败:", err);
    return serverError("聚合查询失败");
  }
}

/** Map a token_usage_logs D1 row to a camelCase DTO. */
function mapUsageRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    credentialId: (row.credential_id as number) ?? null,
    model: (row.model as string) ?? null,
    endpoint: (row.endpoint as string) ?? null,
    tokensIn: (row.tokens_in as number) ?? 0,
    tokensOut: (row.tokens_out as number) ?? 0,
    totalTokens: (row.total_tokens as number) ?? 0,
    cost: (row.cost as number) ?? 0,
    ip: (row.ip as string) ?? null,
    userAgent: (row.user_agent as string) ?? null,
    status: (row.status as string) ?? "success",
    blockReason: (row.block_reason as string) ?? null,
    createdAt: row.created_at as string,
  };
}
