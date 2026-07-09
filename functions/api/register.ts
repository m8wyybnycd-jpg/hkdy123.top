import { hashPassword, signJWT } from "../lib/auth";
import { getUserRoleCodes, getUserPermissions } from "../lib/permission";
import {
  jsonResponse,
  badRequest,
  conflict,
  serverError,
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

  // Check if the base prefix is available
  const existing = await db
    .prepare("SELECT id FROM users WHERE username = ?")
    .bind(prefix)
    .first();

  if (!existing) {
    return prefix;
  }

  // Append a random 4-digit suffix and verify uniqueness
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

  // Fallback: use a longer random string
  return `${prefix}_${Date.now().toString(36)}`;
}

/**
 * POST /api/register
 *
 * Registers a new user account with email verification:
 * 1. Validates email format, code, and password.
 * 2. Looks up the latest unused, non-expired verification code for the email.
 * 3. Verifies the submitted code matches.
 * 4. Marks the code as used (used = 1).
 * 5. Checks email uniqueness in D1.
 * 6. Auto-generates a username from the email prefix.
 * 7. Hashes password with PBKDF2.
 * 8. Inserts user into D1 (with is_admin = 0).
 * 9. Signs and returns a JWT token (including is_admin).
 */
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const { DB, JWT_SECRET } = context.env;

  if (!DB) {
    return serverError("数据库不可用，请使用 wrangler pages dev 启动后端");
  }

  // Parse request body
  let body: { email?: string; code?: string; password?: string };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const code = body.code?.trim() ?? "";
  const password = body.password ?? "";

  // Validate email format
  if (!email) {
    return badRequest("请输入邮箱");
  }
  if (!EMAIL_REGEX.test(email)) {
    return badRequest("邮箱格式不正确");
  }

  // Validate verification code (6 digits)
  if (!code) {
    return badRequest("请输入验证码");
  }
  if (!/^\d{6}$/.test(code)) {
    return badRequest("验证码为 6 位数字");
  }

  // Validate password
  if (!password) {
    return badRequest("请输入密码");
  }
  if (password.length < 8) {
    return badRequest("密码至少 8 位");
  }

  // ── Step 1: Verify the code ──
  const now = new Date().toISOString();

  let codeRow: Record<string, unknown> | null;
  try {
    codeRow = await DB.prepare(
      "SELECT id, code, expires_at, used FROM verification_codes WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1"
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

  // Check code match
  const storedCode = codeRow.code as string;
  if (storedCode !== code) {
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
    // Non-fatal — continue with registration
  }

  // ── Step 3: Check email uniqueness ──
  try {
    const existing = await DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first();
    if (existing) {
      return conflict("该邮箱已被注册");
    }
  } catch {
    return serverError("数据库查询失败");
  }

  // ── Step 4: Generate username and hash password ──
  const username = await generateUniqueUsername(DB, email);
  const { hash, salt } = await hashPassword(password);

  // ── Step 5: Insert user ──
  const timestamp = new Date().toISOString();
  try {
    await DB.prepare(
      "INSERT INTO users (email, username, password_hash, salt, created_at, updated_at, is_admin) VALUES (?, ?, ?, ?, ?, ?, 0)"
    )
      .bind(email, username, hash, salt, timestamp, timestamp)
      .run();
  } catch (e) {
    console.error("注册 INSERT 失败:", e);
    return conflict("注册失败，请重试");
  }

  // ── Step 6: Query the inserted user ──
  const userRow = await DB.prepare(
    "SELECT id, email, username, is_admin, created_at FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (!userRow) {
    return serverError("注册失败，请重试");
  }

  const userId = userRow.id as number;
  const userEmail = userRow.email as string;
  const userUsername = userRow.username as string;
  const userCreatedAt = userRow.created_at as string;

  // New users have no roles or permissions yet
  const roles = await getUserRoleCodes(DB, userId);
  const permissions = await getUserPermissions(DB, userId);
  const userIsAdmin = roles.includes("super_admin");

  // ── Step 7: Sign JWT with roles + permissions ──
  if (!JWT_SECRET) {
    return serverError("服务器密钥未配置，请联系管理员");
  }
  const token = await signJWT(
    { userId, email: userEmail, username: userUsername, isAdmin: userIsAdmin, roles, permissions },
    JWT_SECRET
  );

  // 记录注册登录日志
  await logLogin(DB, {
    userId,
    username: userUsername,
    ip: getClientIP(context.request),
    userAgent: getUserAgent(context.request),
    status: "success",
    method: "email",
  });

  // Set HttpOnly cookie with the JWT token
  const cookieValue = `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;

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
    "注册成功",
    0,
    201
  );
  response.headers.set("Set-Cookie", cookieValue);
  return response;
};