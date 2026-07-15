/**
 * POST /api/pet/device-auth
 * 
 * Desktop device authentication endpoint.
 * 
 * After standard login (email/password), the desktop client calls this
 * endpoint to bind the session to a specific device and obtain short-lived
 * access + refresh tokens.
 * 
 * This creates a security boundary between the web app (7-day HttpOnly cookies)
 * and desktop apps (1-hour access tokens + 30-day refresh tokens with device binding).
 * 
 * Request:
 *   POST /api/pet/device-auth
 *   Authorization: Bearer <temp-token-from-login>
 *   Body: { device_fingerprint: "dev_abc123" }
 * 
 * Response:
 *   { access_token: "...", refresh_token: "...", expires_in: 3600 }
 */

import { getClientIP, getUserAgent, structuredLog } from "../lib/logger";

// ── JWT Helpers ──

const encoder = new TextEncoder();

function toBase64url(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(b64: string): Uint8Array {
  let str = b64.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Verify a JWT and return the raw claims (no type coercion). */
async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64url(sigB64),
    encoder.encode(signingInput)
  );
  if (!valid) throw new Error("Invalid JWT signature");

  const payloadJson = new TextDecoder().decode(fromBase64url(payloadB64));
  const payload = JSON.parse(payloadJson);

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("JWT expired");

  return payload;
}

async function signDesktopJWT(
  payload: Record<string, unknown>,
  secret: string,
  expirySeconds: number
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    ...payload,
    iat: now,
    exp: now + expirySeconds,
    jti: crypto.randomUUID(),
  };

  const headerB64 = toBase64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = toBase64url(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  const sigB64 = toBase64url(sig);

  return `${signingInput}.${sigB64}`;
}

// ── Token expiry constants ──

/** Access token lifetime: 1 hour. Short to limit damage if stolen. */
const ACCESS_TOKEN_EXPIRY = 3600;
/** Refresh token lifetime: 30 days. Allows long-running desktop sessions. */
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 3600;

// ── Handler ──

export async function onRequestPost(context: {
  request: Request;
  env: Env;
  params: Record<string, string>;
}): Promise<Response> {
  const { request, env } = context;
  const db = env.DB;
  const jwtSecret = env.JWT_SECRET;

  if (!db || !jwtSecret) {
    return new Response(JSON.stringify({ code: 500, message: "服务器配置错误", data: null }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 1. Authenticate via temp token from login ──
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ code: 401, message: "缺少认证令牌", data: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tempToken = authHeader.slice(7);
  let payload: Record<string, unknown>;
  try {
    payload = await verifyJWT(tempToken, jwtSecret);
  } catch {
    return new Response(JSON.stringify({ code: 401, message: "令牌无效或已过期，请重新登录", data: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = payload.sub as number;
  if (!userId) {
    return new Response(JSON.stringify({ code: 401, message: "令牌无效", data: null }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 2. Parse device fingerprint ──
  let body: { device_fingerprint?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ code: 400, message: "请求体格式错误", data: null }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const deviceFingerprint = body.device_fingerprint;
  if (!deviceFingerprint || typeof deviceFingerprint !== "string" || deviceFingerprint.length < 5) {
    return new Response(JSON.stringify({ code: 400, message: "缺少设备指纹", data: null }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ip = getClientIP(request);
  const userAgent = getUserAgent(request);

  // ── 3. Record device binding in D1 ──
  // Track which devices a user has authorized for audit trail.
  // If the table doesn't exist yet, skip (non-fatal for MVP).
  try {
    await db
      .prepare(
        `INSERT INTO pet_device_bindings
          (user_id, device_fingerprint, ip, user_agent, created_at, last_seen_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
         ON CONFLICT(user_id, device_fingerprint)
         DO UPDATE SET last_seen_at = datetime('now'), ip = ?, user_agent = ?`
      )
      .bind(userId, deviceFingerprint, ip, userAgent, ip, userAgent)
      .run();
  } catch (err) {
    // Table may not exist yet in MVP — non-fatal
    console.warn("[device-auth] Failed to record device binding (table may not exist):", err);
  }

  // ── 4. Generate tokens ──
  const accessToken = await signDesktopJWT(
    {
      sub: userId,
      type: "desktop_access",
      device: deviceFingerprint.slice(0, 16), // Truncated fingerprint in token
    },
    jwtSecret,
    ACCESS_TOKEN_EXPIRY
  );

  const refreshToken = await signDesktopJWT(
    {
      sub: userId,
      type: "desktop_refresh",
      device: deviceFingerprint.slice(0, 16),
    },
    jwtSecret,
    REFRESH_TOKEN_EXPIRY
  );

  // ── 5. Log audit ──
  structuredLog("info", "device_auth_success", {
    userId,
    deviceFingerprint: deviceFingerprint.slice(0, 16) + "...",
    ip,
  });

  return new Response(JSON.stringify({
    code: 0,
    message: "ok",
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: ACCESS_TOKEN_EXPIRY,
    },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
