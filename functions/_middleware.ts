import { verifyJWTAny, getJWTSecrets } from "./lib/auth";
import { isTokenRevoked } from "./lib/revocation";

/**
 * Apply defense-in-depth security response headers to every response.
 * Covers HSTS, MIME sniffing protection, referrer leakage, and
 * clickjacking protection. Safe for both API JSON responses and
 * static / SPA assets.
 */
function applySecurityHeaders(res: Response): void {
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
}

/**
 * Allowed origins for CORS. Only these domains can make authenticated
 * cross-origin requests to the API.
 */
const ALLOWED_ORIGINS = [
  "https://www.hkdy123.top",
  "https://hkdy123.top",
  "http://localhost:5173",
  "http://localhost:4173",
];

/**
 * Get the CORS Origin header value for a request, or null if not allowed.
 */
function getAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return null;
}

/**
 * Extract the JWT token from the request.
 * Priority: HttpOnly Cookie (primary) → Authorization header (backward compat).
 *
 * Supports both __Host-auth_token (new) and auth_token (legacy) cookie names
 * for smooth migration.
 */
function extractToken(request: Request): string | null {
  // 1. Try Cookie header (HttpOnly cookie — primary auth method)
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    // Check new __Host- prefixed cookie first
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.split("=");
      if (name.trim() === "__Host-auth_token" && valueParts.length > 0) {
        return valueParts.join("=");
      }
    }
    // Fallback to legacy cookie name
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.split("=");
      if (name.trim() === "auth_token" && valueParts.length > 0) {
        return valueParts.join("=");
      }
    }
  }

  // 2. Fall back to Authorization header (for API clients, backward compat)
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Global middleware for all Pages Functions.
 *
 * Responsibilities:
 * 1. Handle CORS preflight (OPTIONS) requests with strict origin whitelist.
 * 2. Parse JWT from HttpOnly Cookie (or Authorization header fallback) and inject user info into context.data.
 * 3. Check JWT revocation blacklist (KV) to reject logged-out tokens.
 * 4. Add CORS headers (including Allow-Credentials) to all responses.
 */
export const onRequest = async (context: PageContext): Promise<Response> => {
  const allowedOrigin = getAllowedOrigin(context.request);

  // Handle CORS preflight
  if (context.request.method === "OPTIONS") {
    if (!allowedOrigin) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Vary": "Origin",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Parse JWT from Cookie (primary) or Authorization header (fallback)
  const token = extractToken(context.request);
  if (token) {
    try {
      const secrets = getJWTSecrets(context.env);
      if (secrets.length === 0) {
        throw new Error("JWT_SECRET is not configured");
      }
      const user = await verifyJWTAny(token, secrets);

      // Check revocation blacklist (if KV is configured)
      if (user.jti && context.env.TOKEN_BLACKLIST) {
        const revoked = await isTokenRevoked(context.env.TOKEN_BLACKLIST, user.jti, true);
        if (revoked) {
          // Token has been revoked — treat as unauthenticated
          // Don't set context.data.user, let handlers return 401
        } else {
          context.data.user = user;
        }
      } else {
        // KV not configured or no jti (legacy token) — allow through
        context.data.user = user;
      }
    } catch {
      // Token invalid or expired — continue without user; individual handlers
      // will return 401 if auth is required.
    }
  }

  const response = await context.next();

  // Add CORS headers to the response (only for allowed origins)
  const corsResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  if (allowedOrigin) {
    corsResponse.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    corsResponse.headers.set("Vary", "Origin");
    corsResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    corsResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    corsResponse.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Defense-in-depth: security headers on every response
  applySecurityHeaders(corsResponse);

  return corsResponse;
};
