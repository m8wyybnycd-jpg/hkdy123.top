/**
 * GET /api/admin/quotas/:userId — Get a single user's quota
 * PUT /api/admin/quotas/:userId — Update a user's quota
 *
 * GET requires `quota:view` permission.
 * PUT requires `quota:manage` permission.
 */

import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
  notFound,
} from "../../../lib/response";
import { logOperation, getClientIP } from "../../../lib/logger";

/** Map user_quotas D1 row → camelCase DTO. */
function mapQuotaRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    dailyLimit: (row.daily_limit as number) ?? 10000,
    monthlyLimit: (row.monthly_limit as number) ?? 100000,
    currentDailyUsage: (row.current_daily_usage as number) ?? 0,
    currentMonthlyUsage: (row.current_monthly_usage as number) ?? 0,
    lastResetDate: (row.last_reset_date as string) ?? null,
    lastResetMonth: (row.last_reset_month as string) ?? null,
    isUnlimited: (row.is_unlimited as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * GET /api/admin/quotas/:userId — 获取单个用户配额
 *
 * If no quota record exists, returns null with default quota values.
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "quota:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const userId = parseInt(context.params.userId as string, 10);
  if (isNaN(userId)) return badRequest("无效的用户 ID");

  // Verify user exists
  try {
    const userExists = await DB.prepare("SELECT id, email FROM users WHERE id = ?")
      .bind(userId)
      .first();
    if (!userExists) return notFound("用户不存在");
  } catch {
    return serverError("数据库查询失败");
  }

  try {
    const row = await DB.prepare(
      "SELECT * FROM user_quotas WHERE user_id = ?"
    )
      .bind(userId)
      .first<Record<string, unknown>>();

    if (!row) {
      // Return default quota values
      return jsonResponse({
        userId,
        dailyLimit: 10000,
        monthlyLimit: 100000,
        currentDailyUsage: 0,
        currentMonthlyUsage: 0,
        lastResetDate: null,
        lastResetMonth: null,
        isUnlimited: false,
        createdAt: null,
        updatedAt: null,
        isDefault: true,
      });
    }

    return jsonResponse(mapQuotaRow(row));
  } catch (err) {
    console.error("[quota] 查询失败:", err);
    return serverError("配额查询失败");
  }
};

/**
 * PUT /api/admin/quotas/:userId — 更新用户配额
 *
 * Body: { dailyLimit?, monthlyLimit?, isUnlimited? }
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "quota:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const userId = parseInt(context.params.userId as string, 10);
  if (isNaN(userId)) return badRequest("无效的用户 ID");

  let body: {
    dailyLimit?: number;
    monthlyLimit?: number;
    isUnlimited?: boolean;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // At least one field to update
  if (
    body.dailyLimit === undefined &&
    body.monthlyLimit === undefined &&
    body.isUnlimited === undefined
  ) {
    return badRequest("至少需要提供 dailyLimit、monthlyLimit 或 isUnlimited 之一");
  }

  // Validate values
  if (body.dailyLimit !== undefined && (typeof body.dailyLimit !== "number" || body.dailyLimit < 0)) {
    return badRequest("dailyLimit 必须为非负整数");
  }
  if (body.monthlyLimit !== undefined && (typeof body.monthlyLimit !== "number" || body.monthlyLimit < 0)) {
    return badRequest("monthlyLimit 必须为非负整数");
  }

  // Check if user exists
  try {
    const userExists = await DB.prepare("SELECT id FROM users WHERE id = ?")
      .bind(userId)
      .first();
    if (!userExists) return notFound("用户不存在");
  } catch {
    return serverError("数据库查询失败");
  }

  const now = new Date().toISOString();
  const todayDate = new Date().toISOString().split("T")[0];
  const thisMonth = todayDate.slice(0, 7);

  try {
    // Check if quota record exists
    const existing = await DB.prepare(
      "SELECT id FROM user_quotas WHERE user_id = ?"
    )
      .bind(userId)
      .first();

    const changes: Record<string, unknown> = { userId };

    if (existing) {
      // Update existing quota
      const updates: string[] = [];
      const params: unknown[] = [];

      if (body.dailyLimit !== undefined) {
        updates.push("daily_limit = ?");
        params.push(body.dailyLimit);
        changes.dailyLimit = body.dailyLimit;
      }
      if (body.monthlyLimit !== undefined) {
        updates.push("monthly_limit = ?");
        params.push(body.monthlyLimit);
        changes.monthlyLimit = body.monthlyLimit;
      }
      if (body.isUnlimited !== undefined) {
        updates.push("is_unlimited = ?");
        params.push(body.isUnlimited ? 1 : 0);
        changes.isUnlimited = body.isUnlimited;
      }

      updates.push("updated_at = ?");
      params.push(now);
      params.push(userId);

      await DB.prepare(
        `UPDATE user_quotas SET ${updates.join(", ")} WHERE user_id = ?`
      )
        .bind(...params)
        .run();
    } else {
      // Create new quota record
      const dailyLimit = body.dailyLimit ?? 10000;
      const monthlyLimit = body.monthlyLimit ?? 100000;
      const isUnlimited = body.isUnlimited === true ? 1 : 0;

      changes.dailyLimit = dailyLimit;
      changes.monthlyLimit = monthlyLimit;
      changes.isUnlimited = body.isUnlimited === true;

      await DB.prepare(
        `INSERT INTO user_quotas
          (user_id, daily_limit, monthly_limit, current_daily_usage, current_monthly_usage,
           last_reset_date, last_reset_month, is_unlimited, created_at, updated_at)
         VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, ?)`
      )
        .bind(userId, dailyLimit, monthlyLimit, todayDate, thisMonth, isUnlimited, now, now)
        .run();
    }

    // Audit log
    const operatorId = context.data.user?.userId ?? null;
    const operatorName = context.data.user?.username || context.data.user?.email || null;

    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: "update",
      module: "quota",
      target: `user:${userId}`,
      ip: getClientIP(context.request),
      detail: changes,
    });

    // Return updated quota
    const updated = await DB.prepare(
      "SELECT * FROM user_quotas WHERE user_id = ?"
    )
      .bind(userId)
      .first<Record<string, unknown>>();

    return jsonResponse(mapQuotaRow(updated as Record<string, unknown>), "配额更新成功");
  } catch (err) {
    console.error("[quota] 更新失败:", err);
    return serverError("配额更新失败");
  }
};
