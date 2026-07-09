import { requirePermission } from "../../lib/permission";
import { jsonResponse, serverError } from "../../lib/response";

/**
 * GET /api/admin/permissions — List all permissions ordered by sort_order.
 *
 * Requires `role:manage` permission.
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "role:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const result = await DB.prepare(
      "SELECT id, code, name, module, action, sort_order FROM permissions ORDER BY sort_order ASC"
    ).all<Record<string, unknown>>();

    const permissions = (result.results || []).map((row) => ({
      id: row.id as number,
      code: row.code as string,
      name: row.name as string,
      module: row.module as string,
      action: row.action as string,
      sortOrder: row.sort_order as number,
    }));

    return jsonResponse(permissions);
  } catch {
    return serverError("数据库查询失败");
  }
};
