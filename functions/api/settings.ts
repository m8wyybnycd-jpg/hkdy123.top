import { jsonResponse, serverError } from "../lib/response";

/**
 * GET /api/settings
 *
 * Returns public-facing settings (basic group only).
 * No authentication required — safe to expose site_name, logo_url, etc.
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const result = await DB.prepare(
      `SELECT key, value FROM settings WHERE "group" = 'basic' OR key IN ('registration_enabled', 'password_min_length') ORDER BY key ASC`
    ).all();

    const map: Record<string, string> = {};
    for (const row of result.results || []) {
      map[row.key as string] = row.value as string;
    }

    const response = jsonResponse(map);
    // Cache public settings for 5 minutes at CDN
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    return response;
  } catch {
    // Fallback to sensible defaults if DB is unavailable
    return jsonResponse({
      site_name: "云玩汇",
      site_description: "云游戏/云电脑入口聚合平台",
      logo_url: "",
      icp_number: "",
      contact_email: "",
      contact_qq: "",
      contact_wechat: "",
      registration_enabled: "true",
      password_min_length: "8",
    });
  }
};
