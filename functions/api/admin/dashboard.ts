/**
 * GET /api/admin/dashboard
 *
 * Comprehensive admin dashboard API with consumption analysis,
 * credential health, security audit, and rate-limit overview.
 *
 * Query parameters:
 *   ?range=today|week|month|custom  (default: month)
 *   &from=YYYY-MM-DD                (required when range=custom)
 *   &to=YYYY-MM-DD                  (required when range=custom)
 *
 * Response structure:
 *   {
 *     range, summary, consumption, credentials, security, rateLimits, charts
 *   }
 *
 * Requires `dashboard:view` permission.
 */

import { jsonResponse, serverError } from "../../lib/response";
import { requirePermission } from "../../lib/permission";
import { estimateCost } from "../../lib/consumption-guard";
import {
  aggregateDailyStats,
  getHourlyTrend,
  getTopUsers,
} from "../../lib/consumption-stats";

// ── Types ────────────────────────────────────────────────

/** Time range options supported by the dashboard. */
type TimeRange = "today" | "week" | "month" | "custom";

/** Parsed date range. */
interface DateRange {
  range: TimeRange;
  from: string; // ISO date string (start of day)
  to: string;   // ISO date string (end of day)
}

// ── Helpers ──────────────────────────────────────────────

/** Safe number extraction from D1 query results. */
function num(val: unknown, defaultVal: number = 0): number {
  if (val === null || val === undefined) return defaultVal;
  const n = Number(val);
  return isNaN(n) ? defaultVal : n;
}

/**
 * Parse time range from query parameters.
 *
 * Returns { range, from, to } where from/to are ISO date strings
 * suitable for SQL `created_at >= ? AND created_at <= ?` comparisons.
 */
function parseDateRange(url: URL): DateRange {
  const rangeParam = (url.searchParams.get("range") ?? "month") as TimeRange;
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

  let range: TimeRange = "month";
  if (rangeParam === "today" || rangeParam === "week" || rangeParam === "custom") {
    range = rangeParam;
  }

  // Compute date range
  let from: string;
  let to: string;

  switch (range) {
    case "today":
      from = `${todayStr}T00:00:00.000Z`;
      to = `${todayStr}T23:59:59.999Z`;
      break;

    case "week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      from = weekAgo.toISOString();
      to = now.toISOString();
      break;
    }

    case "custom":
      // Custom range requires from and to params
      if (fromParam && toParam) {
        from = `${fromParam}T00:00:00.000Z`;
        to = `${toParam}T23:59:59.999Z`;
      } else {
        // Fallback to month if custom params missing
        range = "month";
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        from = monthAgo.toISOString();
        to = now.toISOString();
      }
      break;

    case "month":
    default: {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      from = monthAgo.toISOString();
      to = now.toISOString();
      break;
    }
  }

  return { range, from, to };
}

// ── Main Handler ─────────────────────────────────────────

