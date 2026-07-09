import { jsonResponse, unauthorized, notFound, requireAuth } from "../../lib/response";

/**
 * DELETE /api/favorites/:id — Remove a favorite (P2).
 *
 * Skeleton implementation: returns success.
 * Full implementation will delete from the D1 `favorites` table.
 */
export const onRequestDelete = async (context: PageContext): Promise<Response> => {
  const user = requireAuth(context.data);
  if (!user) {
    return unauthorized();
  }

  const favoriteId = context.params.id;
  if (!favoriteId) {
    return notFound("收藏记录不存在");
  }

  const { DB } = context.env;
  if (DB) {
    try {
      await DB.prepare(
        "DELETE FROM favorites WHERE id = ? AND user_id = ?"
      )
        .bind(Number(favoriteId), user.userId)
        .run();
      return jsonResponse(null, "已取消收藏");
    } catch {
      return notFound("收藏记录不存在");
    }
  }

  // D1 not available — return success anyway
  return jsonResponse(null, "已取消收藏（本地模式）");
};
