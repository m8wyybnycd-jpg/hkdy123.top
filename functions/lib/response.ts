/**
 * Unified API response utilities.
 *
 * All API endpoints return a JSON envelope:
 * { code: number, data: T | null, message: string }
 */

/** Success response (code 0, HTTP 200). */
export function jsonResponse<T>(
  data: T,
  message: string = "success",
  code: number = 0,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({ code, data, message }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/** Error response with custom code and message. */
export function errorResponse(
  code: number,
  message: string,
  status: number = 400
): Response {
  return jsonResponse(null, message, code, status);
}

/** 400 Bad Request. */
export function badRequest(message: string): Response {
  return errorResponse(400, message, 400);
}

/** 401 Unauthorized. */
export function unauthorized(message: string = "未授权"): Response {
  return errorResponse(401, message, 401);
}

/** 403 Forbidden. */
export function forbidden(message: string = "无权访问"): Response {
  return errorResponse(403, message, 403);
}

/** 404 Not Found. */
export function notFound(message: string = "资源不存在"): Response {
  return errorResponse(404, message, 404);
}

/** 409 Conflict. */
export function conflict(message: string): Response {
  return errorResponse(409, message, 409);
}

/** 429 Too Many Requests. */
export function tooManyRequests(message: string = "请求过于频繁，请稍后再试"): Response {
  return errorResponse(429, message, 429);
}

/** 500 Internal Server Error. */
export function serverError(message: string = "服务器内部错误"): Response {
  return errorResponse(500, message, 500);
}

/** Check if the request is authenticated (user injected by middleware). */
export function requireAuth(
  data: PageData
): { userId: number; email: string; username: string; isAdmin: boolean } | null {
  return data.user ?? null;
}
