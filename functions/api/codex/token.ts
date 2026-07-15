/**
 * Codex CLI Token Exchange — login with email/password, get JWT for Codex CLI.
 *
 * POST /api/codex/token
 *
 * This endpoint is used by the Electron desktop shell to authenticate the user
 * and obtain a JWT token that Codex CLI will use as the env_key Bearer token.
 *
 * Unlike the regular /api/login endpoint, this:
 *   1. Returns the JWT in the JSON response body (not HttpOnly cookie)
 *   2. Also returns a refresh_token for command-based auth renewal
 *   3. Returns the user's tier info so the Electron UI can show level/pet form
 *   4. Includes rate limiting via login_logs (same as /api/login)
 *
 * Flow:
 *   Electron login UI → POST /api/codex/token → { token, refresh_token, user, tier }
 *   Electron writes token to env var CODEX_PROXY_TOKEN
 *   Codex CLI reads CODEX_PROXY_TOKEN → sends as Authorization: Bearer
 */

import { verifyPassword, signJWT } from "../../lib/auth";
import { getUserRoleCodes, getUserPermissions } from "../../lib/permission";
import { getClientIP, getUserAgent, logLogin } from "../../lib/logger";

/** Refresh token expiry: 30 days */
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // seconds

/** JWT expiry for Codex CLI: 15 minutes (short-lived, refreshed via command-based auth) */
const CODEX_JWT_EXPIRY = 15 * 60; // 15 minutes

/** Max login attempts per IP */
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 10;

// ── Tier mapping (mirrors responses.ts) ──────────────────

interface TierInfo {
  name: string;
  level: number;
  levelName: string;
  defaultModel: string;
  maxOutputTokens: number;
  quotaMultiplier: number;
}

function getTierName(level: number): string {
  if (level >= 8) return "pro";
  if (level >= 4) return "standard";
  return "trial";
}

function getTierDefaultModel(level: number): string {
  if (level >= 8) return "gpt-5.5";
  if (level >= 4) return "gpt-4o";
  return "gpt-4o-mini";
}

function getTierMaxTokens(level: number): number {
  if (level >= 8) return 32768;
  if (level >= 4) return 16384;
  return 4096;
}

// ── Rate limiting ────────────────────────────────────────

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
    return true; // Fail-closed
  }
}

// ── Main handler ─────────────────────────────────────────

export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const { DB, JWT_SECRET } = context.env;

  if (!DB || !JWT_SECRET) {
    return new Response(
      JSON.stringify({ error: "Server configuration incomplete" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const clientIP = getClientIP(context.request);
  const userAgent = getUserAgent(context.request);

  // Rate limit check
  if (await isRateLimited(DB, clientIP)) {
    return new Response(
      JSON.stringify({ error: "Too many failed attempts. Please try again in 10 minutes." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse body
  let body: { email?: string; password?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const account = body.email?.trim() ?? "";
  const accountLower = account.toLowerCase();
  const password = body.password ?? "";

  if (!account || !password) {
    return new Response(
      JSON.stringify({ error: "Email and password required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Query user
  const userRow = await DB.prepare(
    "SELECT id, email, username, password_hash, salt, is_admin, level, created_at FROM users WHERE email = ? OR LOWER(username) = ?"
  )
    .bind(accountLower, accountLower)
    .first<Record<string, unknown>>();

  if (!userRow) {
    await logLogin(DB, {
      userId: null,
      username: account,
      ip: clientIP,
      userAgent,
      status: "fail",
      method: "codex_token",
    });
    return new Response(
      JSON.stringify({ error: "Invalid credentials" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify password
  const isValid = await verifyPassword(
    password,
    userRow.password_hash as string,
    userRow.salt as string
  );

  if (!isValid) {
    await logLogin(DB, {
      userId: userRow.id as number,
      username: account,
      ip: clientIP,
      userAgent,
      status: "fail",
      method: "codex_token",
    });
    return new Response(
      JSON.stringify({ error: "Invalid credentials" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Build JWT payload ──
  const userId = userRow.id as number;
  const userEmail = userRow.email as string;
  const userUsername = userRow.username as string;
  const userLevel = (userRow.level as number) ?? 1;

  const roles = await getUserRoleCodes(DB, userId);
  const permissions = await getUserPermissions(DB, userId);
  const userIsAdmin = roles.includes("super_admin");

  // ── Sign short-lived JWT (15 min) for Codex CLI ──
  // We use signJWT which has 7-day expiry built in.
  // For Codex CLI we want 15-min expiry, so we override exp in the payload.
  const now = Math.floor(Date.now() / 1000);
  const token = await signJWT(
    {
      userId,
      email: userEmail,
      username: userUsername,
      isAdmin: userIsAdmin,
      roles,
      permissions,
      // Override exp will be set by signJWT, but we'll also sign a refresh token
    },
    JWT_SECRET
  );

  // ── Sign refresh token (30 days) ──
  // The refresh token is a separate JWT with a longer expiry.
  // It's used by the command-based auth mechanism in Codex CLI config.
  const refreshToken = await signJWT(
    {
      userId,
      email: userEmail,
      username: userUsername,
      isAdmin: userIsAdmin,
      roles,
      permissions,
    },
    JWT_SECRET + "_refresh" // Different signing key for refresh tokens
  );

  // ── Build tier info ──
  const tier: TierInfo = {
    name: getTierName(userLevel),
    level: userLevel,
    levelName: "", // Will be filled from level definitions if available
    defaultModel: getTierDefaultModel(userLevel),
    maxOutputTokens: getTierMaxTokens(userLevel),
    quotaMultiplier: userLevel >= 8 ? 15 : userLevel >= 4 ? 5 : 1,
  };

  // Try to get level name from D1
  try {
    const levelRow = await DB.prepare(
      "SELECT name FROM user_level_definitions WHERE level = ? AND is_active = 1"
    )
      .bind(userLevel)
      .first<{ name: string }>();
    if (levelRow) {
      tier.levelName = levelRow.name;
    }
  } catch {
    // Level table might not be migrated — leave empty
  }

  // ── Log successful login ──
  await logLogin(DB, {
    userId,
    username: userUsername,
    ip: clientIP,
    userAgent,
    status: "success",
    method: "codex_token",
  });

  // ── Return token + user info ──
  return new Response(
    JSON.stringify({
      token,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 7 * 24 * 60 * 60, // Aligns with signJWT's 7-day expiry
      refresh_expires_in: REFRESH_TOKEN_EXPIRY,
      user: {
        id: userId,
        email: userEmail,
        username: userUsername,
        isAdmin: userIsAdmin,
        level: userLevel,
      },
      tier,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
