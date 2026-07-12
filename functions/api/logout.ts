import { jsonResponse } from "../lib/response";
import { verifyJWTAny, getJWTSecrets } from "../lib/auth";
import { revokeToken } from "../lib/revocation";
import { getClientIP } from "../lib/logger";

/**
 * Extract auth_token from Cookie header.
 */
function getTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");
    if (name.trim() === "__Host-auth_token" && valueParts.length > 0) {
      return valueParts.join("=");
    }
  }
  // Fallback: check old cookie name for backward compat during migration
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");
    if (name.trim() === "auth_token" && valueParts.length > 0) {
      return valueParts.join("=");
    }
  }
  return null;
}

/**
 * POST /api/logout
 *
 * 1. Verifies the JWT and extracts the `jti` claim.
 * 2. Stores `jti` in the KV blacklist with TTL = remaining token lifetime.
 * 3. Clears the __Host-auth_token HttpOnly cookie.
 *
 * If KV is unavailable or the token is already expired, the cookie is still
 * cleared — logout always succeeds from the user's perspective.
 */
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const token = getTokenFromCookie(context.request);

  // Attempt to revoke the token in KV (best-effort)
  if (token) {
    try {
      const secrets = getJWTSecrets(context.env);
      if (secrets.length > 0) {
        const payload = await verifyJWTAny(token, secrets);
        if (payload.jti && context.env.TOKEN_BLACKLIST) {
          const exp = Math.floor((payload as unknown as { exp: number }).exp);
          await revokeToken(
            context.env.TOKEN_BLACKLIST,
            payload.jti,
            exp,
            payload.userId
          );
        }
      }
    } catch {
      // Token is invalid or expired — nothing to revoke, just clear the cookie
    }
  }

  // Structured log for audit
  console.log(JSON.stringify({
    level: "info",
    message: "user_logout",
    timestamp: new Date().toISOString(),
    ip: getClientIP(context.request),
  }));

  // Clear the auth cookie — use __Host- prefix for maximum security.
  // __Host- prefix requires: Secure, Path=/, no Domain attribute.
  const cookieValue = "__Host-auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";

  const response = jsonResponse(null, "已登出");
  response.headers.set("Set-Cookie", cookieValue);
  return response;
};
