import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";

/**
 * GET /api/admin/settings — List all settings, optionally filtered by group.
 * PUT /api/admin/settings — Batch UPSERT settings.
 *
 * Both require `settings:manage` permission.
 * GET supports ?group=basic|params|logging filter.
 */

export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "settings:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const group = context.request.url
    ? new URL(context.request.url).searchParams.get("group")
    : null;

  try {
    let result: D1Result<Record<string, unknown>>;

    if (group) {
      result = await DB.prepare(
        `SELECT key, value, "group", updated_at FROM settings WHERE "group" = ? ORDER BY key ASC`
      )
        .bind(group)
        .all();
    } else {
      result = await DB.prepare(
        `SELECT key, value, "group", updated_at FROM settings ORDER BY "group" ASC, key ASC`
      ).all();
    }

    const settings = (result.results || []).map((row) => ({
      key: row.key as string,
      value: row.value as string,
      group: row.group as string,
      updatedAt: row.updated_at as string,
    }));

    return jsonResponse(settings);
  } catch {
    return serverError("数据库查询失败");
  }
};

export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "settings:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  // Parse request body
  let body: { settings?: Record<string, string> };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const settings = body.settings;
  if (!settings || typeof settings !== "object") {
    return badRequest("settings 必须为对象");
  }

  const keys = Object.keys(settings);
  if (keys.length === 0) {
    return badRequest("没有需要更新的设置项");
  }

  // Batch UPSERT: INSERT OR REPLACE for each key-value pair
  try {
    const statements: D1PreparedStatement[] = keys.map((key) =>
      DB.prepare(
        `INSERT INTO settings (key, value, "group", updated_at)
         VALUES (?, ?, COALESCE((SELECT "group" FROM settings WHERE key = ?), 'basic'), datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      )
        .bind(key, String(settings[key]), key)
    );

    await DB.batch(statements);
  } catch {
    return serverError("更新设置失败");
  }

  return jsonResponse(null, "设置已保存");
};
