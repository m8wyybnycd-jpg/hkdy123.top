/**
 * Consumption Statistics Aggregation.
 *
 * Provides functions for aggregating token usage data:
 *   - Daily aggregation (all users, by day)
 *   - Monthly aggregation (all users, by month)
 *   - Per-user consumption report (date range)
 *   - Top user ranking
 *   - Usage trends (hourly/daily)
 *   - Cost estimation
 *
 * All functions operate on D1 only — no background workers required.
 */

import { estimateCost } from "./consumption-guard";

// ── Types ────────────────────────────────────────────────

/** Daily aggregation result for all users. */
export interface DailyAggregationResult {
  date: string;
  totalTokens: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  requestCount: number;
  successCount: number;
  blockedCount: number;
  errorCount: number;
  uniqueUserCount: number;
}

/** Monthly aggregation result for all users. */
export interface MonthlyAggregationResult {
  month: string;
  totalTokens: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  requestCount: number;
  successCount: number;
  blockedCount: number;
  errorCount: number;
  uniqueUserCount: number;
  dailyBreakdown: DailyAggregationResult[];
}

/** Per-user consumption report. */
export interface UserConsumptionReport {
  userId: number;
  email: string;
  summary: {
    totalTokens: number;
    totalTokensIn: number;
    totalTokensOut: number;
    totalCost: number;
    requestCount: number;
    successCount: number;
    blockedCount: number;
    errorCount: number;
    avgTokensPerRequest: number;
  };
  dailyTrend: {
    date: string;
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  }[];
  topModels: {
    model: string;
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  }[];
  topEndpoints: {
    endpoint: string;
    totalTokens: number;
    requestCount: number;
  }[];
  ipAnalysis: {
    ip: string;
    requestCount: number;
    lastUsed: string;
  }[];
}

/** Top user ranking entry. */
export interface TopUserEntry {
  userId: number;
  email: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  avgTokensPerRequest: number;
}

// ── Helper: safe number extraction ───────────────────────

function num(val: unknown, defaultVal: number = 0): number {
  if (val === null || val === undefined) return defaultVal;
  const n = Number(val);
  return isNaN(n) ? defaultVal : n;
}

// ── Daily Aggregation ────────────────────────────────────

/**
 * Aggregate daily token usage statistics for all users.
 *
 * @param db       - D1 database binding
 * @param dateFrom - Optional start date (ISO 8601). Defaults to 30 days ago.
 * @param dateTo   - Optional end date (ISO 8601). Defaults to today.
 * @returns Array of daily aggregation results, ordered by date ascending.
 */
