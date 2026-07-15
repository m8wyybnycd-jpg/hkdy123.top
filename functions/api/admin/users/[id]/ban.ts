/**
 * POST   /api/admin/users/:id/ban    — Ban a user
 * DELETE /api/admin/users/:id/ban    — Unban a user
 *
 * Requires `user:manage` permission.
 * Super admin users cannot be banned.
 * Ban requires a non-empty reason.
 * All ban/unban actions are recorded in user_status_logs.
 */

import { requirePermission, getUserRoleCodes } from "../../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
  forbidden,
} from "../../../../lib/response";
import { logOperation, getClientIP, getUserAgent } from "../../../../lib/logger";

/**
 * POST /api/admin/users/:id/ban — 封禁用户
 *
 * Body: { reason: string }
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "user:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const targetId = parseInt(context.params.id as string, 10);
  if (isNaN(targetId)) return badRequest("无效的用户 ID");

  // Parse body
  let body: { reason?: string };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const reason = (body.reason || "").trim();
  if (!reason) return badRequest("封禁原因不能为空");

  // Fetch target user
  let target: { id: number; email: string; username: string | null; banned: number } | null;
  try {
    target = await DB.prepare(
      `SELECT id, email, username, COALESCE(banned, 0) AS banned
       FROM users WHERE id = ?`
    )
      .bind(targetId)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!target) return notFound("用户不存在");

  // Prevent self-ban
  const currentUserId = context.data.user?.userId;
  if (targetId === currentUserId) {
    return badRequest("不能封禁当前登录的管理员账号");
  }

  // Super admin guard: check if target has super_admin role
  try {
    const targetRoles = await getUserRoleCodes(DB, targetId);
    if (targetRoles.includes("super_admin")) {
      return forbidden("超级管理员不能被封禁");
    }
  } catch {
    return serverError("角色查询失败");
  }

  // Already banned
  if (target.banned === 1) {
    return jsonResponse(
      { id: targetId, email: target.email, banned: true },
      "该用户已被封禁"
    );
  }

  const now = new Date().toISOString();
  const operatorId = currentUserId ?? null;
  const operatorName = context.data.user?.username || context.data.user?.email || null;
  const clientIP = getClientIP(context.request);

  // Batch: update user + log status change + operation log
  try {
    const updateStmt = DB.prepare(
      "UPDATE users SET banned = 1, banned_reason = ?, banned_at = ?, updated_at = ? WHERE id = ?"
    ).bind(reason, now, now, targetId);

    const statusLogStmt = DB.prepare(
      `INSERT INTO user_status_logs (user_id, action, old_value, new_value, operator_id, operator_name, reason)
       VALUES (?, 'ban', 'active', 'banned', ?, ?, ?)`
    ).bind(targetId, operatorId, operatorName, reason);

    const opLogStmt = DB.prepare(
      `INSERT INTO operation_logs (user_id, username, action, module, target, ip, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      operatorId,
      operatorName,
      "user_ban",
      "user",
      `user:${targetId}`,
      clientIP,
      JSON.stringify({
        targetId,
        targetEmail: target.email,
        targetUsername: target.username,
        reason,
        operatorIp: clientIP,
        operatorUserAgent: getUserAgent(context.request),
      })
    );

    await DB.batch([updateStmt, statusLogStmt, opLogStmt]);
  } catch (err) {
    console.error("[ban] 封禁用户失败:", err);
    return serverError("封禁操作失败");
  }

  console.log(
    JSON.stringify({
      level: "info",
      message: "user_banned",
      targetId,
      targetEmail: target.email,
      operatorId,
      reason,
      timestamp: now,
    })
  );

  return jsonResponse(
    {
      id: targetId,
      email: target.email,
      banned: true,
      bannedReason: reason,
      bannedAt: now,
    },
    "用户已被封禁"
  );
};

/**
 * DELETE /api/admin/users/:id/ban — 解禁用户
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "user:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const targetId = parseInt(context.params.id as string, 10);
  if (isNaN(targetId)) return badRequest("无效的用户 ID");

  // Fetch target user
  let target: { id: number; email: string; username: string | null; banned: number } | null;
  try {
    target = await DB.prepare(
      `SELECT id, email, username, COALESCE(banned, 0) AS banned
       FROM users WHERE id = ?`
    )
      .bind(targetId)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!target) return notFound("用户不存在");

  // Already not banned
  if (target.banned === 0) {
    return jsonResponse(
      { id: targetId, email: target.email, banned: false },
      "该用户未被封禁"
    );
  }

  const now = new Date().toISOString();
  const operatorId = context.data.user?.userId ?? null;
  const operatorName = context.data.user?.username || context.data.user?.email || null;
  const clientIP = getClientIP(context.request);

  // Batch: update user + log status change + operation log
  try {
    const updateStmt = DB.prepare(
      "UPDATE users SET banned = 0, banned_reason = NULL, banned_at = NULL, updated_at = ? WHERE id = ?"
    ).bind(now, targetId);

    const statusLogStmt = DB.prepare(
      `INSERT INTO user_status_logs (user_id, action, old_value, new_value, operator_id, operator_name, reason)
       VALUES (?, 'unban', 'banned', 'active', ?, ?, ?)`
    ).bind(targetId, operatorId, operatorName, "管理员手动解禁");

    const opLogStmt = DB.prepare(
      `INSERT INTO operation_logs (user_id, username, action, module, target, ip, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      operatorId,
      operatorName,
      "user_unban",
      "user",
      `user:${targetId}`,
      clientIP,
      JSON.stringify({
        targetId,
        targetEmail: target.email,
        targetUsername: target.username,
        operatorIp: clientIP,
        operatorUserAgent: getUserAgent(context.request),
      })
    );

    await DB.batch([updateStmt, statusLogStmt, opLogStmt]);
  } catch (err) {
    console.error("[unban] 解禁用户失败:", err);
    return serverError("解禁操作失败");
  }

  console.log(
    JSON.stringify({
      level: "info",
      message: "user_unbanned",
      targetId,
      targetEmail: target.email,
      operatorId,
      timestamp: now,
    })
  );

  return jsonResponse(
    {
      id: targetId,
      email: target.email,
      banned: false,
    },
    "用户已解禁"
  );
};
