import {
  jsonResponse,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from "../../lib/response";

/**
 * PUT /api/messages/:id/read — 标记消息为已读。
 *
 * 需要登录。只有接收者本人可以标记（或全体消息任何人都可以标记）。
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const user = context.data.user;
  if (!user) {
    return unauthorized("请先登录");
  }

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const msgId = Number(context.params.id);
  if (!msgId || isNaN(msgId)) {
    return badRequest("无效的消息ID");
  }

  // 查询消息，验证当前用户有权操作
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare(
      "SELECT * FROM messages WHERE id = ?"
    )
      .bind(msgId)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!existing) {
    return notFound("消息不存在");
  }

  const recipientId = existing.recipient_id as number;
  // 只有接收者本人或全体消息(-1)可以标记已读
  if (recipientId !== -1 && recipientId !== user.userId) {
    return notFound("消息不存在");
  }

  // 如果已读，直接返回成功
  if (existing.is_read === 1) {
    return jsonResponse(null, "已读");
  }

  try {
    await DB.prepare(
      "UPDATE messages SET is_read = 1, read_at = datetime('now') WHERE id = ?"
    )
      .bind(msgId)
      .run();
  } catch {
    return serverError("标记已读失败");
  }

  return jsonResponse(null, "标记成功");
};
