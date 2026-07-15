/**
 * Token Validator — Bypass detection for AI/Token consumption requests.
 *
 * This module detects and flags attempts to bypass the platform's consumption
 * control system, such as:
 *   1. Requests from non-platform domains (Referer/Origin check)
 *   2. Missing or invalid platform-issued consumption signature (HMAC)
 *   3. Abnormal request frequency (burst detection)
 *   4. IP inconsistency (same user, rapidly changing IPs)
 *
 * Detection results are returned as a structured report. The consuming
 * endpoint decides whether to block or merely flag suspicious activity.
 *
 * All detections use D1 queries — no Redis/KV required.
 */

import { getClientIP, getUserAgent, structuredLog } from "./logger";

// ── Types ────────────────────────────────────────────────

/** Result of a token consumption validation. */
export interface TokenValidationResult {
  /** Whether the request passed all critical validation checks. */
  valid: boolean;
  /** Whether the request is suspicious (but not necessarily blocked). */
  suspicious: boolean;
  /** Whether the request should be HARD BLOCKED (frequency anomaly / IP inconsistency). */
  hardBlock: boolean;
  /** List of suspicion reasons detected. */
  suspicionReasons: string[];
  /** The client IP extracted from the request. */
  ip: string;
  /** The User-Agent extracted from the request. */
  userAgent: string;
  /** Whether the source (Referer/Origin) is from the platform. */
  sourceValid: boolean;
  /** Whether the consumption signature is valid. */
  signatureValid: boolean;
}

// ── Platform domains ─────────────────────────────────────

/** Allowed platform domains for Referer/Origin validation. */
const PLATFORM_DOMAINS = [
  // Production domains
  "www.hkdy123.top",
  "hkdy123.top",
  // Dev
  "localhost:5173",
  "localhost:4173",
  "localhost:8787",
  // Desktop apps (Neutralinojs / Tauri)
  "localhost",       // Neutralinojs serves from localhost
  "127.0.0.1",
];

/**
 * Check if the request's Referer or Origin header comes from a platform domain.
 */
function checkSourceOrigin(request: Request): boolean {
  const referer = request.headers.get("Referer") ?? "";
  const origin = request.headers.get("Origin") ?? "";

  // If neither header is present, we can't validate the source.
  // This is common for direct API calls (e.g. curl) — flag as suspicious but don't block.
  if (!referer && !origin) {
    return false;
  }

  // Check both headers against the platform domains
  const sourceToCheck = origin || referer;

  try {
    const sourceUrl = new URL(sourceToCheck);
    const host = sourceUrl.hostname;
    const hostWithPort = `${sourceUrl.hostname}:${sourceUrl.port}`;

    return PLATFORM_DOMAINS.some(
      (domain) => host === domain || hostWithPort === domain || host.endsWith(`.${domain}`)
    );
  } catch {
    // If the URL is malformed, treat as invalid source
    return false;
  }
}

// ── HMAC Signature Verification ──────────────────────────

/**
 * Verify a platform-issued consumption signature.
 *
 * The signature format is: `userId.timestamp.hmac`
 * Where hmac = HMAC-SHA256(JWT_SECRET, `${userId}.${timestamp}`)
 *
 * The signature is valid if:
 *   - The HMAC matches
 *   - The timestamp is within the allowed skew (default 5 minutes)
 *
 * Clients should include this in the `X-Consumption-Sign` header.
 *
 * @param env      - Cloudflare environment (needs JWT_SECRET)
 * @param userId   - The authenticated user's ID
 * @param signHeader - The raw X-Consumption-Sign header value
 * @param maxAgeSeconds - Maximum allowed age of the signature (default 300s = 5min)
 * @returns true if the signature is valid, false otherwise
 */
