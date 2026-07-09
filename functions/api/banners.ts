import { jsonResponse, serverError } from "../lib/response";

/**
 * 将 D1 行（snake_case）映射为 Banner 对象（camelCase）。
 */
function mapBannerRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    title: row.title as string,
    imageUrl: row.image_url as string,
    linkUrl: (row.link_url as string) ?? "",
    sortOrder: row.sort_order as number,
    isActive: row.is_active as number,
    startTime: (row.start_time as string) ?? null,
    endTime: (row.end_time as string) ?? null,
    description: (row.description as string) ?? "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * GET /api/banners — 前台公开接口。
 *
 * 返回当前生效的轮播图：
 * - is_active = 1
 * - 时段过滤：start_time 为空或 ≤ 当前时间，end_time 为空或 ≥ 当前时间
 * - 按 sort_order ASC 排序
 *
 * 无需认证。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const now = new Date().toISOString();

    const result = await DB.prepare(
      `SELECT id, title, image_url, link_url, sort_order, is_active,
              start_time, end_time, description, created_at, updated_at
       FROM banners
       WHERE is_active = 1
         AND (start_time IS NULL OR start_time <= ?)
         AND (end_time IS NULL OR end_time >= ?)
       ORDER BY sort_order ASC, id ASC`
    )
      .bind(now, now)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map(mapBannerRow);

    return jsonResponse(list);
  } catch {
    return serverError("数据库查询失败");
  }
};
