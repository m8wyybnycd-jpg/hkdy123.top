import {
  jsonResponse,
  badRequest,
  serverError,
  errorResponse,
} from "../lib/response";

/** Regular expression for Chinese mobile phone numbers. */
const PHONE_REGEX = /^1[3-9]\d{9}$/;

/** Verification code validity period in milliseconds (5 minutes). */
const CODE_EXPIRY_MS = 5 * 60 * 1000;

/** Rate-limit window in milliseconds (60 seconds between requests). */
const RATE_LIMIT_MS = 60 * 1000;

/** SMS sending API endpoint (smsbao.com). */
const SMSBAO_API = "https://api.smsbao.com/sms";

/** SMS content template — includes brand signature. */
const SMS_TEMPLATE = (code: string) =>
  `【云玩汇】您的验证码为${code}，5分钟内有效，请勿泄露于他人。`;

/**
 * Generate a cryptographically secure 6-digit numeric verification code.
 *
 * Uses Web Crypto API `crypto.getRandomValues` with a Uint32Array
 * to avoid Math.random bias.
 *
 * @returns A 6-character string of digits (e.g. "048213")
 */
function generateCode(): string {
  const buf = crypto.getRandomValues(new Uint32Array(1));
  return (buf[0] % 1000000).toString().padStart(6, "0");
}

/**
 * Send an SMS verification code via the smsbao API.
 *
 * NOTE: smsbao.com only supports GET with query parameters for authentication.
 * This is a third-party API limitation. The credentials (username + API key)
 * are passed as URL query params. To mitigate risk:
 * - Cloudflare Workers does not log fetch() URLs by default
 * - Error logging explicitly excludes the URL
 * - Consider migrating to a POST-based SMS provider in the future
 *
 * @param username - smsbao account username
 * @param apiKey   - smsbao API key (MD5-hashed password)
 * @param phone    - Recipient phone number (11 digits)
 * @param code     - 6-digit verification code
 * @returns true if the SMS was sent successfully, false otherwise
 */
async function sendSMS(
  username: string,
  apiKey: string,
  phone: string,
  code: string,
): Promise<boolean> {
  const content = SMS_TEMPLATE(code);
  const url = `${SMSBAO_API}?u=${encodeURIComponent(username)}&p=${encodeURIComponent(apiKey)}&m=${encodeURIComponent(phone)}&c=${encodeURIComponent(content)}`;

  try {
    const res = await fetch(url);
    const text = await res.text();

    // smsbao returns "0" on success, negative numbers for errors
    if (text.trim() !== "0") {
      // Log only the error code, NOT the URL (which contains credentials)
      console.error("smsbao 发送失败，错误码:", text.trim());
      return false;
    }
    return true;
  } catch (err) {
    // Log a sanitized error message without exposing the URL/credentials
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("smsbao 请求异常:", errMsg.replace(/u=[^&]+|p=[^&]+/g, "[REDACTED]"));
    return false;
  }
}

/**
 * POST /api/send-sms
 *
 * Sends a 6-digit SMS verification code to the specified phone number.
 *
 * Flow:
 * 1. Validates phone number format (Chinese mobile: 1[3-9]XXXXXXXXX).
 * 2. Checks that SMSBAO credentials are configured.
 * 3. Checks rate limit — no more than one code per 60 seconds per phone.
 * 4. Generates a secure 6-digit code.
 * 5. Stores the code in the `verification_codes` table (phone column).
 * 6. Sends the code via smsbao API.
 *
 * @returns `{ code: 0, message: "验证码已发送" }` on success
 */
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const { DB, SMSBAO_USERNAME, SMSBAO_API_KEY } = context.env;

  if (!DB) {
    return serverError("数据库不可用");
  }

  if (!SMSBAO_USERNAME || !SMSBAO_API_KEY) {
    return serverError("短信服务未配置，请联系管理员");
  }

  // Parse request body
  let body: { phone?: string };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const phone = body.phone?.trim() ?? "";

  // Validate phone format
  if (!phone) {
    return badRequest("请输入手机号");
  }
  if (!PHONE_REGEX.test(phone)) {
    return badRequest("手机号格式不正确");
  }

  // Rate limit: check if a code was sent within the last 60 seconds
  const now = new Date();
  const rateLimitCutoff = new Date(now.getTime() - RATE_LIMIT_MS).toISOString();

  try {
    const recent = await DB.prepare(
      "SELECT created_at FROM verification_codes WHERE phone = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1"
    )
      .bind(phone, rateLimitCutoff)
      .first();

    if (recent) {
      return errorResponse(
        429,
        "验证码发送过于频繁，请 60 秒后重试",
        429
      );
    }
  } catch {
    return serverError("数据库查询失败");
  }

  // Generate verification code
  const code = generateCode();
  const expiresAt = new Date(now.getTime() + CODE_EXPIRY_MS).toISOString();
  const createdAt = now.toISOString();

  // Store code in D1 — email column is empty string for SMS codes
  try {
    await DB.prepare(
      "INSERT INTO verification_codes (email, phone, code, expires_at, created_at, used) VALUES (?, ?, ?, ?, ?, 0)"
    )
      .bind("", phone, code, expiresAt, createdAt)
      .run();
  } catch (err) {
    console.error("验证码存储失败:", err);
    return serverError("验证码存储失败");
  }

  // Send SMS via smsbao
  const sent = await sendSMS(SMSBAO_USERNAME, SMSBAO_API_KEY, phone, code);
  if (!sent) {
    return serverError("短信发送失败，请稍后重试");
  }

  return jsonResponse(null, "验证码已发送");
};
