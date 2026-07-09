import { jsonResponse } from "../lib/response";

/**
 * POST /api/logout
 *
 * Clears the auth_token HttpOnly cookie to log the user out.
 * Returns success regardless of whether the user was authenticated.
 */
export const onRequestPost = async (context: PageContext): Promise<Response> => {
  // Clear the auth cookie by setting Max-Age=0
  const cookieValue = "auth_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";

  const response = jsonResponse(null, "已登出");
  response.headers.set("Set-Cookie", cookieValue);
  return response;
};
