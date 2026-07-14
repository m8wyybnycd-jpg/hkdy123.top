import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
  forbidden,
  unauthorized,
} from "../../../../lib/response";
import { hasPermission, getUserRoleCodes } from "../../../../lib/permission";
import { getClientIP, getUserAgent } from "../../../../lib/logger";

/**
 * POST /api/admin/users/:id/level
 *
 * 修改目标用户的账号等级（会员等级）。
 * 完整权限与一致性校验链：
 *   1) 鉴权        —— 未登录返回 401
 *   2) 权限门禁    —— 需 user:manage_level，不足返回 403（明确提示）
 *   3) 目标存在性  —— 不存在返回 404
 *   4) 禁止自改    —— 不能修改当前登录账号自身等级
 *   5) 角色层级    —— 动态判断：目标用户角色 rank 高于当前用户则拒绝（防越权）
 *   6) 取值校验    —— level 必须为 1~MAX_USER_LEVEL 的整数
 *   7) 事务写入    —— DB.batch([UPDATE users, INSERT operation_logs]) 原子执行
 *   8) 审计日志    —— 记录升降方向、旧值/新值、操作者 IP
 */

/** 等级取值范围（含）。 */
const MIN_USER_LEVEL = 1;
const MAX_USER_LEVEL = 10;

/**
 * 角色权限层级。数值越大权限越高。
 * super_admin 最高，operator 次之，未登记角色视为最低（10）。
 * 用于"动态判断目标用户是否可被当前用户修改"。
 */
const ROLE_RANK: Record<string, number> = {
  super_admin: 100,
  operator: 50,
};

/** 计算一个用户所拥有角色中的最高 rank。 */
function maxRoleRank(roleCodes: string[]): number {
  return roleCodes.reduce(
    (max, code) => Math.max(max, ROLE_RANK[code] ?? 10),
    0
  );
}

export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const currentUser = context.data.user;

  // 1) 鉴权：未登录
  if (!currentUser) {
    return unauthorized("当前权限不足以执行此操作：请先登录");
  }

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  // 2) 权限门禁：需 user:manage_level（实时查询 D1，不信任 JWT）
  const permitted = await hasPermission(
    DB,
    currentUser.userId,
    "user:manage_level"
  );
  if (!permitted) {
    return forbidden(
      "当前权限不足以执行此操作：需要 user:manage_level 权限"
    );
  }

  // 解析目标用户 ID
  const targetId = parseInt(context.params.id as string, 10);
  if (isNaN(targetId)) {
    return badRequest("无效的用户 ID");
  }

  // 查询目标用户（含等级与角色）
  let target: {
    id: number;
    email: string;
    username: string | null;
    level: number;
    is_admin: number;
  } | null;
  let targetRoleCodes: string[];
  try {
    target = await DB.prepare(
      `SELECT id, email, username, COALESCE(level, 1) AS level, is_admin
       FROM users WHERE id = ?`
    )
      .bind(targetId)
      .first<{
        id: number;
        email: string;
        username: string | null;
        level: number;
        is_admin: number;
      }>();
    targetRoleCodes = await getUserRoleCodes(DB, targetId);
  } catch (err) {
    console.error("查询目标用户失败:", err);
    return serverError("数据库查询失败");
  }

  // 3) 目标存在性
  if (!target) {
    return notFound("目标用户不存在");
  }

  // 4) 禁止自改
  if (targetId === currentUser.userId) {
    return badRequest("不能修改当前登录账号自身的等级");
  }

  // 5) 角色层级动态判断：目标 rank 高于当前用户则拒绝
  const currentRoleCodes = await getUserRoleCodes(DB, currentUser.userId);
  const currentRank = maxRoleRank(currentRoleCodes);
  const targetRank = maxRoleRank(targetRoleCodes);
  if (targetRank > currentRank) {
    return forbidden(
      "当前权限不足以修改该用户：目标用户的角色权限高于当前用户，无法执行此操作"
    );
  }

  // 解析请求体
  let body: { level?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // 6) 取值校验
  const raw = body.level;
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return badRequest("等级必须为整数");
  }
  if (raw < MIN_USER_LEVEL || raw > MAX_USER_LEVEL) {
    return badRequest(
      `等级必须在 ${MIN_USER_LEVEL} 到 ${MAX_USER_LEVEL} 之间`
    );
  }
  const newLevel = raw;

  const oldLevel = target.level;
  if (newLevel === oldLevel) {
    return jsonResponse(
      { id: target.id, email: target.email, level: newLevel },
      "用户等级未发生变化"
    );
  }

  // 升降方向
  const direction = newLevel > oldLevel ? "升级" : "降级";

  const now = new Date().toISOString();
  const clientIP = getClientIP(context.request);
  const operatorName = currentUser.username || currentUser.email;

  // 7) 事务写入：改等级 + 写审计日志，原子执行
  const updateStmt = DB.prepare(
    "UPDATE users SET level = ?, updated_at = ? WHERE id = ?"
  ).bind(newLevel, now, targetId);

  const logStmt = DB.prepare(
    `INSERT INTO operation_logs (user_id, username, action, module, target, ip, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    currentUser.userId,
    operatorName,
    "user_level_update",
    "user",
    `user:${targetId}`,
    clientIP,
    JSON.stringify({
      targetId,
      targetEmail: target.email,
      targetUsername: target.username,
      oldLevel,
      newLevel,
      direction,
      operatorIp: clientIP,
      operatorUserAgent: getUserAgent(context.request),
    })
  );

  try {
    await DB.batch([updateStmt, logStmt]);
  } catch (err) {
    console.error("修改用户等级事务失败:", err);
    return serverError("等级修改失败，操作已回滚");
  }

  return jsonResponse(
    {
      id: target.id,
      email: target.email,
      username: target.username,
      level: newLevel,
      direction,
      oldLevel,
      newLevel,
    },
    `用户等级${direction}成功`
  );
};
