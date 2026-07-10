/**
 * 日志记录工具。
 *
 * 提供操作日志和登录日志的写入函数。
 * 日志记录使用 await 但包裹在 try-catch 中，失败不阻塞主请求。
 *
 * 结构化日志：所有 console.log 输出为 JSON 格式，兼容 Cloudflare Workers Logs
 * 自动索引和查询。格式：{ level, message, timestamp, ...context }
 */

/** 操作日志记录参数。 */
export interface LogOperationParams {
  /** 操作者用户 ID。 */
  userId: number | null;
  /** 操作者用户名。 */
  username: string | null;
  /** 操作类型。 */
  action: string;
  /** 操作模块。 */
  module: string;
  /** 操作目标标识。 */
  target?: string;
  /** 操作者 IP。 */
  ip?: string;
  /** 详细信息（会被 JSON.stringify）。 */
  detail?: unknown;
}

/** 登录日志记录参数。 */
export interface LogLoginParams {
  /** 用户 ID。 */
  userId: number | null;
  /** 用户名。 */
  username: string | null;
  /** 登录 IP。 */
  ip?: string;
  /** User-Agent。 */
  userAgent?: string;
  /** 登录状态：success / fail。 */
  status: string;
  /** 登录方式：email / sms。 */
  method?: string;
}

/**
 * 输出结构化 JSON 日志到 Workers Logs。
 *
 * @param level   - 日志级别 (info/warn/error)
 * @param message - 事件标识 (e.g. "user_login", "code_sent")
 * @param context - 额外上下文字段
 */
export function structuredLog(
  level: "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown> = {}
): void {
  console.log(JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  }));
}

/**
 * 记录一条操作日志。
 *
 * 写入 operation_logs 表 + 输出结构化日志。
 * 如果写入失败，仅打印日志，不抛出异常，
 * 确保日志记录不会阻塞主业务流程。
 *
 * @param db    - D1 数据库绑定
 * @param params - 操作日志参数
 */
export async function logOperation(
  db: D1Database,
  params: LogOperationParams
): Promise<void> {
  try {
    const detailStr = params.detail
      ? JSON.stringify(params.detail)
      : null;

    await db
      .prepare(
        `INSERT INTO operation_logs (user_id, username, action, module, target, ip, detail)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        params.userId,
        params.username,
        params.action,
        params.module,
        params.target ?? null,
        params.ip ?? null,
        detailStr
      )
      .run();

    // Also emit structured log for Workers Logs indexing
    structuredLog("info", "operation_log", {
      userId: params.userId,
      username: params.username,
      action: params.action,
      module: params.module,
      target: params.target,
      ip: params.ip,
    });
  } catch (err) {
    structuredLog("error", "operation_log_failed", {
      userId: params.userId,
      action: params.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * 记录一条登录日志。
 *
 * 写入 login_logs 表 + 输出结构化日志。
 * 如果写入失败，仅打印日志，不抛出异常，
 * 确保日志记录不会阻塞主业务流程。
 *
 * @param db    - D1 数据库绑定
 * @param params - 登录日志参数
 */
export async function logLogin(
  db: D1Database,
  params: LogLoginParams
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO login_logs (user_id, username, ip, user_agent, status, method)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        params.userId,
        params.username,
        params.ip ?? null,
        params.userAgent ?? null,
        params.status,
        params.method ?? null
      )
      .run();

    // Also emit structured log for Workers Logs indexing
    structuredLog(params.status === "success" ? "info" : "warn", "login_attempt", {
      userId: params.userId,
      username: params.username,
      ip: params.ip,
      status: params.status,
      method: params.method,
    });
  } catch (err) {
    structuredLog("error", "login_log_failed", {
      userId: params.userId,
      status: params.status,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * 从请求中提取客户端 IP。
 *
 * 优先使用 CF-Connecting-IP（Cloudflare 注入），
 * 其次 X-Forwarded-For，最后回退到空字符串。
 *
 * @param request - Pages Functions Request 对象
 * @returns 客户端 IP 字符串
 */
export function getClientIP(request: Request): string {
  const cfIP = request.headers.get("CF-Connecting-IP");
  if (cfIP) return cfIP;

  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "";
}

/**
 * 从请求中提取 User-Agent。
 *
 * @param request - Pages Functions Request 对象
 * @returns User-Agent 字符串
 */
export function getUserAgent(request: Request): string {
  return request.headers.get("User-Agent") ?? "";
}
