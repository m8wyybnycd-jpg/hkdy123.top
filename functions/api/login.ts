import { verifyPassword, signJWT } from "../lib/auth";
import { getUserRoleCodes, getUserPermissions } from "../lib/permission";
import { jsonResponse, badRequest, unauthorized, serverError, tooManyRequests } from "../lib/response";
import { logLogin, getClientIP, getUserAgent } from "../lib/logger";

/** Maximum failed login attempts per IP within the window. */
const MAX_ATTEMPTS = 5;
/** Rate limit window in minutes. */
const WINDOW_MINUTES = 10;

/**
 * Check if the requesting IP has exceeded the login rate limit.
 * Uses the login_logs table to count recent failed attempts.
 */
async function isRateLimited(db: D1Database, ip: string): Promise<boolean> {
  if (!ip) return false;
  try {
    const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const result = await db
      .prepare(
        `SELECT COUNT(*) as count FROM login_logs
         WHERE ip = ? AND status = 'fail' AND created_at > ?`
      )
      .bind(ip, cutoff)
      .first();
    return (result?.count as number) >= MAX_ATTEMPTS;
  } catch {
    // Fail-closed: if rate limit check fails, block the login attempt
    // to prevent bypassing rate limiting via DB errors
    return true;
  }
}

/**
 * POST /api/login
 *
 * Authenticates a user:
 * 1. Looks up the user by email OR username in D1 (including is_admin).
 * 2. Verifies the password with PBKDF2.
 * 3. Signs and returns a JWT token on success (including is_admin).
 *
 * The `email` field in the request body accepts either an email address
 * or a username for backward compatibility with the frontend.
 */
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const { DB, JWT_SECRET } = context.env;

  if (!DB) {
    return serverError("数据库不可用，请使用 wrangler pages dev 启动后端");
  }

  // ── Rate limit check: block IPs with too many recent failed attempts ──
  const clientIP = getClientIP(context.request);
  if (await isRateLimited(DB, clientIP)) {
    return tooManyRequests("登录失败次数过多，请 10 分钟后再试");
  }

  // Parse request body
  let body: { email?: string; password?: string };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // Accept either email or username in the `email` field
  const account = body.email?.trim() ?? "";
  const accountLower = account.toLowerCase();
  const password = body.password ?? "";

  if (!account || !password) {
    return badRequest("请输入邮箱/用户名和密码");
  }

  // Query user from D1 by email or username (including is_admin)
  let userRow: Record<string, unknown> | null;
  try {
    userRow = await DB.prepare(
      "SELECT id, email, username, password_hash, salt, is_admin, created_at FROM users WHERE email = ? OR LOWER(username) = ?"
    )
      .bind(accountLower, accountLower)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!userRow) {
    // 记录登录失败日志
    await logLogin(DB, {
      userId: null,
      username: account,
      ip: getClientIP(context.request),
      userAgent: getUserAgent(context.request),
      status: "fail",
      method: "email",
    });
    return unauthorized("账号或密码错误");
  }

  const storedHash = userRow.password_hash as string;
  const storedSalt = userRow.salt as string;

  // Verify password
  const isValid = await verifyPassword(password, storedHash, storedSalt);
  if (!isValid) {
    // 记录登录失败日志
    await logLogin(DB, {
      userId: userRow.id as number,
      username: account,
      ip: getClientIP(context.request),
      userAgent: getUserAgent(context.request),
      status: "fail",
      method: "email",
    });
    return unauthorized("账号或密码错误");
  }

  const userId = userRow.id as number;
  const userEmail = userRow.email as string;
  const userUsername = userRow.username as string;
  const userCreatedAt = userRow.created_at as string;

  // Query user roles and permissions from D1 for JWT injection
  const roles = await getUserRoleCodes(DB, userId);
  const permissions = await getUserPermissions(DB, userId);
  const userIsAdmin = roles.includes("super_admin");

  // Sign JWT with email, is_admin, roles, and permissions in payload
  if (!JWT_SECRET) {
    return serverError("服务器密钥未配置，请联系管理员");
  }
  const token = await signJWT(
    { userId, email: userEmail, username: userUsername, isAdmin: userIsAdmin, roles, permissions },
    JWT_SECRET
  );

  // 记录登录成功日志
  await logLogin(DB, {
    userId,
    username: userUsername,
    ip: getClientIP(context.request),
    userAgent: getUserAgent(context.request),
    status: "success",
    method: "email",
  });

  // Set HttpOnly cookie with the JWT token
  // __Host- prefix: forces Secure + Path=/ + no Domain (strongest origin-binding)
  // SameSite=Strict: prevents CSRF (no third-party login flow needed)
  const cookieValue = `__Host-auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`;

  const response = jsonResponse(
    {
      user: {
        id: userId,
        email: userEmail,
        username: userUsername,
        isAdmin: userIsAdmin,
        roles,
        permissions,
        createdAt: userCreatedAt,
      },
    },
    "登录成功"
  );
  response.headers.set("Set-Cookie", cookieValue);
  return response;
};