export async function verifyConsumptionSignature(
  env: Env,
  userId: number,
  signHeader: string | null,
  maxAgeSeconds: number = 300
): Promise<boolean> {
  if (!signHeader) return false;

  const secret = env.JWT_SECRET;
  if (!secret) return false;

  // Parse signature: "userId.timestamp.hmac"
  const parts = signHeader.split(".");
  if (parts.length !== 3) return false;

  const [signUserIdStr, timestampStr, hmacB64] = parts;
  const signUserId = parseInt(signUserIdStr, 10);
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(signUserId) || isNaN(timestamp)) return false;

  // User ID must match
  if (signUserId !== userId) return false;

  // Timestamp must be within the allowed skew
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);
  if (age > maxAgeSeconds) return false;

  // Verify HMAC
  const message = `${signUserId}.${timestamp}`;
  const encoder = new TextEncoder();

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Decode base64url HMAC
    let hmacStr = hmacB64.replace(/-/g, "+").replace(/_/g, "/");
    while (hmacStr.length % 4) hmacStr += "=";
    const hmacBytes = Uint8Array.from(atob(hmacStr), (c) => c.charCodeAt(0));

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      hmacBytes.buffer as ArrayBuffer,
      encoder.encode(message)
    );

    return valid;
  } catch {
    return false;
  }
}

/**
 * Generate a consumption signature for a user.
 *
 * This can be called by an endpoint that issues temporary consumption permits
 * to the client (e.g. a "pre-flight" endpoint that returns a signed token
 * the client must include in subsequent AI requests).
 *
 * @param env      - Cloudflare environment (needs JWT_SECRET)
 * @param userId   - The user ID to sign for
 * @returns The signature string to put in the X-Consumption-Sign header
 */
