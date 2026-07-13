import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";
import { requirePermission } from "../../lib/permission";
import { logOperation, getClientIP } from "../../lib/logger";

/**
 * PATCH /admin/banners/sort — 批量更新轮播图排序。
 *
 * 需要 banner:write 权限。
 * 接收 { items: [{ id: 1, sortOrder: 0 }, ...] }
 * 在一个 D1 批处理中执行所有 UPDATE。
 */
export const onRequestPatch = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const body = await context.request.json<Record<string, unknown>>();
    const items = body.items as Array<{ id: number; sortOrder: number }>;

    if (!Array.isArray(items) || items.length === 0) {
      return badRequest("items 必须为非空数组");
    }

    // Validate each item
    for (const item of items) {
      if (!item.id || item.sortOrder === undefined) {
        return badRequest("每个 item 必须包含 id 和 sortOrder");
      }
    }

    // Build batch statements
    const statements = items.map((item) =>
      DB.prepare(
        `UPDATE banners SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(item.sortOrder, item.id)
    );

    // Execute as a batch (D1 batch is atomic-ish)
    await DB.batch(statements);

    // Log the operation
    const user = context.data.user!;
    await logOperation(DB, {
      userId: user.userId,
      username: user.username,
      action: "sort",
      module: "banner",
      ip: getClientIP(context.request),
      detail: items,
    });

    return jsonResponse({ updated: items.length }, "排序更新成功");
  } catch {
    return serverError("批量排序更新失败");
  }
};

/**
 * Handle unsupported methods.
 */
export const onRequest = async (context: PageContext): Promise<Response> => {
  const method = context.request.method;
  if (method === "PATCH") {
    return context.next();
  }
  return new Response(
    JSON.stringify({ code: 405, data: null, message: `不支持的请求方法: ${method}` }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
};
