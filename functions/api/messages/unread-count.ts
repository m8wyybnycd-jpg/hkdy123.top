import {
  jsonResponse,
  unauthorized,
  serverError,
} from "../../lib/response";

/**
 * GET /api/messages/unread-count — 获取当前用户未读消息数量。
 *
 * 需要登录。返回 recipient_id = userId 或 recipient_id = -1 且未读的消息数。
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
    const row = await DB.prepare(
      `SELECT COUNT(*) as count FROM messages
       WHERE (recipient_id = ? OR recipient_id = -1) AND is_read = 0`
    )
      .bind(user.userId)
      .first<{ count: number }>();

    const count = row?.count ?? 0;

    return jsonResponse({ count });
  } catch {
    return serverError("数据库查询失败");
  }
};
