import { signJWT } from "../lib/auth";
import { getUserRoleCodes, getUserPermissions } from "../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
  errorResponse,
} from "../lib/response";
import { logLogin, getClientIP, getUserAgent } from "../lib/logger";

/** Regular expression for Chinese mobile phone numbers. */
const PHONE_REGEX = /^1[3-9]\d{9}$/;

/**
 * Generate a username from a phone number.
 * Format: "user_" + last 4 digits of phone (e.g. "user_8888").
 * If taken, append a random 4-digit suffix.
 *
 * @param db    - D1 database binding
 * @param phone - The user's phone number
 * @returns A unique username string
 */
async function generateUniqueUsername(
  db: D1Database,
  phone: string,
): Promise<string> {
  const baseName = `user_${phone.slice(-4)}`;

  const existing = await db
    .prepare("SELECT id FROM users WHERE username = ?")
    .bind(baseName)
    .first();

  if (!existing) {
    return baseName;
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    const candidate = `${baseName}_${suffix}`;
    const conflict = await db
      .prepare("SELECT id FROM users WHERE username = ?")
      .bind(candidate)
      .first();
    if (!conflict) {
      return candidate;
    }
  }

  return `${baseName}_${Date.now().toString(36)}`;
}

/**
 * POST /api/sms-login
 *
 * Phone-based one-click login/register:
 * 1. Validates phone number and verification code.
 * 2. Looks up the latest unused, non-expired SMS code for the phone.
 * 3. Verifies the submitted code matches.
 * 4. Marks the code as used (used = 1).
 * 5. If phone exists in users table → login (return JWT).
 * 6. If phone does not exist → auto-register (no email, no password).
 * 7. Signs and returns a JWT token.
 *
 * @returns `{ code: 0, data: { token, user }, message: "登录成功" }`
 */
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const { DB, JWT_SECRET } = context.env;

  if (!DB) {
    return serverError("数据库不可用");
  }

  // Parse request body
  let body: { phone?: string; code?: string };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const phone = body.phone?.trim() ?? "";
  const code = body.code?.trim() ?? "";

  // Validate phone
  if (!phone) {
    return badRequest("请输入手机号");
  }
  if (!PHONE_REGEX.test(phone)) {
    return badRequest("手机号格式不正确");
  }

  // Validate verification code
  if (!code) {
    return badRequest("请输入验证码");
  }
  if (!/^\d{6}$/.test(code)) {
    return badRequest("验证码为 6 位数字");
  }

  // ── Step 1: Verify the SMS code ──
  const now = new Date().toISOString();

  let codeRow: Record<string, unknown> | null;
  try {
    codeRow = await DB.prepare(
      "SELECT id, code, expires_at, used, failed_attempts FROM verification_codes WHERE phone = ? AND used = 0 ORDER BY created_at DESC LIMIT 1"
    )
      .bind(phone)
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
    // Non-fatal — continue
  }

  // ── Step 3: Look up user by phone ──
  let userRow: Record<string, unknown> | null;
  try {
    userRow = await DB.prepare(
      "SELECT id, email, username, phone, is_admin, created_at FROM users WHERE phone = ?"
    )
      .bind(phone)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  // ── Step 4: Auto-register if user doesn't exist ──
  if (!userRow) {
    const username = await generateUniqueUsername(DB, phone);
    const timestamp = new Date().toISOString();

    try {
      await DB.prepare(
        "INSERT INTO users (email, username, phone, password_hash, salt, created_at, updated_at, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?, 0)"
      )
        .bind("", username, phone, "", "", timestamp, timestamp)
        .run();
    } catch (e) {
      console.error("短信注册 INSERT 失败:", e);
      return errorResponse(409, "注册失败，请重试", 409);
    }

    // Query the newly inserted user
    try {
      userRow = await DB.prepare(
        "SELECT id, email, username, phone, is_admin, created_at FROM users WHERE phone = ?"
      )
        .bind(phone)
        .first();
    } catch {
      return serverError("注册成功但查询失败，请重新登录");
    }
  }

  if (!userRow) {
    return serverError("登录失败，请重试");
  }

  const userId = userRow.id as number;
  const userEmail = (userRow.email as string) || phone; // Use phone as email for JWT compat
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
    method: "sms",
  });

  // Set HttpOnly cookie with the JWT token
  // __Host- prefix: forces Secure + Path=/ + no Domain (strongest origin-binding)
  // SameSite=Strict: prevents CSRF (matches email-login / refresh / logout)
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
