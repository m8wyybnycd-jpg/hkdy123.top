import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { requirePermission } from "../../../lib/permission";
import { logOperation, getClientIP } from "../../../lib/logger";

/**
 * PATCH /admin/banners/:id/toggle — 快速切换轮播图启用/禁用状态。
 *
 * 需要 banner:write 权限。
 * 接收 { isActive: 0 | 1 }
 */
export const onRequestPatch = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = Number(context.params.id);
  if (!id) return badRequest("无效的 ID");

  try {
    const body = await context.request.json<Record<string, unknown>>();
    const isActive = body.isActive as number;

    if (isActive !== 0 && isActive !== 1) {
      return badRequest("isActive 必须为 0 或 1");
    }

    const row = await DB.prepare(
      `UPDATE banners SET is_active = ?, updated_at = datetime('now')
       WHERE id = ?
       RETURNING id, title, image_url, link_url, sort_order, is_active,
                 start_time, end_time, description, created_at, updated_at`
    )
      .bind(isActive, id)
      .first<Record<string, unknown>>();

    if (!row) return notFound("轮播图不存在");

    // Log the operation
    const user = context.data.user!;
    await logOperation(DB, {
      userId: user.userId,
      username: user.username,
      action: "toggle",
      module: "banner",
      target: String(id),
      ip: getClientIP(context.request),
      detail: { isActive },
    });

    return jsonResponse({
      id: row.id as number,
      isActive: row.is_active as number,
    });
  } catch {
    return serverError("切换状态失败");
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
