import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { logOperation, getClientIP } from "../../../lib/logger";

/**
 * DELETE /api/admin/messages/:id — 删除消息。
 *
 * 需要 message:manage 权限。
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "message:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const msgId = Number(context.params.id);
  if (!msgId || isNaN(msgId)) {
    return badRequest("无效的消息ID");
  }

  // 查询现有消息
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare("SELECT * FROM messages WHERE id = ?")
      .bind(msgId)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!existing) {
    return notFound("消息不存在");
  }

  try {
    await DB.prepare("DELETE FROM messages WHERE id = ?")
      .bind(msgId)
      .run();
  } catch {
    return serverError("删除消息失败");
  }

  // 记录操作日志
  await logOperation(DB, {
    userId: context.data.user?.userId ?? null,
    username: context.data.user?.username ?? null,
    action: "delete",
    module: "message",
    target: String(msgId),
    ip: getClientIP(context.request),
    detail: { title: existing.title },
  });

  return jsonResponse(null, "删除成功");
};
