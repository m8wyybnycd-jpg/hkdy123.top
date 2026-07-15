/**
 * GET /api/admin/tokens/stats
 *
 * Returns token usage overview statistics for the admin dashboard:
 * - Today's total usage (tokens + cost)
 * - This month's total usage (tokens + cost)
 * - 30-day total usage (tokens + cost)
 * - Top users by token consumption (with cost)
 * - Top models by usage volume (with cost)
 * - Recent daily trend (last 30 days, with cost)
 * - Today's hourly trend (24-hour breakdown)
 * - Status breakdown (success / blocked / error)
 * - Average cost per request
 *
 * Requires `token:view` permission.
 */

import { requirePermission } from "../../../lib/permission";
import { jsonResponse, serverError } from "../../../lib/response";
import { estimateCost } from "../../../lib/consumption-guard";

export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "token:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    // Run all queries in parallel with safe fallbacks
    const results = await Promise.allSettled([
      // 1. Today's total
      DB.prepare(
        `SELECT SUM(total_tokens) as total_tokens,
                SUM(tokens_in) as total_tokens_in,
                SUM(tokens_out) as total_tokens_out,
                SUM(cost) as total_cost,
                COUNT(*) as request_count,
                COUNT(DISTINCT user_id) as unique_users
         FROM token_usage_logs
         WHERE date(created_at) = date('now')`
      ).first<Record<string, unknown>>(),

      // 2. This month's total
      DB.prepare(
        `SELECT SUM(total_tokens) as total_tokens,
                SUM(tokens_in) as total_tokens_in,
                SUM(tokens_out) as total_tokens_out,
                SUM(cost) as total_cost,
                COUNT(*) as request_count,
                COUNT(DISTINCT user_id) as unique_users
         FROM token_usage_logs
         WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
      ).first<Record<string, unknown>>(),

      // 3. 30-day total (for cost summary)
      DB.prepare(
        `SELECT SUM(total_tokens) as total_tokens,
                SUM(tokens_in) as total_tokens_in,
                SUM(tokens_out) as total_tokens_out,
                SUM(cost) as total_cost,
                COUNT(*) as request_count,
                COUNT(DISTINCT user_id) as unique_users
         FROM token_usage_logs
         WHERE created_at >= datetime('now', '-30 days')`
      ).first<Record<string, unknown>>(),

      // 4. Top users (top 10, last 30 days)
      DB.prepare(
        `SELECT t.user_id, u.email,
                SUM(t.total_tokens) as total_tokens,
                SUM(t.tokens_in) as total_tokens_in,
                SUM(t.tokens_out) as total_tokens_out,
                SUM(t.cost) as total_cost,
                COUNT(*) as request_count
         FROM token_usage_logs t
         LEFT JOIN users u ON u.id = t.user_id
         WHERE t.created_at >= datetime('now', '-30 days')
           AND t.status = 'success'
         GROUP BY t.user_id
         ORDER BY total_tokens DESC
         LIMIT 10`
      ).all<Record<string, unknown>>(),

      // 5. Top models (top 10, last 30 days)
      DB.prepare(
        `SELECT model,
                SUM(total_tokens) as total_tokens,
                SUM(tokens_in) as total_tokens_in,
                SUM(tokens_out) as total_tokens_out,
                SUM(cost) as total_cost,
                COUNT(*) as request_count
         FROM token_usage_logs
         WHERE created_at >= datetime('now', '-30 days')
           AND status = 'success'
         GROUP BY model
         ORDER BY total_tokens DESC
         LIMIT 10`
      ).all<Record<string, unknown>>(),

      // 6. Daily trend (last 30 days)
      DB.prepare(
        `SELECT DATE(created_at) as date,
                SUM(total_tokens) as total_tokens,
                SUM(tokens_in) as total_tokens_in,
                SUM(tokens_out) as total_tokens_out,
                SUM(cost) as total_cost,
                COUNT(*) as request_count,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
                SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_count,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
         FROM token_usage_logs
         WHERE created_at >= datetime('now', '-30 days')
         GROUP BY DATE(created_at)
         ORDER BY date ASC`
      ).all<Record<string, unknown>>(),

      // 7. Status breakdown (last 30 days)
      DB.prepare(
        `SELECT status, COUNT(*) as count, SUM(cost) as total_cost
         FROM token_usage_logs
         WHERE created_at >= datetime('now', '-30 days')
         GROUP BY status`
      ).all<Record<string, unknown>>(),

      // 8. Today's hourly trend (24-hour breakdown)
      DB.prepare(
        `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
                SUM(total_tokens) as total_tokens,
                SUM(cost) as total_cost,
                COUNT(*) as request_count
         FROM token_usage_logs
         WHERE DATE(created_at) = DATE('now')
         GROUP BY hour
         ORDER BY hour ASC`
      ).all<Record<string, unknown>>(),
    ]);

    /** Safely extract value from settled result, with optional default. */
    function extractValue<T>(r: PromiseSettledResult<T>, defaultVal?: T): T | undefined {
      if (r.status === "fulfilled") return r.value;
      return defaultVal;
    }

    // Extract results with safe fallback types
    const todayData = extractValue(results[0]);
    const monthData = extractValue(results[1]);
    const thirtyDayData = extractValue(results[2]);
    const topUsers = extractValue(results[3]) ?? { results: [] as Record<string, unknown>[] };
    const topModels = extractValue(results[4]) ?? { results: [] as Record<string, unknown>[] };
    const dailyTrend = extractValue(results[5]) ?? { results: [] as Record<string, unknown>[] };
    const statusBreakdown = extractValue(results[6]) ?? { results: [] as Record<string, unknown>[] };
    const hourlyTrend = extractValue(results[7]) ?? { results: [] as Record<string, unknown>[] };

    // Compute status totals with cost
    const statusMap: Record<string, { count: number; cost: number }> = {};
    for (const row of statusBreakdown.results || []) {
      const status = (row.status as string) ?? "unknown";
      statusMap[status] = {
        count: (row.count as number) ?? 0,
        cost: (row.total_cost as number) ?? 0,
      };
    }

    // Build hourly trend (fill missing hours with zeros)
    const hourMap = new Map<number, { totalTokens: number; totalCost: number; requestCount: number }>();
    for (const row of hourlyTrend.results || []) {
      const hour = (row.hour as number) ?? 0;
      hourMap.set(hour, {
        totalTokens: (row.total_tokens as number) ?? 0,
        totalCost: (row.total_cost as number) ?? 0,
        requestCount: (row.request_count as number) ?? 0,
      });
    }
    const todayHourlyTrend: { hour: number; totalTokens: number; totalCost: number; requestCount: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const data = hourMap.get(h) ?? { totalTokens: 0, totalCost: 0, requestCount: 0 };
      todayHourlyTrend.push({ hour: h, ...data });
    }

    // Helper for safe number extraction
    const num = (v: unknown, d = 0): number => {
      if (v === null || v === undefined) return d;
      const n = Number(v);
      return isNaN(n) ? d : n;
    };

    // Calculate averages and estimated costs
    const todayTokensIn = num(todayData?.total_tokens_in);
    const todayTokensOut = num(todayData?.total_tokens_out);
    const todayCost = num(todayData?.total_cost);
    const todayReqCount = num(todayData?.request_count);
    const todayEstimatedCost = estimateCost(todayTokensIn, todayTokensOut);

    const monthTokensIn = num(monthData?.total_tokens_in);
    const monthTokensOut = num(monthData?.total_tokens_out);
    const monthCost = num(monthData?.total_cost);
    const monthReqCount = num(monthData?.request_count);

    const thirtyDayCost = num(thirtyDayData?.total_cost);
    const thirtyDayReqCount = num(thirtyDayData?.request_count);
    const thirtyDayTokens = num(thirtyDayData?.total_tokens);

    const stats = {
      today: {
        totalTokens: num(todayData?.total_tokens),
        totalTokensIn: todayTokensIn,
        totalTokensOut: todayTokensOut,
        totalCost: todayCost > 0 ? todayCost : todayEstimatedCost,
        estimatedCost: todayEstimatedCost,
        requestCount: todayReqCount,
        uniqueUsers: num(todayData?.unique_users),
        avgTokensPerRequest: todayReqCount > 0 ? Math.round(num(todayData?.total_tokens) / todayReqCount) : 0,
      },
      thisMonth: {
        totalTokens: num(monthData?.total_tokens),
        totalTokensIn: monthTokensIn,
        totalTokensOut: monthTokensOut,
        totalCost: monthCost > 0 ? monthCost : estimateCost(monthTokensIn, monthTokensOut),
        requestCount: monthReqCount,
        uniqueUsers: num(monthData?.unique_users),
        avgTokensPerRequest: monthReqCount > 0 ? Math.round(num(monthData?.total_tokens) / monthReqCount) : 0,
      },
      last30Days: {
        totalTokens: thirtyDayTokens,
        totalCost: thirtyDayCost > 0 ? thirtyDayCost : estimateCost(
          num(thirtyDayData?.total_tokens_in),
          num(thirtyDayData?.total_tokens_out)
        ),
        requestCount: thirtyDayReqCount,
        uniqueUsers: num(thirtyDayData?.unique_users),
        avgCostPerRequest: thirtyDayReqCount > 0
          ? Number((thirtyDayCost / thirtyDayReqCount).toFixed(6))
          : 0,
      },
      topUsers: (topUsers.results || []).map((r: Record<string, unknown>) => {
        const reqCount = num(r.request_count);
        const totalTokens = num(r.total_tokens);
        return {
          userId: (r.user_id as number) ?? 0,
          email: (r.email as string) ?? "unknown",
          totalTokens,
          totalTokensIn: num(r.total_tokens_in),
          totalTokensOut: num(r.total_tokens_out),
          totalCost: num(r.total_cost),
          requestCount: reqCount,
          avgTokensPerRequest: reqCount > 0 ? Math.round(totalTokens / reqCount) : 0,
        };
      }),
      topModels: (topModels.results || []).map((r: Record<string, unknown>) => {
        const reqCount = num(r.request_count);
        const totalTokens = num(r.total_tokens);
        return {
          model: (r.model as string) ?? "unknown",
          totalTokens,
          totalTokensIn: num(r.total_tokens_in),
          totalTokensOut: num(r.total_tokens_out),
          totalCost: num(r.total_cost),
          requestCount: reqCount,
          avgTokensPerRequest: reqCount > 0 ? Math.round(totalTokens / reqCount) : 0,
        };
      }),
      dailyTrend: (dailyTrend.results || []).map((r: Record<string, unknown>) => ({
        date: (r.date as string) ?? "",
        totalTokens: num(r.total_tokens),
        totalTokensIn: num(r.total_tokens_in),
        totalTokensOut: num(r.total_tokens_out),
        totalCost: num(r.total_cost),
        requestCount: num(r.request_count),
        successCount: num(r.success_count),
        blockedCount: num(r.blocked_count),
        errorCount: num(r.error_count),
      })),
      todayHourlyTrend,
      statusBreakdown: {
        success: { count: statusMap["success"]?.count ?? 0, cost: statusMap["success"]?.cost ?? 0 },
        blocked: { count: statusMap["blocked"]?.count ?? 0, cost: statusMap["blocked"]?.cost ?? 0 },
        error: { count: statusMap["error"]?.count ?? 0, cost: statusMap["error"]?.cost ?? 0 },
      },
    };

    return jsonResponse(stats);
  } catch (err) {
    console.error("[token_stats] 统计查询失败:", err);
    return serverError("Token 统计查询失败");
  }
};
