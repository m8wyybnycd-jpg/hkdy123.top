import { requirePermission } from "../../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../../lib/response";
import { logOperation, getClientIP } from "../../../../lib/logger";

/**
 * PATCH /api/admin/banners/:id/toggle — 快速切换启用/禁用。
 * 需要 banner:write 权限。
 *
 * 将 is_active 在 0 ↔ 1 之间切换，并返回更新后的数据。
 */
export const onRequestPatch = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "banner:write");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) {
    return badRequest("无效的 ID");
  }

  const userId = context.data.user?.userId ?? null;

  try {
    // 查询当前状态
    const row = await DB.prepare(
      "SELECT id, is_active FROM banners WHERE id = ?"
    )
      .bind(id)
      .first<{ id: number; is_active: number }>();

    if (!row) {
      return notFound("轮播图不存在");
    }

    const newActive = row.is_active === 1 ? 0 : 1;

    await DB.prepare(
      `UPDATE banners SET is_active = ?, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(newActive, id)
      .run();

    // 记录操作日志
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "toggle",
      module: "banner",
      target: String(id),
      ip: getClientIP(context.request),
      detail: { from: row.is_active, to: newActive },
    });

    return jsonResponse(
      { id, isActive: newActive },
      newActive === 1 ? "已启用" : "已禁用"
    );
  } catch {
    return serverError("切换状态失败");
  }
};
