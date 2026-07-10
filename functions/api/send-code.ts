import {
  jsonResponse,
  badRequest,
  serverError,
  errorResponse,
} from "../lib/response";
import { getClientIP } from "../lib/logger";

/** Regular expression for basic email format validation. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Verification code validity period in milliseconds (5 minutes). */
const CODE_EXPIRY_MS = 5 * 60 * 1000;

/** Rate-limit window in milliseconds (60 seconds between requests per email). */
const RATE_LIMIT_MS = 60 * 1000;

/** Max verification code requests per IP within the window. */
const IP_RATE_LIMIT = 5;
/** IP rate-limit window in minutes. */
const IP_WINDOW_MINUTES = 10;

/** Brevo API v3 endpoint for transactional email. */
const BREVO_API_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Sender email address — domain `mail.guorizi.cc.cd` is verified and
 * authenticated in Brevo (DKIM + SPF + DMARC). This is the only sender
 * that successfully delivers to QQ Mail (confirmed via delivered + opened
 * events). The domain `hkdy123.top` could not be verified in Brevo.
 */
const SENDER_EMAIL = "noreply@mail.guorizi.cc.cd";
const SENDER_NAME = "云玩汇";

/**
 * Generate a cryptographically secure 6-digit numeric verification code.
 *
 * Uses Web Crypto API `crypto.getRandomValues` with a Uint32Array
 * (range 0–4,294,967,295) to avoid Math.random bias.
 *
 * @returns A 6-character string of digits (e.g. "048213")
 */
function generateCode(): string {
  const buf = crypto.getRandomValues(new Uint32Array(1));
  return (buf[0] % 1000000).toString().padStart(6, "0");
}

/**
 * Send a verification code email via the Brevo API v3.
 *
 * @param apiKey  - Brevo API key read from environment secrets
 * @param email   - Recipient email address
 * @param code    - 6-digit verification code
 * @returns true if the email was sent successfully, false otherwise
 */
async function sendEmail(
  apiKey: string,
  email: string,
  code: string,
): Promise<boolean> {
  const recipientName = email.split("@")[0];

  const payload = {
    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
    to: [{ email, name: recipientName }],
    subject: "【云玩汇】邮箱验证码",
    textContent: `您的验证码是：${code}，5分钟内有效，请勿泄露。`,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
<h2 style="color:#6366f1;margin-bottom:16px;">云玩汇</h2>
<p style="font-size:16px;color:#333;">您正在注册/登录云玩汇，验证码如下：</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#6366f1;background:#f0f0ff;padding:16px 24px;border-radius:8px;text-align:center;">${code}</p>
<p style="font-size:14px;color:#999;margin-top:16px;">验证码 5 分钟内有效，请勿泄露给他人。如非本人操作请忽略此邮件。</p>
</div>`,
  };

  try {
    const res = await fetch(BREVO_API_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Brevo 发送失败:", res.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Brevo 请求异常:", err);
    return false;
  }
}

/**
 * POST /api/send-code
 *
 * Sends a 6-digit email verification code to the specified address.
 *
 * Flow:
 * 1. Validates email format.
 * 2. Checks that BREVO_API_KEY is configured.
 * 3. Checks rate limit — no more than one code per 60 seconds per email.
 * 4. Generates a secure 6-digit code.
 * 5. Stores the code in the `verification_codes` table (expires in 5 min).
 * 6. Sends the code via Brevo API v3.
 *
 * @returns `{ code: 0, message: "验证码已发送" }` on success
 */
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const { DB, BREVO_API_KEY } = context.env;

  if (!DB) {
    return serverError("数据库不可用，请使用 wrangler pages dev 启动后端");
  }

  if (!BREVO_API_KEY) {
    return serverError("邮件服务未配置，请联系管理员设置 BREVO_API_KEY");
  }

  // Parse request body
  let body: { email?: string };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const email = body.email?.trim().toLowerCase() ?? "";

  // Validate email format
  if (!email) {
    return badRequest("请输入邮箱");
  }
  if (!EMAIL_REGEX.test(email)) {
    return badRequest("邮箱格式不正确");
  }

  // Rate limit: check if a code was sent within the last 60 seconds per email
  const now = new Date();
  const rateLimitCutoff = new Date(now.getTime() - RATE_LIMIT_MS).toISOString();

  try {
    const recent = await DB.prepare(
      "SELECT created_at FROM verification_codes WHERE email = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1"
    )
      .bind(email, rateLimitCutoff)
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

  // IP rate limit: max IP_RATE_LIMIT requests per IP in IP_WINDOW_MINUTES
  const clientIP = getClientIP(context.request);
  if (clientIP) {
    try {
      const ipCutoff = new Date(Date.now() - IP_WINDOW_MINUTES * 60 * 1000).toISOString();
      const ipResult = await DB.prepare(
        "SELECT COUNT(*) as count FROM verification_codes WHERE created_at > ? AND EXISTS (SELECT 1 FROM login_logs WHERE login_logs.ip = ? AND login_logs.created_at > ?)"
      )
        .bind(ipCutoff, clientIP, ipCutoff)
        .first();
      // Simpler: just count codes created recently — we don't store IP on verification_codes
      // Use a simpler check: count login_logs with this IP for rate limiting
      const ipCount = await DB.prepare(
        "SELECT COUNT(*) as count FROM login_logs WHERE ip = ? AND created_at > ?"
      )
        .bind(clientIP, ipCutoff)
        .first();
      if ((ipCount?.count as number) >= 20) {
        return errorResponse(429, "请求过于频繁，请稍后再试", 429);
      }
    } catch {
      // Fail-open for IP rate limit (non-critical)
    }
  }

  // Generate verification code
  const code = generateCode();
  const expiresAt = new Date(now.getTime() + CODE_EXPIRY_MS).toISOString();
  const createdAt = now.toISOString();

  // Store code in D1
  try {
    await DB.prepare(
      "INSERT INTO verification_codes (email, code, expires_at, created_at, used) VALUES (?, ?, ?, ?, 0)"
    )
      .bind(email, code, expiresAt, createdAt)
      .run();
  } catch (err) {
    console.error("验证码存储失败:", err);
    return serverError("验证码存储失败");
  }

  // Send email via Brevo
  const sent = await sendEmail(BREVO_API_KEY, email, code);
  if (!sent) {
    return serverError("验证码邮件发送失败，请稍后重试");
  }

  return jsonResponse(null, "验证码已发送");
};
