import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../../lib/response";
import { logOperation, getClientIP } from "../../../lib/logger";

/**
 * PATCH /api/admin/banners/sort — 批量更新排序。
 * 需要 banner:write 权限。
 *
 * 请求体：{ items: [{ id: number, sortOrder: number }, ...] }
 * 逐条更新 sort_order 字段，并记录操作日志。
 */
export const onRequestPatch = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  let body: { items?: { id: number; sortOrder: number }[] };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return badRequest("排序数据不能为空");
  }

  // 校验每项
  for (const item of items) {
    if (typeof item.id !== "number" || typeof item.sortOrder !== "number") {
      return badRequest("排序数据格式无效");
    }
  }

  const userId = context.data.user?.userId ?? null;

  try {
    // 逐条更新（D1 不支持批量 CASE WHEN 绑定，逐条更新更安全）
    for (const item of items) {
      await DB.prepare(
        `UPDATE banners SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`
      )
        .bind(item.sortOrder, item.id)
        .run();
    }

    // 记录操作日志
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "sort",
      module: "banner",
      target: items.map((i) => i.id).join(","),
      ip: getClientIP(context.request),
      detail: { count: items.length, items },
    });

    return jsonResponse(null, "排序更新成功");
  } catch {
    return serverError("排序更新失败");
  }
};