export async function aggregateDailyStats(
  db: D1Database,
  dateFrom?: string,
  dateTo?: string
): Promise<DailyAggregationResult[]> {
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

  // Default to last 30 days if no range specified
  if (!dateFrom && !dateTo) {
    conditions.push("created_at >= datetime('now', '-30 days')");
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  try {
    const result = await db
      .prepare(
        `SELECT
           DATE(created_at) as date,
           SUM(total_tokens) as total_tokens,
           SUM(tokens_in) as total_tokens_in,
           SUM(tokens_out) as total_tokens_out,
           SUM(cost) as total_cost,
           COUNT(*) as request_count,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
           SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_count,
           SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
           COUNT(DISTINCT user_id) as unique_user_count
         FROM token_usage_logs
         ${whereClause}
         GROUP BY DATE(created_at)
         ORDER BY date ASC
         LIMIT 365`
      )
      .bind(...params)
      .all<Record<string, unknown>>();

    return (result.results || []).map((row) => ({
      date: (row.date as string) ?? "",
      totalTokens: num(row.total_tokens),
      totalTokensIn: num(row.total_tokens_in),
      totalTokensOut: num(row.total_tokens_out),
      totalCost: num(row.total_cost),
      requestCount: num(row.request_count),
      successCount: num(row.success_count),
      blockedCount: num(row.blocked_count),
      errorCount: num(row.error_count),
      uniqueUserCount: num(row.unique_user_count),
    }));
  } catch (err) {
    console.error("[consumption-stats] Daily aggregation failed:", err);
    return [];
  }
}

// ── Monthly Aggregation ──────────────────────────────────

/**
 * Aggregate monthly token usage statistics for all users.
 *
 * @param db     - D1 database binding
 * @param months - Number of months to look back (default 12)
 * @returns Array of monthly aggregation results, ordered by month ascending.
 */
export async function aggregateMonthlyStats(
  db: D1Database,
  months: number = 12
): Promise<MonthlyAggregationResult[]> {
  try {
    // Get monthly summaries
    const monthlyResult = await db
      .prepare(
        `SELECT
           strftime('%Y-%m', created_at) as month,
           SUM(total_tokens) as total_tokens,
           SUM(tokens_in) as total_tokens_in,
           SUM(tokens_out) as total_tokens_out,
           SUM(cost) as total_cost,
           COUNT(*) as request_count,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
           SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_count,
           SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
           COUNT(DISTINCT user_id) as unique_user_count
         FROM token_usage_logs
         WHERE created_at >= datetime('now', ?)
         GROUP BY strftime('%Y-%m', created_at)
         ORDER BY month ASC`
      )
      .bind(`-${months} months`)
      .all<Record<string, unknown>>();

    const results: MonthlyAggregationResult[] = [];

    for (const row of monthlyResult.results || []) {
      const month = (row.month as string) ?? "";

      // Get daily breakdown for this month
      const dailyResult = await db
        .prepare(
          `SELECT
             DATE(created_at) as date,
             SUM(total_tokens) as total_tokens,
             SUM(tokens_in) as total_tokens_in,
             SUM(tokens_out) as total_tokens_out,
             SUM(cost) as total_cost,
             COUNT(*) as request_count,
             SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
             SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_count,
             SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
             COUNT(DISTINCT user_id) as unique_user_count
           FROM token_usage_logs
           WHERE strftime('%Y-%m', created_at) = ?
           GROUP BY DATE(created_at)
           ORDER BY date ASC`
        )
        .bind(month)
        .all<Record<string, unknown>>();

      results.push({
        month,
        totalTokens: num(row.total_tokens),
        totalTokensIn: num(row.total_tokens_in),
        totalTokensOut: num(row.total_tokens_out),
        totalCost: num(row.total_cost),
        requestCount: num(row.request_count),
        successCount: num(row.success_count),
        blockedCount: num(row.blocked_count),
        errorCount: num(row.error_count),
        uniqueUserCount: num(row.unique_user_count),
        dailyBreakdown: (dailyResult.results || []).map((d) => ({
          date: (d.date as string) ?? "",
          totalTokens: num(d.total_tokens),
          totalTokensIn: num(d.total_tokens_in),
          totalTokensOut: num(d.total_tokens_out),
          totalCost: num(d.total_cost),
          requestCount: num(d.request_count),
          successCount: num(d.success_count),
          blockedCount: num(d.blocked_count),
          errorCount: num(d.error_count),
          uniqueUserCount: num(d.unique_user_count),
        })),
      });
    }

    return results;
  } catch (err) {
    console.error("[consumption-stats] Monthly aggregation failed:", err);
    return [];
  }
}

// ── User Consumption Report ──────────────────────────────

/**
 * Generate a detailed consumption report for a single user.
 *
 * @param db        - D1 database binding
 * @param userId    - User ID
 * @param startDate - Start date (ISO 8601)
 * @param endDate   - End date (ISO 8601)
 * @returns UserConsumptionReport or null if user not found
 */
export async function getUserConsumptionReport(
  db: D1Database,
  userId: number,
  startDate: string,
  endDate: string
): Promise<UserConsumptionReport | null> {
  try {
    // Get user email
    const userRow = await db
      .prepare("SELECT id, email FROM users WHERE id = ?")
      .bind(userId)
      .first<{ id: number; email: string }>();

    if (!userRow) return null;

    // Run summary, daily trend, top models, top endpoints, and IP analysis in parallel
    const [summaryRes, dailyRes, modelsRes, endpointsRes, ipRes] = await Promise.all([
      db
        .prepare(
          `SELECT
             SUM(total_tokens) as total_tokens,
             SUM(tokens_in) as total_tokens_in,
             SUM(tokens_out) as total_tokens_out,
             SUM(cost) as total_cost,
             COUNT(*) as request_count,
             SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
             SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_count,
             SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
           FROM token_usage_logs
           WHERE user_id = ? AND created_at >= ? AND created_at <= ?`
        )
        .bind(userId, startDate, endDate)
        .first<Record<string, unknown>>(),

      db
        .prepare(
          `SELECT
             DATE(created_at) as date,
             SUM(total_tokens) as total_tokens,
             SUM(cost) as total_cost,
             COUNT(*) as request_count
           FROM token_usage_logs
           WHERE user_id = ? AND created_at >= ? AND created_at <= ?
           GROUP BY DATE(created_at)
           ORDER BY date ASC`
        )
        .bind(userId, startDate, endDate)
        .all<Record<string, unknown>>(),

      db
        .prepare(
          `SELECT
             model,
             SUM(total_tokens) as total_tokens,
             SUM(cost) as total_cost,
             COUNT(*) as request_count
           FROM token_usage_logs
           WHERE user_id = ? AND created_at >= ? AND created_at <= ?
           GROUP BY model
           ORDER BY total_tokens DESC
           LIMIT 10`
        )
        .bind(userId, startDate, endDate)
        .all<Record<string, unknown>>(),

      db
        .prepare(
          `SELECT
             endpoint,
             SUM(total_tokens) as total_tokens,
             COUNT(*) as request_count
           FROM token_usage_logs
           WHERE user_id = ? AND created_at >= ? AND created_at <= ?
           GROUP BY endpoint
           ORDER BY request_count DESC
           LIMIT 10`
        )
        .bind(userId, startDate, endDate)
        .all<Record<string, unknown>>(),

      db
        .prepare(
          `SELECT
             ip,
             COUNT(*) as request_count,
             MAX(created_at) as last_used
           FROM token_usage_logs
           WHERE user_id = ? AND ip IS NOT NULL AND ip != ''
             AND created_at >= ? AND created_at <= ?
           GROUP BY ip
           ORDER BY request_count DESC
           LIMIT 10`
        )
        .bind(userId, startDate, endDate)
        .all<Record<string, unknown>>(),
    ]);

    const summaryRow = summaryRes ?? {};
    const totalTokens = num(summaryRow.total_tokens);
    const requestCount = num(summaryRow.request_count);

    return {
      userId,
      email: userRow.email,
      summary: {
        totalTokens,
        totalTokensIn: num(summaryRow.total_tokens_in),
        totalTokensOut: num(summaryRow.total_tokens_out),
        totalCost: num(summaryRow.total_cost),
        requestCount,
        successCount: num(summaryRow.success_count),
        blockedCount: num(summaryRow.blocked_count),
        errorCount: num(summaryRow.error_count),
        avgTokensPerRequest: requestCount > 0 ? Math.round(totalTokens / requestCount) : 0,
      },
      dailyTrend: (dailyRes.results || []).map((r) => ({
        date: (r.date as string) ?? "",
        totalTokens: num(r.total_tokens),
        totalCost: num(r.total_cost),
        requestCount: num(r.request_count),
      })),
      topModels: (modelsRes.results || []).map((r) => ({
        model: (r.model as string) ?? "unknown",
        totalTokens: num(r.total_tokens),
        totalCost: num(r.total_cost),
        requestCount: num(r.request_count),
      })),
      topEndpoints: (endpointsRes.results || []).map((r) => ({
        endpoint: (r.endpoint as string) ?? "unknown",
        totalTokens: num(r.total_tokens),
        requestCount: num(r.request_count),
      })),
      ipAnalysis: (ipRes.results || []).map((r) => ({
        ip: (r.ip as string) ?? "",
        requestCount: num(r.request_count),
        lastUsed: (r.last_used as string) ?? "",
      })),
    };
  } catch (err) {
    console.error("[consumption-stats] User consumption report failed:", err);
    return null;
  }
}

// ── Top Users Ranking ────────────────────────────────────

/**
 * Get top users by token consumption within a date range.
 *
 * @param db        - D1 database binding
 * @param startDate - Start date (ISO 8601)
 * @param endDate   - End date (ISO 8601)
 * @param limit     - Maximum number of users to return (default 20)
 * @returns Array of top user entries, ordered by total tokens descending.
 */
export async function getTopUsers(
  db: D1Database,
  startDate: string,
  endDate: string,
  limit: number = 20
): Promise<TopUserEntry[]> {
  try {
    const result = await db
      .prepare(
        `SELECT
           t.user_id,
           u.email,
           SUM(t.total_tokens) as total_tokens,
           SUM(t.cost) as total_cost,
           COUNT(*) as request_count
         FROM token_usage_logs t
         LEFT JOIN users u ON u.id = t.user_id
         WHERE t.created_at >= ? AND t.created_at <= ?
           AND t.status = 'success'
         GROUP BY t.user_id
         ORDER BY total_tokens DESC
         LIMIT ?`
      )
      .bind(startDate, endDate, limit)
      .all<Record<string, unknown>>();

    return (result.results || []).map((r) => {
      const totalTokens = num(r.total_tokens);
      const requestCount = num(r.request_count);
      return {
        userId: (r.user_id as number) ?? 0,
        email: (r.email as string) ?? "unknown",
        totalTokens,
        totalCost: num(r.total_cost),
        requestCount,
        avgTokensPerRequest: requestCount > 0 ? Math.round(totalTokens / requestCount) : 0,
      };
    });
  } catch (err) {
    console.error("[consumption-stats] Top users query failed:", err);
    return [];
  }
}

// ── Hourly Usage Trend ───────────────────────────────────

/**
 * Get hourly usage trend for a specific date (or today by default).
 *
 * Useful for identifying peak usage hours.
 *
 * @param db   - D1 database binding
 * @param date - Date string in YYYY-MM-DD format (defaults to today)
 * @returns Array of { hour, totalTokens, requestCount } entries (0-23).
 */
export async function getHourlyTrend(
  db: D1Database,
  date?: string
): Promise<{ hour: number; totalTokens: number; requestCount: number }[]> {
  const targetDate = date ?? new Date().toISOString().split("T")[0];

  try {
    const result = await db
      .prepare(
        `SELECT
           CAST(strftime('%H', created_at) AS INTEGER) as hour,
           SUM(total_tokens) as total_tokens,
           COUNT(*) as request_count
         FROM token_usage_logs
         WHERE DATE(created_at) = ?
         GROUP BY hour
         ORDER BY hour ASC`
      )
      .bind(targetDate)
      .all<{ hour: number; total_tokens: number; request_count: number }>();

    // Fill in missing hours with zeros
    const hourMap = new Map<number, { totalTokens: number; requestCount: number }>();
    for (const row of result.results || []) {
      hourMap.set(row.hour, {
        totalTokens: row.total_tokens ?? 0,
        requestCount: row.request_count ?? 0,
      });
    }

    const trend: { hour: number; totalTokens: number; requestCount: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const data = hourMap.get(h) ?? { totalTokens: 0, requestCount: 0 };
      trend.push({ hour: h, ...data });
    }

    return trend;
  } catch (err) {
    console.error("[consumption-stats] Hourly trend query failed:", err);
    return [];
  }
}

// ── Cost Estimation ──────────────────────────────────────

/**
 * Estimate total cost for a given date range.
 *
 * If the token_usage_logs table has cost data, uses that.
 * Otherwise, estimates based on token counts using the standard rates.
 *
 * @param db        - D1 database binding
 * @param startDate - Start date (ISO 8601)
 * @param endDate   - End date (ISO 8601)
 * @returns { totalCost, estimatedCost, totalTokensIn, totalTokensOut }
 */
export async function estimateTotalCost(
  db: D1Database,
  startDate: string,
  endDate: string
): Promise<{
  totalCost: number;
  estimatedCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
}> {
  try {
    const result = await db
      .prepare(
        `SELECT
           SUM(cost) as total_cost,
           SUM(tokens_in) as total_tokens_in,
           SUM(tokens_out) as total_tokens_out
         FROM token_usage_logs
         WHERE created_at >= ? AND created_at <= ?
           AND status = 'success'`
      )
      .bind(startDate, endDate)
      .first<Record<string, unknown>>();

    const totalCost = num(result?.total_cost);
    const totalTokensIn = num(result?.total_tokens_in);
    const totalTokensOut = num(result?.total_tokens_out);
    const estimatedCost = estimateCost(totalTokensIn, totalTokensOut);

    return {
      totalCost: totalCost > 0 ? totalCost : estimatedCost,
      estimatedCost,
      totalTokensIn,
      totalTokensOut,
    };
  } catch (err) {
    console.error("[consumption-stats] Cost estimation failed:", err);
    return { totalCost: 0, estimatedCost: 0, totalTokensIn: 0, totalTokensOut: 0 };
  }
}
