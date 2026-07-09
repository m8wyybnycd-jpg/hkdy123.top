import { jsonResponse, serverError } from "../lib/response";

/**
 * GET /api/announcements — 前台公开接口。
 *
 * 只返回 status=1（已发布）的公告，按 sort_order DESC, published_at DESC 排序。
 * 无需认证。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const result = await DB.prepare(
      `SELECT id, title, content, type, sort_order, published_at, updated_at
       FROM announcements
       WHERE status = 1
       ORDER BY sort_order DESC, published_at DESC`
    ).all<Record<string, unknown>>();

    const list = (result.results || []).map((row) => ({
      id: row.id as number,
      title: row.title as string,
      content: row.content as string,
      type: row.type as string,
      sortOrder: row.sort_order as number,
      publishedAt: row.published_at as string | null,
      updatedAt: row.updated_at as string,
    }));

    return jsonResponse(list);
  } catch {
    return serverError("数据库查询失败");
  }
};
