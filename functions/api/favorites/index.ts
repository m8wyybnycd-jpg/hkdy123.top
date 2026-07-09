import { jsonResponse, unauthorized, badRequest, requireAuth } from "../../lib/response";

/**
 * GET /api/favorites — Get current user's favorites list (P2).
 * POST /api/favorites — Add a new favorite (P2).
 *
 * Skeleton implementation: returns empty list / success.
 * Full implementation will query/insert into the D1 `favorites` table.
 */

export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const user = requireAuth(context.data);
  if (!user) {
    return unauthorized();
  }

  // P2 skeleton: query favorites from D1
  const { DB } = context.env;
  if (DB) {
    try {
      const result = await DB.prepare(
        "SELECT id, item_type, item_id, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC"
      )
        .bind(user.userId)
        .all();
      return jsonResponse(result.results || []);
    } catch {
      // D1 not available — return empty list
    }
  }

  return jsonResponse([]);
};

export const onRequestPost = async (context: PageContext): Promise<Response> => {
  const user = requireAuth(context.data);
  if (!user) {
    return unauthorized();
  }

  let body: { itemType?: string; itemId?: string };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const itemType = body.itemType;
  const itemId = body.itemId;

  if (!itemType || !itemId) {
    return badRequest("缺少 itemType 或 itemId");
  }

  // P2 skeleton: insert into D1 favorites table
  const { DB } = context.env;
  if (DB) {
    try {
      await DB.prepare(
        "INSERT OR IGNORE INTO favorites (user_id, item_type, item_id) VALUES (?, ?, ?)"
      )
        .bind(user.userId, itemType, itemId)
        .run();
      return jsonResponse({ itemType, itemId }, "收藏成功");
    } catch {
      return badRequest("收藏失败");
    }
  }

  // D1 not available — return success anyway
  return jsonResponse({ itemType, itemId }, "收藏成功（本地模式）");
};
