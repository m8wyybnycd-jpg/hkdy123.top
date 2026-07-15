/**
 * GET  /api/admin/quotas  — List all user quotas (paginated, with real-time usage)
 * POST /api/admin/quotas  — Create a new quota for a single user
 * PUT  /api/admin/quotas  — Batch update quotas for multiple users
 *
 * GET  requires `quota:view` permission.
 * POST requires `quota:manage` permission.
 * PUT  requires `quota:manage` permission.
 */

import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
  notFound,
  conflict,
} from "../../lib/response";
import { logOperation, getClientIP } from "../../lib/logger";

/** Map a user_quotas D1 row to a camelCase DTO, including real-time usage if available. */
function mapQuotaRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    dailyLimit: (row.daily_limit as number) ?? 10000,
    monthlyLimit: (row.monthly_limit as number) ?? 100000,
    currentDailyUsage: (row.current_daily_usage as number) ?? 0,
    currentMonthlyUsage: (row.current_monthly_usage as number) ?? 0,
    // Real-time usage computed from token_usage_logs (may differ from stored counters)
    realtimeDailyUsage: (row.realtime_daily_usage as number) ?? null,
    realtimeMonthlyUsage: (row.realtime_monthly_usage as number) ?? null,
    lastResetDate: (row.last_reset_date as string) ?? null,
    lastResetMonth: (row.last_reset_month as string) ?? null,
    isUnlimited: (row.is_unlimited as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * GET /api/admin/quotas — 分页查询所有用户配额（含实时用量计算）
 *
 * Query params:
 * - page, pageSize: 分页参数
 * - search: 按用户邮箱搜索
 * - realtime: 是否计算实时用量（默认 true）
 *
 * Real-time usage is computed via subqueries against token_usage_logs,
 * providing an accurate view of today's and this month's actual consumption
 * (the stored current_daily_usage / current_monthly_usage counters may lag
 * behind if quota reset hasn't triggered yet).
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "quota:view");
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
  const search = url.searchParams.get("search")?.trim() || "";
  const realtime = url.searchParams.get("realtime") !== "false"; // default true

  // Build conditions
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push("u.email LIKE ?");
    params.push(`%${search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Real-time usage subqueries (only included when realtime=true)
  const realtimeColumns = realtime
    ? `,
       (SELECT COALESCE(SUM(total_tokens), 0) FROM token_usage_logs
        WHERE user_id = q.user_id AND date(created_at) = date('now')
          AND status = 'success') as realtime_daily_usage,
       (SELECT COALESCE(SUM(total_tokens), 0) FROM token_usage_logs
        WHERE user_id = q.user_id
          AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
          AND status = 'success') as realtime_monthly_usage`
    : "";

  try {
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as total
       FROM user_quotas q
       LEFT JOIN users u ON u.id = q.user_id
       ${whereClause}`
    )
      .bind(...params)
      .first<{ total: number }>();
    const total = countRow?.total ?? 0;

    const result = await DB.prepare(
      `SELECT q.*, u.email${realtimeColumns}
       FROM user_quotas q
       LEFT JOIN users u ON u.id = q.user_id
       ${whereClause}
       ORDER BY q.user_id ASC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map((row) => ({
      ...mapQuotaRow(row),
      email: (row.email as string) ?? "",
    }));

    return jsonResponse({ list, total, page, pageSize });
  } catch (err) {
    console.error("[quotas] 查询失败:", err);
    return serverError("配额查询失败");
  }
};

/**
 * POST /api/admin/quotas — 为单个用户设置配额
 *
 * Body: { userId: number, dailyLimit?: number, monthlyLimit?: number, isUnlimited?: boolean }
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "quota:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  let body: {
    userId?: number;
    dailyLimit?: number;
    monthlyLimit?: number;
    isUnlimited?: boolean;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  if (!body.userId || typeof body.userId !== "number" || body.userId <= 0) {
    return badRequest("有效的 userId 为必填项");
  }

  // Verify user exists
  try {
    const userExists = await DB.prepare("SELECT id FROM users WHERE id = ?")
      .bind(body.userId)
      .first();
    if (!userExists) return notFound("用户不存在");
  } catch {
    return serverError("数据库查询失败");
  }

  // Check if quota already exists
  try {
    const existing = await DB.prepare(
      "SELECT id FROM user_quotas WHERE user_id = ?"
    )
      .bind(body.userId)
      .first();
    if (existing) return conflict("该用户已有配额记录，请使用 PUT 更新");
  } catch {
    return serverError("数据库查询失败");
  }

  const dailyLimit = typeof body.dailyLimit === "number" && body.dailyLimit > 0 ? body.dailyLimit : 10000;
  const monthlyLimit = typeof body.monthlyLimit === "number" && body.monthlyLimit > 0 ? body.monthlyLimit : 100000;
  const isUnlimited = body.isUnlimited === true ? 1 : 0;

  const now = new Date().toISOString();
  const todayDate = new Date().toISOString().split("T")[0];
  const thisMonth = todayDate.slice(0, 7);

  try {
    const result = await DB.prepare(
      `INSERT INTO user_quotas
        (user_id, daily_limit, monthly_limit, current_daily_usage, current_monthly_usage,
         last_reset_date, last_reset_month, is_unlimited, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, ?)`
    )
      .bind(body.userId, dailyLimit, monthlyLimit, todayDate, thisMonth, isUnlimited, now, now)
      .run();

    const newId = result.meta?.last_row_id;

    const operatorId = context.data.user?.userId ?? null;
    const operatorName = context.data.user?.username || context.data.user?.email || null;

    // Audit log
    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: "create",
      module: "quota",
      target: `user:${body.userId}`,
      ip: getClientIP(context.request),
      detail: { userId: body.userId, dailyLimit, monthlyLimit, isUnlimited },
    });

    const row = await DB.prepare("SELECT * FROM user_quotas WHERE id = ?")
      .bind(newId)
      .first<Record<string, unknown>>();

    return jsonResponse(mapQuotaRow(row as Record<string, unknown>), "配额创建成功", 0, 201);
  } catch (err) {
    console.error("[quotas] 创建失败:", err);
    return serverError("配额创建失败");
  }
};

/**
 * PUT /api/admin/quotas — 批量设置用户配额
 *
 * Body: {
 *   quotas: Array<{
 *     userId: number,
 *     dailyLimit?: number,
 *     monthlyLimit?: number,
 *     isUnlimited?: boolean,
 *     resetUsage?: boolean   // If true, reset current_daily_usage and current_monthly_usage to 0
 *   }>
 * }
 *
 * For each user in the array:
 * - If a quota record exists, update it (only the provided fields are changed).
 * - If no quota record exists, create one with the provided values.
 * - If resetUsage is true, the current usage counters are reset to 0.
 *
 * Returns a summary of successes and failures.
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "quota:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  let body: {
    quotas?: Array<{
      userId: number;
      dailyLimit?: number;
      monthlyLimit?: number;
      isUnlimited?: boolean;
      resetUsage?: boolean;
    }>;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  if (!Array.isArray(body.quotas) || body.quotas.length === 0) {
    return badRequest("quotas 数组不能为空");
  }

  if (body.quotas.length > 100) {
    return badRequest("单次批量操作最多 100 条");
  }

  const now = new Date().toISOString();
  const todayDate = now.split("T")[0];
  const thisMonth = todayDate.slice(0, 7);

  const operatorId = context.data.user?.userId ?? null;
  const operatorName = context.data.user?.username || context.data.user?.email || null;
  const clientIP = getClientIP(context.request);

  const successes: number[] = [];
  const failures: { userId: number; reason: string }[] = [];

  try {
    for (const item of body.quotas) {
      if (!item.userId || typeof item.userId !== "number" || item.userId <= 0) {
        failures.push({ userId: item.userId ?? 0, reason: "无效的 userId" });
        continue;
      }

      // Validate numeric fields
      if (item.dailyLimit !== undefined && (typeof item.dailyLimit !== "number" || item.dailyLimit < 0)) {
        failures.push({ userId: item.userId, reason: "dailyLimit 必须为非负数" });
        continue;
      }
      if (item.monthlyLimit !== undefined && (typeof item.monthlyLimit !== "number" || item.monthlyLimit < 0)) {
        failures.push({ userId: item.userId, reason: "monthlyLimit 必须为非负数" });
        continue;
      }

      try {
        // Check if user exists
        const userExists = await DB.prepare("SELECT id FROM users WHERE id = ?")
          .bind(item.userId)
          .first();
        if (!userExists) {
          failures.push({ userId: item.userId, reason: "用户不存在" });
          continue;
        }

        // Check if quota record exists
        const existing = await DB.prepare(
          "SELECT id FROM user_quotas WHERE user_id = ?"
        )
          .bind(item.userId)
          .first();

        const changes: Record<string, unknown> = { userId: item.userId };

        if (existing) {
          // Update existing quota
          const updates: string[] = [];
          const params: unknown[] = [];

          if (item.dailyLimit !== undefined) {
            updates.push("daily_limit = ?");
            params.push(item.dailyLimit);
            changes.dailyLimit = item.dailyLimit;
          }
          if (item.monthlyLimit !== undefined) {
            updates.push("monthly_limit = ?");
            params.push(item.monthlyLimit);
            changes.monthlyLimit = item.monthlyLimit;
          }
          if (item.isUnlimited !== undefined) {
            updates.push("is_unlimited = ?");
            params.push(item.isUnlimited ? 1 : 0);
            changes.isUnlimited = item.isUnlimited;
          }
          if (item.resetUsage === true) {
            updates.push("current_daily_usage = 0");
            updates.push("current_monthly_usage = 0");
            updates.push("last_reset_date = ?");
            params.push(todayDate);
            updates.push("last_reset_month = ?");
            params.push(thisMonth);
            changes.resetUsage = true;
          }

          if (updates.length > 0) {
            updates.push("updated_at = ?");
            params.push(now);
            params.push(item.userId);

            await DB.prepare(
              `UPDATE user_quotas SET ${updates.join(", ")} WHERE user_id = ?`
            )
              .bind(...params)
              .run();
          }
        } else {
          // Create new quota record
          const dailyLimit = item.dailyLimit ?? 10000;
          const monthlyLimit = item.monthlyLimit ?? 100000;
          const isUnlimited = item.isUnlimited === true ? 1 : 0;

          changes.dailyLimit = dailyLimit;
          changes.monthlyLimit = monthlyLimit;
          changes.isUnlimited = item.isUnlimited === true;
          if (item.resetUsage) changes.resetUsage = true;

          await DB.prepare(
            `INSERT INTO user_quotas
              (user_id, daily_limit, monthly_limit, current_daily_usage, current_monthly_usage,
               last_reset_date, last_reset_month, is_unlimited, created_at, updated_at)
             VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, ?)`
          )
            .bind(item.userId, dailyLimit, monthlyLimit, todayDate, thisMonth, isUnlimited, now, now)
            .run();
        }

        successes.push(item.userId);
      } catch (err) {
        console.error(`[quotas] 批量更新用户 ${item.userId} 失败:`, err);
        failures.push({
          userId: item.userId,
          reason: err instanceof Error ? err.message : "数据库操作失败",
        });
      }
    }

    // Audit log for the batch operation
    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: "batch_update",
      module: "quota",
      target: `batch:${successes.length}success:${failures.length}fail`,
      ip: clientIP,
      detail: { successes, failures },
    });

    return jsonResponse({
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
    }, successes.length > 0 ? "批量更新完成" : "批量更新失败");
  } catch (err) {
    console.error("[quotas] 批量更新失败:", err);
    return serverError("批量配额更新失败");
  }
};
