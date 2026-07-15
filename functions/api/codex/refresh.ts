/**
 * Codex CLI Token Refresh — renew expired JWT using refresh token.
 *
 * POST /api/codex/refresh
 *
 * Used by Codex CLI's command-based auth mechanism. The Electron shell
 * provides a script that calls this endpoint with the refresh_token to
 * get a new short-lived JWT. Codex CLI calls this script every 5 minutes
 * (configurable via refresh_interval_ms in config.toml).
 *
 * Flow:
 *   Codex CLI → calls auth.command → script hits POST /api/codex/refresh
 *   → returns new JWT to stdout → Codex CLI uses it as Bearer token
 *
 * Request body:
 *   { "refresh_token": "eyJ..." }
 *
 * Response:
 *   { "token": "eyJ...", "expires_in": 604800 }
 */

import { verifyJWTAny, verifyJWT, getJWTSecrets, signJWT, JWTPayload } from "../../lib/auth";
import { isTokenRevoked } from "../../lib/revocation";
import { getUserRoleCodes, getUserPermissions } from "../../lib/permission";

export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const { DB, JWT_SECRET } = context.env;

  if (!DB || !JWT_SECRET) {
    return new Response(
      JSON.stringify({ error: "Server configuration incomplete" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse body
  let body: { refresh_token?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const refreshToken = body.refresh_token;
  if (!refreshToken) {
    return new Response(
      JSON.stringify({ error: "refresh_token required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify refresh token (signed with different key: JWT_SECRET + "_refresh")
  let payload: JWTPayload;
  try {
    payload = await verifyJWT(refreshToken, JWT_SECRET + "_refresh");
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid or expired refresh token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if refresh token's JWT is revoked
  const kvConfigured = !!context.env.TOKEN_BLACKLIST;
  if (payload.jti) {
    const revoked = await isTokenRevoked(
      context.env.TOKEN_BLACKLIST!,
      payload.jti,
      kvConfigured
    );
    if (revoked) {
      return new Response(
        JSON.stringify({ error: "Token has been revoked" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ── Verify user still exists and is active ──
  const userRow = await DB.prepare(
    "SELECT id, email, username, is_admin, level FROM users WHERE id = ?"
  )
    .bind(payload.userId)
    .first<Record<string, unknown>>();

  if (!userRow) {
    return new Response(
      JSON.stringify({ error: "User not found" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Re-query roles/permissions (they may have changed since last token) ──
  const userId = userRow.id as number;
  const roles = await getUserRoleCodes(DB, userId);
  const permissions = await getUserPermissions(DB, userId);
  const userIsAdmin = roles.includes("super_admin");

  // ── Sign new JWT ──
  const newToken = await signJWT(
    {
      userId,
      email: userRow.email as string,
      username: userRow.username as string,
      isAdmin: userIsAdmin,
      roles,
      permissions,
    },
    JWT_SECRET
  );

  return new Response(
    JSON.stringify({
      token: newToken,
      token_type: "Bearer",
      expires_in: 7 * 24 * 60 * 60, // 7 days (aligns with signJWT)
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
