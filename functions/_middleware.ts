import { verifyJWT } from "./lib/auth";

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
 */
function extractToken(request: Request): string | null {
  // 1. Try Cookie header (HttpOnly cookie — primary auth method)
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
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
 * 3. Add CORS headers (including Allow-Credentials) to all responses.
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
      const secret = context.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET is not configured");
      }
      const user = await verifyJWT(token, secret);
      context.data.user = user;
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

  return corsResponse;
};
