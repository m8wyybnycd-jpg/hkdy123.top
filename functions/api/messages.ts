import {
  jsonResponse,
  unauthorized,
  serverError,
} from "../lib/response";

/**
 * GET /api/messages — 用户查看自己的消息。
 *
 * 返回 recipient_id = userId 或 recipient_id = -1（全体）的消息。
 * 需要登录。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const user = context.data.user;
  if (!user) {
    return unauthorized("请先登录");
  }

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const result = await DB.prepare(
      `SELECT * FROM messages
       WHERE recipient_id = ? OR recipient_id = -1
       ORDER BY created_at DESC`
    )
      .bind(user.userId)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map((row) => ({
      id: row.id as number,
      senderId: row.sender_id as number,
      recipientId: row.recipient_id as number,
      title: row.title as string,
      content: row.content as string,
      isRead: row.is_read as number,
      readAt: row.read_at as string | null,
      createdAt: row.created_at as string,
    }));

    return jsonResponse(list);
  } catch {
    return serverError("数据库查询失败");
  }
};
