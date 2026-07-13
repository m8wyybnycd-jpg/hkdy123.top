import { jsonResponse, serverError } from "../lib/response";

/**
 * 将 D1 行（snake_case）映射为 PageConfig 对象（camelCase）。
 * is_enabled 在数据库中为 INTEGER (0/1)，映射为 boolean。
 */
function mapPageConfigRow(row: Record<string, unknown>) {
  return {
    page_key: row.page_key as string,
    page_name: row.page_name as string,
    title: (row.title as string) ?? "",
    subtitle: (row.subtitle as string) ?? "",
    description: (row.description as string) ?? "",
    is_enabled: row.is_enabled === 1,
    params: (row.params as string) ?? "{}",
    sort_order: row.sort_order as number,
    updated_at: row.updated_at as string,
    updated_by: (row.updated_by as number | null) ?? null,
  };
}

/**
 * GET /api/page-configs — 前台公开接口。
 *
 * 返回全部页面配置（含已禁用），按 sort_order ASC 排序。
 * 无需认证，用于前台导航与页面 Hero 区域渲染。
 * 前端依据 is_enabled 决定是否在导航展示、以及是否显示「页面已停用」提示。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const result = await DB.prepare(
      `SELECT page_key, page_name, title, subtitle, description,
              is_enabled, params, sort_order, updated_at, updated_by
       FROM page_configs
       ORDER BY sort_order ASC`
    ).all<Record<string, unknown>>();

    const list = (result.results || []).map(mapPageConfigRow);

    return jsonResponse(list);
  } catch {
    return serverError("数据库查询失败");
  }
};