export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "dashboard:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const url = new URL(context.request.url);
  const { range, from, to } = parseDateRange(url);
  const todayDate = new Date().toISOString().split("T")[0];

  try {
    // ═══════════════════════════════════════════════════════
    // Phase 1: Core summary queries (parallel, fail-safe)
    // ═══════════════════════════════════════════════════════

    const coreResults = await Promise.allSettled([
      // 1. Total users
      DB.prepare("SELECT COUNT(*) as total FROM users").first<{ total: number }>(),

      // 2. New users today
      DB.prepare(
        "SELECT COUNT(*) as total FROM users WHERE date(created_at) = date('now')"
      ).first<{ total: number }>(),

      // 3. Active users (consumed tokens within the selected range)
      DB.prepare(
        `SELECT COUNT(DISTINCT user_id) as total FROM token_usage_logs
         WHERE created_at >= ? AND created_at <= ? AND status = 'success'`
      ).bind(from, to).first<{ total: number }>(),

      // 4. Banned users
      DB.prepare(
        "SELECT COUNT(*) as total FROM users WHERE banned = 1"
      ).first<{ total: number }>(),

      // 5. Content counts: platforms
      DB.prepare("SELECT COUNT(*) as total FROM platforms").first<{ total: number }>(),

      // 6. Content counts: cloud_desktops
      DB.prepare("SELECT COUNT(*) as total FROM cloud_desktops").first<{ total: number }>(),

      // 7. Content counts: deals
      DB.prepare("SELECT COUNT(*) as total FROM deals").first<{ total: number }>(),

      // 8. Content counts: games
      DB.prepare("SELECT COUNT(*) as total FROM games").first<{ total: number }>(),

      // 9. User growth trend (last 30 days, new users per day)
      DB.prepare(
        `SELECT date(created_at) as date, COUNT(*) as count
         FROM users
         WHERE created_at >= datetime('now', '-30 days')
         GROUP BY date(created_at)
         ORDER BY date ASC
         LIMIT 30`
      ).all<{ date: string; count: number }>(),
    ]);

    /** Extract count from settled result. */
    const extractCount = (r: PromiseSettledResult<{ total: number } | null>): number =>
      r.status === "fulfilled" && r.value ? r.value.total : 0;

    /** Extract rows from settled result. */
    const extractRows = <T>(r: PromiseSettledResult<{ results: T[] } | null>): T[] =>
      r.status === "fulfilled" && r.value ? r.value.results : [];

    const totalUsers = extractCount(coreResults[0]);
    const todayNewUsers = extractCount(coreResults[1]);
    const activeUsers = extractCount(coreResults[2]);
    const bannedUsers = extractCount(coreResults[3]);
    const totalPlatforms = extractCount(coreResults[4]);
    const totalDesktops = extractCount(coreResults[5]);
    const totalDeals = extractCount(coreResults[6]);
    const totalGames = extractCount(coreResults[7]);
    const userGrowthRows = extractRows<{ date: string; count: number }>(coreResults[8]);

    // ═══════════════════════════════════════════════════════
    // Phase 2: Consumption + credential + security queries
    // ═══════════════════════════════════════════════════════

    const advancedResults = await Promise.allSettled([
      // 10. Today's consumption summary
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

      // 11. This month's consumption summary
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

      // 12. Blocked requests today (rate-limit violations)
      DB.prepare(
        `SELECT COUNT(*) as total FROM token_usage_logs
         WHERE date(created_at) = date('now') AND status = 'blocked'`
      ).first<{ total: number }>(),

      // 13. Credential health summary
      DB.prepare(
        `SELECT
           COUNT(CASE WHEN last_health_status = 'healthy' THEN 1 END) as healthy,
           COUNT(CASE WHEN last_health_status = 'unhealthy' THEN 1 END) as unhealthy,
           COUNT(CASE WHEN last_health_status = 'unknown' OR last_health_status IS NULL THEN 1 END) as unknown_count,
           COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
           COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count,
           COUNT(CASE WHEN status = 'revoked' THEN 1 END) as revoked_count,
           COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
           COUNT(*) as total
         FROM credentials`
      ).first<Record<string, unknown>>(),

      // 14. Credential status list (all credentials with health info)
      DB.prepare(
        `SELECT id, name, provider, type, status,
                last_health_status, last_health_check,
                expires_at, updated_at
         FROM credentials
         ORDER BY updated_at DESC
         LIMIT 50`
      ).all<Record<string, unknown>>(),

      // 15. Recent operation logs (audit events)
      DB.prepare(
        `SELECT id, user_id, username, action, module, target, ip, created_at
         FROM operation_logs
         ORDER BY created_at DESC
         LIMIT 20`
      ).all<Record<string, unknown>>(),

      // 16. Recent user status changes (ban/unban/role changes)
      DB.prepare(
        `SELECT id, user_id, action, old_value, new_value,
                operator_id, operator_name, reason, created_at
         FROM user_status_logs
         ORDER BY created_at DESC
         LIMIT 20`
      ).all<Record<string, unknown>>(),

      // 17. Security alerts: recent credential audit events
      DB.prepare(
        `SELECT id, credential_id, action, operator_name, ip, created_at
         FROM credential_audit_logs
         WHERE action IN ('delete', 'test', 'renew') OR created_at >= datetime('now', '-7 days')
         ORDER BY created_at DESC
         LIMIT 15`
      ).all<Record<string, unknown>>(),

      // 18. Security alerts: encryption key operations
      DB.prepare(
        `SELECT id, user_id, username, action, module, created_at
         FROM operation_logs
         WHERE module = 'security' OR action LIKE '%encrypt%' OR action LIKE '%key%'
         ORDER BY created_at DESC
         LIMIT 10`
      ).all<Record<string, unknown>>(),

      // 19. Quota exhausted users (daily or monthly limit reached)
      DB.prepare(
        `SELECT COUNT(DISTINCT user_id) as total FROM user_quotas
         WHERE is_unlimited = 0
           AND (current_daily_usage >= daily_limit
                OR current_monthly_usage >= monthly_limit)`
      ).first<{ total: number }>(),

      // 20. Today's rate-limit violation details (for security alerts)
      DB.prepare(
        `SELECT user_id, endpoint, block_reason, COUNT(*) as count, MAX(created_at) as last_triggered
         FROM token_usage_logs
         WHERE date(created_at) = date('now') AND status = 'blocked'
         GROUP BY user_id, endpoint
         ORDER BY count DESC
         LIMIT 10`
      ).all<Record<string, unknown>>(),
    ]);

    /** Extract value from settled result with optional default. */
    const extractVal = <T>(r: PromiseSettledResult<T | null>, defaultVal?: T): T | null => {
      if (r.status === "fulfilled") return r.value ?? (defaultVal ?? null);
      return defaultVal ?? null;
    };

    // ── Consumption data ──
    const todayData = extractVal<Record<string, unknown>>(advancedResults[0]) ?? {};
    const monthData = extractVal<Record<string, unknown>>(advancedResults[1]) ?? {};
    const blockedToday = extractCount(advancedResults[2] as PromiseSettledResult<{ total: number } | null>);

    const todayTokens = num(todayData.total_tokens);
    const todayTokensIn = num(todayData.total_tokens_in);
    const todayTokensOut = num(todayData.total_tokens_out);
    const todayCostRaw = num(todayData.total_cost);
    const todayCost = todayCostRaw > 0 ? todayCostRaw : estimateCost(todayTokensIn, todayTokensOut);

    const monthTokens = num(monthData.total_tokens);
    const monthTokensIn = num(monthData.total_tokens_in);
    const monthTokensOut = num(monthData.total_tokens_out);
    const monthCostRaw = num(monthData.total_cost);
    const monthCost = monthCostRaw > 0 ? monthCostRaw : estimateCost(monthTokensIn, monthTokensOut);

    // ── Credential data ──
    const credHealth = extractVal<Record<string, unknown>>(advancedResults[3]) ?? {};
    const credList = extractVal<{ results: Record<string, unknown>[] } | null>(advancedResults[4]);

    const healthyCredentials = num(credHealth.healthy);
    const unhealthyCredentials = num(credHealth.unhealthy) + num(credHealth.unknown_count);

    const credentialStatusList = (credList?.results ?? []).map((r) => ({
      id: num(r.id),
      name: (r.name as string) ?? "",
      provider: (r.provider as string) ?? "",
      type: (r.type as string) ?? "api_key",
      status: (r.status as string) ?? "unknown",
      lastHealthStatus: (r.last_health_status as string) ?? "unknown",
      lastHealthCheck: (r.last_health_check as string) ?? null,
      expiresAt: (r.expires_at as string) ?? null,
      updatedAt: (r.updated_at as string) ?? "",
    }));

    // ── Security data ──
    const auditLogs = extractVal<{ results: Record<string, unknown>[] } | null>(advancedResults[5]);
    const statusLogs = extractVal<{ results: Record<string, unknown>[] } | null>(advancedResults[6]);
    const credAuditLogs = extractVal<{ results: Record<string, unknown>[] } | null>(advancedResults[7]);
    const securityLogs = extractVal<{ results: Record<string, unknown>[] } | null>(advancedResults[8]);

    // Build recent audit events (merge operation_logs + user_status_logs, sort by time)
    const recentAuditEvents: Record<string, unknown>[] = [];

    for (const row of auditLogs?.results ?? []) {
      recentAuditEvents.push({
        id: num(row.id),
        type: "operation",
        userId: num(row.user_id),
        username: (row.username as string) ?? "",
        action: (row.action as string) ?? "",
        module: (row.module as string) ?? "",
        target: (row.target as string) ?? "",
        ip: (row.ip as string) ?? "",
        createdAt: (row.created_at as string) ?? "",
      });
    }

    for (const row of statusLogs?.results ?? []) {
      recentAuditEvents.push({
        id: num(row.id),
        type: "status_change",
        userId: num(row.user_id),
        action: (row.action as string) ?? "",
        oldValue: (row.old_value as string) ?? "",
        newValue: (row.new_value as string) ?? "",
        operatorId: num(row.operator_id),
        operatorName: (row.operator_name as string) ?? "",
        reason: (row.reason as string) ?? "",
        createdAt: (row.created_at as string) ?? "",
      });
    }

    // Sort by createdAt descending, take top 20
    recentAuditEvents.sort((a, b) => {
      const ta = (a.createdAt as string) ?? "";
      const tb = (b.createdAt as string) ?? "";
      return tb.localeCompare(ta);
    });
    const recentAuditEventsTop = recentAuditEvents.slice(0, 20);

    // Build security alerts
    const securityAlerts: Record<string, unknown>[] = [];

    // Rate-limit violations as alerts
    const rateLimitViolations = extractVal<{ results: Record<string, unknown>[] } | null>(advancedResults[10]);
    for (const row of rateLimitViolations?.results ?? []) {
      securityAlerts.push({
        type: "rate_limit_violation",
        severity: "warning",
        userId: num(row.user_id),
        endpoint: (row.endpoint as string) ?? "",
        reason: (row.block_reason as string) ?? "",
        count: num(row.count),
        lastTriggered: (row.last_triggered as string) ?? "",
      });
    }

    // Ban/unban operations as alerts
    for (const row of (statusLogs?.results ?? []).filter(
      (r) => (r.action as string) === "ban" || (r.action as string) === "unban"
    )) {
      securityAlerts.push({
        type: (row.action as string) === "ban" ? "user_banned" : "user_unbanned",
        severity: (row.action as string) === "ban" ? "critical" : "info",
        userId: num(row.user_id),
        operatorName: (row.operator_name as string) ?? "",
        reason: (row.reason as string) ?? "",
        createdAt: (row.created_at as string) ?? "",
      });
    }

    // Credential operations as alerts
    for (const row of credAuditLogs?.results ?? []) {
      securityAlerts.push({
        type: `credential_${(row.action as string) ?? "action"}`,
        severity: (row.action as string) === "delete" ? "critical" : "info",
        credentialId: num(row.credential_id),
        operatorName: (row.operator_name as string) ?? "",
        ip: (row.ip as string) ?? "",
        createdAt: (row.created_at as string) ?? "",
      });
    }

    // Encryption key operations as alerts
    for (const row of securityLogs?.results ?? []) {
      securityAlerts.push({
        type: "encryption_key_operation",
        severity: "warning",
        userId: num(row.user_id),
        username: (row.username as string) ?? "",
        action: (row.action as string) ?? "",
        module: (row.module as string) ?? "",
        createdAt: (row.created_at as string) ?? "",
      });
    }

    // Sort alerts by severity (critical first) then by time
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    securityAlerts.sort((a, b) => {
      const sa = severityOrder[(a.severity as string)] ?? 3;
      const sb = severityOrder[(b.severity as string)] ?? 3;
      if (sa !== sb) return sa - sb;
      const ta = (a.createdAt as string) ?? (a.lastTriggered as string) ?? "";
      const tb = (b.createdAt as string) ?? (b.lastTriggered as string) ?? "";
      return tb.localeCompare(ta);
    });
    const securityAlertsTop = securityAlerts.slice(0, 30);

    // ── Rate limit data ──
    const quotaExhaustedUsers = extractCount(
      advancedResults[9] as PromiseSettledResult<{ total: number } | null>
    );

    // Active rate-limit violations today (count of blocked requests)
    const activeRateLimitViolations = blockedToday;

    // ═══════════════════════════════════════════════════════
    // Phase 3: Chart data (calls to consumption-stats.ts)
    // ═══════════════════════════════════════════════════════

    const [dailyStats, hourlyTrend, topConsumers] = await Promise.all([
      // 30-day daily aggregation for token trend chart
      aggregateDailyStats(DB, undefined, undefined),

      // Today's hourly trend (24-hour breakdown)
      getHourlyTrend(DB, todayDate),

      // Top 10 consumers in the selected range
      getTopUsers(DB, from, to, 10),
    ]);

    // Build token trend chart data from daily stats
    const tokenTrend = dailyStats.map((d) => ({
      date: d.date,
      tokens: d.totalTokens,
      tokensIn: d.totalTokensIn,
      tokensOut: d.totalTokensOut,
      cost: d.totalCost,
      requestCount: d.requestCount,
      uniqueUsers: d.uniqueUserCount,
    }));

    // Build hourly trend chart data
    const hourlyTrendChart = hourlyTrend.map((h) => ({
      hour: h.hour,
      count: h.requestCount,
      tokens: h.totalTokens,
    }));

    // Build top consumers chart data
    const topConsumersChart = topConsumers.map((u) => ({
      userId: u.userId,
      username: u.email,
      tokens: u.totalTokens,
      cost: u.totalCost,
      requestCount: u.requestCount,
    }));

    // Build user growth chart data
    const userGrowth = userGrowthRows.map((r) => ({
      date: r.date,
      count: r.count,
    }));

    // ═══════════════════════════════════════════════════════
    // Assemble final response
    // ═══════════════════════════════════════════════════════

    const dashboard = {
      range,
      summary: {
        totalUsers,
        todayNewUsers,
        activeUsers,
        bannedUsers,
        totalPlatforms,
        totalDesktops,
        totalDeals,
        totalGames,
      },
      consumption: {
        todayTokens,
        todayCost,
        todayRequests: num(todayData.request_count),
        todayUniqueUsers: num(todayData.unique_users),
        monthTokens,
        monthCost,
        monthRequests: num(monthData.request_count),
        monthUniqueUsers: num(monthData.unique_users),
        blockedRequests: blockedToday,
      },
      credentials: {
        healthy: healthyCredentials,
        unhealthy: unhealthyCredentials,
        total: num(credHealth.total),
        activeCount: num(credHealth.active_count),
        expiredCount: num(credHealth.expired_count),
        revokedCount: num(credHealth.revoked_count),
        errorCount: num(credHealth.error_count),
        statusList: credentialStatusList,
      },
      security: {
        recentAuditEvents: recentAuditEventsTop,
        alerts: securityAlertsTop,
      },
      rateLimits: {
        activeViolations: blockedToday,
        quotaExhaustedUsers,
      },
      charts: {
        userGrowth,
        tokenTrend,
        hourlyTrend: hourlyTrendChart,
        topConsumers: topConsumersChart,
      },
    };

    return jsonResponse(dashboard, "ok");
  } catch (err) {
    console.error("[admin/dashboard] 综合统计查询失败:", err);
    return serverError("仪表盘数据查询失败");
  }
};
