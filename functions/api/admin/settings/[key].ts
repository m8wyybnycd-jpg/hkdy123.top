import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";

/**
 * GET /api/admin/settings/:key — Get a single setting item by key.
 *
 * Requires `settings:manage` permission.
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "settings:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const key = context.params.key;
  if (!key) {
    return badRequest("缺少设置项 key");
  }

  try {
    const row = await DB.prepare(
      `SELECT key, value, "group", updated_at FROM settings WHERE key = ?`
    )
      .bind(key)
      .first<Record<string, unknown>>();

    if (!row) {
      return notFound("设置项不存在");
    }

    return jsonResponse({
      key: row.key as string,
      value: row.value as string,
      group: row.group as string,
      updatedAt: row.updated_at as string,
    });
  } catch {
    return serverError("数据库查询失败");
  }
};
