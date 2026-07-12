import { signJWT } from "../lib/auth";
import { getUserRoleCodes, getUserPermissions } from "../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
  errorResponse,
} from "../lib/response";
import { logLogin, getClientIP, getUserAgent } from "../lib/logger";

/** Regular expression for basic email format validation. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Generate a username from the email prefix. If the prefix-based username
 * already exists in D1, append a random numeric suffix to ensure uniqueness.
 *
 * @param db    - D1 database binding
 * @param email - The user's email address
 * @returns A unique username string
 */
async function generateUniqueUsername(
  db: D1Database,
  email: string
): Promise<string> {
  const baseName = email.split("@")[0].replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "");
  const prefix = baseName || "user";

  const existing = await db
    .prepare("SELECT id FROM users WHERE username = ?")
    .bind(prefix)
    .first();

  if (!existing) {
    return prefix;
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    const candidate = `${prefix}_${suffix}`;
    const conflict = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(candidate)
      .first();
    if (!conflict) {
      return candidate;
    }
  }

  return `${prefix}_${Date.now().toString(36)}`;
}

/**
 * POST /api/email-login
 *
 * Email one-click login / register (passwordless):
 * 1. Validates email format and 6-digit verification code.
 * 2. Looks up the latest unused, non-expired verification code for the email.
 * 3. Verifies the submitted code with constant-time comparison (timing attack safe).
 * 4. Marks the code as used (used = 1) and tracks failed_attempts.
 * 5. If the email exists in the users table → login (return JWT).
 * 6. If the email does not exist → auto-register (no password set).
 * 7. Signs and returns a JWT token, sets an HttpOnly __Host- cookie.
 *
 * Reuses the same `verification_codes` table row written by /api/send-code,
 * so the same "send code" flow powers both registration and passwordless login.
 *
 * @returns `{ code: 0, data: { user }, message: "登录成功" }`
 */
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const { DB, JWT_SECRET } = context.env;

  if (!DB) {
    return serverError("数据库不可用");
  }

  // Parse request body
  let body: { email?: string; code?: string };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const code = body.code?.trim() ?? "";

  // Validate email
  if (!email) {
    return badRequest("请输入邮箱");
  }
  if (!EMAIL_REGEX.test(email)) {
    return badRequest("邮箱格式不正确");
  }

  // Validate verification code
  if (!code) {
    return badRequest("请输入验证码");
  }
  if (!/^\d{6}$/.test(code)) {
    return badRequest("验证码为 6 位数字");
  }

  // ── Step 1: Verify the email verification code ──
  const now = new Date().toISOString();

  let codeRow: Record<string, unknown> | null;
  try {
    codeRow = await DB.prepare(
      "SELECT id, code, expires_at, used, failed_attempts FROM verification_codes WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1"
    )
      .bind(email)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!codeRow) {
    return badRequest("验证码不存在或已使用，请重新获取");
  }

  // Check expiration
  const expiresAt = codeRow.expires_at as string;
  if (expiresAt <= now) {
    return badRequest("验证码已过期，请重新获取");
  }

  // Check if max attempts exceeded (5 attempts per code)
  const failedAttempts = (codeRow.failed_attempts as number) || 0;
  if (failedAttempts >= 5) {
    // Mark as used to prevent further attempts
    await DB.prepare("UPDATE verification_codes SET used = 1 WHERE id = ?")
      .bind(codeRow.id as number)
      .run();
    return badRequest("验证码错误次数过多，请重新获取");
  }

  // Constant-time comparison to prevent timing attacks
  const storedCode = codeRow.code as string;
  const a = new TextEncoder().encode(storedCode);
  const b = new TextEncoder().encode(code);
  let codeDiff = 0;
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    codeDiff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  if (a.length !== b.length) codeDiff |= 1;
  if (codeDiff !== 0) {
    // Increment failed attempts
    await DB.prepare(
      "UPDATE verification_codes SET failed_attempts = failed_attempts + 1 WHERE id = ?"
    )
      .bind(codeRow.id as number)
      .run();
    return badRequest("验证码不正确");
  }

  // ── Step 2: Mark code as used ──
  const codeId = codeRow.id as number;
  try {
    await DB.prepare("UPDATE verification_codes SET used = 1 WHERE id = ?")
      .bind(codeId)
      .run();
  } catch (err) {
    console.error("验证码标记失败:", err);
    // Non-fatal — continue with login
  }

  // ── Step 3: Look up user by email ──
  let userRow: Record<string, unknown> | null;
  try {
    userRow = await DB.prepare(
      "SELECT id, email, username, is_admin, created_at FROM users WHERE email = ?"
    )
      .bind(email)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  // ── Step 4: Auto-register if user doesn't exist ──
  if (!userRow) {
    const username = await generateUniqueUsername(DB, email);
    const timestamp = new Date().toISOString();

    try {
      await DB.prepare(
        "INSERT INTO users (email, username, phone, password_hash, salt, created_at, updated_at, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?, 0)"
      )
        .bind(email, username, "", "", "", timestamp, timestamp)
        .run();
    } catch (e) {
      console.error("邮箱登录注册 INSERT 失败:", e);
      return errorResponse(409, "注册失败，请重试", 409);
    }

    // Query the newly inserted user
    try {
      userRow = await DB.prepare(
        "SELECT id, email, username, is_admin, created_at FROM users WHERE email = ?"
      )
        .bind(email)
        .first();
    } catch {
      return serverError("注册成功但查询失败，请重新登录");
    }
  }

  if (!userRow) {
    return serverError("登录失败，请重试");
  }

  const userId = userRow.id as number;
  const userEmail = userRow.email as string;
  const userUsername = userRow.username as string;
  const userCreatedAt = userRow.created_at as string;

  // Query user roles and permissions from D1 for JWT injection
  const roles = await getUserRoleCodes(DB, userId);
  const permissions = await getUserPermissions(DB, userId);
  const userIsAdmin = roles.includes("super_admin");

  // ── Step 5: Sign JWT ──
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
