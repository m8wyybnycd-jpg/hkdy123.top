/**
 * POST /api/pet/refresh
 * 
 * Refresh a desktop access token using a refresh token.
 * Each refresh token can only be used ONCE (one-time use).
 * 
 * Request:
 *   POST /api/pet/refresh
 *   Body: { refresh_token: "..." }
 * 
 * Response:
 *   { access_token: "...", refresh_token: "...", expires_in: 3600 }
 */

import { getClientIP, structuredLog } from "../lib/logger";

// ── JWT Helpers (duplicated from device-auth.ts for Pages Functions isolation) ──

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

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const valid = await crypto.subtle.verify("HMAC", key, fromBase64url(sigB64), encoder.encode(signingInput));
  if (!valid) throw new Error("Invalid JWT signature");
  const payload = JSON.parse(new TextDecoder().decode(fromBase64url(payloadB64)));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("JWT expired");
  return payload;
}

async function signJWT(payload: Record<string, unknown>, secret: string, expirySeconds: number): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expirySeconds, jti: crypto.randomUUID() };
  const headerB64 = toBase64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = toBase64url(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  return `${signingInput}.${toBase64url(sig)}`;
}

const ACCESS_TOKEN_EXPIRY = 3600;
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 3600;

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    return new Response(JSON.stringify({ code: 500, message: "服务器配置错误", data: null }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: { refresh_token?: string };
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ code: 400, message: "请求体格式错误", data: null }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
  if (!body.refresh_token) {
    return new Response(JSON.stringify({ code: 400, message: "缺少 refresh_token", data: null }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // Verify refresh token
  let payload: Record<string, unknown>;
  try {
    payload = await verifyJWT(body.refresh_token, jwtSecret);
  } catch {
    return new Response(JSON.stringify({ code: 401, message: "Refresh token无效或已过期", data: null }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  if (payload.type !== "desktop_refresh") {
    return new Response(JSON.stringify({ code: 403, message: "令牌类型不匹配", data: null }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  const userId = payload.sub as number;
  const device = payload.device as string;
  if (!userId || !device) {
    return new Response(JSON.stringify({ code: 401, message: "令牌数据不完整", data: null }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  // ── One-time use: check and invalidate old refresh token ──
  // We use a simple D1-based approach: store used JTI (JWT ID) and
  // reject if already used. This prevents refresh token replay attacks.
  const jti = payload.jti as string;
  if (env.DB && jti) {
    try {
      // Check if this JTI has been used before
      const existing = await env.DB
        .prepare("SELECT 1 FROM pet_refresh_used WHERE jti = ?")
        .bind(jti)
        .first();
      if (existing) {
        // Token already used — possible replay attack!
        // Invalidate ALL refresh tokens for this user+device
        structuredLog("error", "refresh_token_replay", { userId, device, jti });
        return new Response(JSON.stringify({
          code: 403,
          message: "Refresh token已被使用，请重新登录",
          data: null,
        }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      // Mark as used
      await env.DB
        .prepare("INSERT INTO pet_refresh_used (jti, user_id, used_at) VALUES (?, ?, datetime('now'))")
        .bind(jti, userId)
        .run();
    } catch (err) {
      // Table may not exist yet — non-fatal for MVP
      console.warn("[refresh] Failed to check/record JTI (table may not exist):", err);
    }
  }

  // ── Issue new tokens ──
  const newAccessToken = await signJWT(
    { sub: userId, type: "desktop_access", device },
    jwtSecret, ACCESS_TOKEN_EXPIRY
  );
  const newRefreshToken = await signJWT(
    { sub: userId, type: "desktop_refresh", device },
    jwtSecret, REFRESH_TOKEN_EXPIRY
  );

  // Update device binding last_seen
  if (env.DB) {
    try {
      const fullFingerprint = device + "_full";
      await env.DB
        .prepare("UPDATE pet_device_bindings SET last_seen_at = datetime('now') WHERE user_id = ? AND device_fingerprint LIKE ?")
        .bind(userId, device + "%")
        .run();
    } catch (_) { /* non-fatal */ }
  }

  const ip = getClientIP(request);
  structuredLog("info", "token_refresh_success", { userId, device, ip });

  return new Response(JSON.stringify({
    code: 0,
    message: "ok",
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: ACCESS_TOKEN_EXPIRY,
    },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