export async function generateConsumptionSignature(
  env: Env,
  userId: number
): Promise<string> {
  const secret = env.JWT_SECRET;
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${userId}.${timestamp}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

  // Encode as base64url
  const sigBytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < sigBytes.length; i++) {
    binary += String.fromCharCode(sigBytes[i]);
  }
  const hmacB64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${userId}.${timestamp}.${hmacB64}`;
}

// ── Frequency Anomaly Detection ──────────────────────────

/** Threshold for burst detection: requests per minute. */
const BURST_THRESHOLD_PER_MIN = 20;

/** Threshold for high-frequency: requests per 5 minutes. */
const HIGH_FREQ_THRESHOLD_5MIN = 60;

/**
 * Detect abnormal request frequency for a user.
 *
 * Checks:
 *   - More than BURST_THRESHOLD_PER_MIN requests in the last 60 seconds
 *   - More than HIGH_FREQ_THRESHOLD_5MIN requests in the last 5 minutes
 *
 * @returns Anomaly reason string if detected, null otherwise.
 */
async function detectFrequencyAnomaly(
  db: D1Database,
  userId: number
): Promise<string | null> {
  try {
    // Check burst (1-minute window)
    const burstResult = await db
      .prepare(
        `SELECT COUNT(*) as cnt FROM token_usage_logs
         WHERE user_id = ? AND created_at > datetime('now', '-60 seconds')`
      )
      .bind(userId)
      .first<{ cnt: number }>();

    const burstCount = burstResult?.cnt ?? 0;
    if (burstCount >= BURST_THRESHOLD_PER_MIN) {
      return `频率异常：1分钟内请求${burstCount}次（阈值${BURST_THRESHOLD_PER_MIN}次）`;
    }

    // Check sustained high frequency (5-minute window)
    const sustainedResult = await db
      .prepare(
        `SELECT COUNT(*) as cnt FROM token_usage_logs
         WHERE user_id = ? AND created_at > datetime('now', '-300 seconds')`
      )
      .bind(userId)
      .first<{ cnt: number }>();

    const sustainedCount = sustainedResult?.cnt ?? 0;
    if (sustainedCount >= HIGH_FREQ_THRESHOLD_5MIN) {
      return `频率异常：5分钟内请求${sustainedCount}次（阈值${HIGH_FREQ_THRESHOLD_5MIN}次）`;
    }
  } catch (err) {
    // If the query fails (table may not exist), skip this check
    console.error("[token-validator] Frequency anomaly check failed:", err);
  }

  return null;
}

// ── IP Consistency Detection ─────────────────────────────

/** Time window for IP consistency check (10 minutes). */
const IP_CONSISTENCY_WINDOW_SECONDS = 600;

/** Minimum distinct IPs to trigger an alert. */
const IP_CONSISTENCY_MIN_DISTINCT = 3;

/**
 * Detect IP inconsistency: the same user making requests from multiple
 * distinct IPs within a short time window, which could indicate token
 * sharing or credential theft.
 *
 * @returns Anomaly reason string if detected, null otherwise.
 */
async function detectIPInconsistency(
  db: D1Database,
  userId: number,
  currentIP: string
): Promise<string | null> {
  if (!currentIP) return null;

  try {
    const result = await db
      .prepare(
        `SELECT DISTINCT ip FROM token_usage_logs
         WHERE user_id = ? AND ip IS NOT NULL AND ip != ''
         AND created_at > datetime('now', ?)`
      )
      .bind(userId, `-${IP_CONSISTENCY_WINDOW_SECONDS} seconds`)
      .all<{ ip: string }>();

    const distinctIPs = new Set<string>();
    for (const row of result.results || []) {
      if (row.ip) distinctIPs.add(row.ip);
    }
    // Add current IP
    distinctIPs.add(currentIP);

    if (distinctIPs.size >= IP_CONSISTENCY_MIN_DISTINCT) {
      return `IP异常：${IP_CONSISTENCY_WINDOW_SECONDS / 60}分钟内使用了${distinctIPs.size}个不同IP`;
    }
  } catch (err) {
    console.error("[token-validator] IP consistency check failed:", err);
  }

  return null;
}

// ── Main Validation Function ─────────────────────────────

/**
 * Validate a token consumption request for bypass detection.
 *
 * This function performs all bypass detection checks and returns a
 * structured report. It does NOT block requests — the calling endpoint
 * should decide whether to block based on the `suspicious` flag and
 * the specific suspicion reasons.
 *
 * Recommended usage:
 * ```typescript
 * const validation = await validateTokenConsumption(request, env, userId);
 * if (validation.suspicious) {
 *   // Log the suspicious activity, optionally block
 *   structuredLog("warn", "suspicious_consumption", { userId, reasons: validation.suspicionReasons });
 * }
 * ```
 *
 * @param request    - The incoming request
 * @param env        - Cloudflare environment bindings
 * @param userId     - Authenticated user ID
 * @param tokenValue - Optional token value (unused in current implementation)
 * @returns TokenValidationResult with detection results
 */
export async function validateTokenConsumption(
  request: Request,
  env: Env,
  userId: number,
  tokenValue?: string | null
): Promise<TokenValidationResult> {
  const ip = getClientIP(request);
  const userAgent = getUserAgent(request);
  const db = env.DB;

  const suspicionReasons: string[] = [];

  // ── 1. Source validation (Referer/Origin) ──
  const sourceValid = checkSourceOrigin(request);
  if (!sourceValid) {
    suspicionReasons.push("来源异常：请求未来自平台域名（Referer/Origin缺失或不匹配）");
  }

  // ── 2. Consumption signature validation (HMAC) ──
  const signHeader = request.headers.get("X-Consumption-Sign");
  let signatureValid = false;
  if (db) {
    try {
      signatureValid = await verifyConsumptionSignature(env, userId, signHeader);
      if (!signatureValid) {
        suspicionReasons.push("签名异常：缺少或无效的消费签名（X-Consumption-Sign）");
      }
    } catch {
      suspicionReasons.push("签名异常：签名验证过程出错");
    }
  }

  // ── 3. Frequency anomaly detection ──
  if (db) {
    const freqAnomaly = await detectFrequencyAnomaly(db, userId);
    if (freqAnomaly) {
      suspicionReasons.push(freqAnomaly);
    }

    // ── 4. IP consistency detection ──
    const ipAnomaly = await detectIPInconsistency(db, userId, ip);
    if (ipAnomaly) {
      suspicionReasons.push(ipAnomaly);
    }
  }

  const suspicious = suspicionReasons.length > 0;

  // Determine if this should be hard-blocked.
  // - Source invalid alone (no Referer) → suspicious but NOT blocked (desktop apps, curl, etc.)
  // - Signature invalid → blocked (bypass attempt)
  // - Frequency anomaly → blocked (abuse)
  // - IP inconsistency → blocked (credential sharing/theft)
  const hardBlock = suspicionReasons.some(
    (r) => r.includes("签名异常") || r.includes("频率异常") || r.includes("IP异常")
  );
  const valid = !hardBlock; // valid=false means caller should 403

  // Log suspicious activity for audit trail
  if (suspicious) {
    structuredLog(hardBlock ? "error" : "warn", hardBlock ? "blocked_consumption" : "suspicious_consumption", {
      userId,
      ip,
      userAgent,
      reasons: suspicionReasons,
      sourceValid,
      signatureValid,
      hardBlock,
    });
  }

  return {
    valid,
    suspicious,
    hardBlock,
    suspicionReasons,
    ip,
    userAgent,
    sourceValid,
    signatureValid,
  };
}
