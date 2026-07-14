/**
 * GET /api/admin/pets/[id] — Get a single pet's full detail
 *
 * Requires `pet:view` permission.
 */

import { requirePermission } from "../../../../lib/permission";
import { jsonResponse, serverError, notFound } from "../../../../lib/response";

export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const denied = await requirePermission(context, "pet:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const petId = context.params.id;
  if (!petId) return notFound("宠物不存在");

  try {
    const row = await DB.prepare(
      `SELECT p.*, u.email, u.username
       FROM pets p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`
    )
      .bind(petId)
      .first();

    if (!row) return notFound("宠物不存在");

    const r = row as Record<string, unknown>;

    return jsonResponse({
      id: r.id,
      userId: r.user_id,
      userEmail: r.email,
      username: r.username,
      name: r.name,
      level: r.level,
      exp: r.exp,
      state: r.state,
      mood: r.mood,
      totalChats: r.total_chats,
      totalBrowses: r.total_browses,
      totalLikes: r.total_likes,
      hatchedAt: r.hatched_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  } catch (err) {
    console.error("[admin/pets/[id]] Get failed:", err);
    return serverError("查询失败");
  }
};
