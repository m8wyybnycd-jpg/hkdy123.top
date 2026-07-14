/**
 * GET /api/admin/pets/stats — Pet system statistics overview
 *
 * Returns aggregate stats: total pets, level distribution, total chats,
 * active users (24h/7d), top pets by exp.
 *
 * Requires `pet:view` permission.
 */

import { requirePermission } from "../../../lib/permission";
import { jsonResponse, serverError } from "../../../lib/response";

export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const denied = await requirePermission(context, "pet:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    // Total pets
    const totalResult = await DB.prepare(
      `SELECT COUNT(*) as total FROM pets`
    ).first<{ total: number }>();

    // Level distribution
    const levelResult = await DB.prepare(
      `SELECT level, COUNT(*) as count FROM pets GROUP BY level ORDER BY level`
    ).all();
    const levelDistribution: Record<number, number> = {};
    for (const row of levelResult.results) {
      const r = row as Record<string, unknown>;
      levelDistribution[r.level as number] = r.count as number;
    }

    // Total chats across all pets
    const chatsResult = await DB.prepare(
      `SELECT COALESCE(SUM(total_chats), 0) as total_chats,
              COALESCE(SUM(total_browses), 0) as total_browses,
              COALESCE(SUM(total_likes), 0) as total_likes
       FROM pets`
    ).first<{ total_chats: number; total_browses: number; total_likes: number }>();

    // Active in last 24h (pets updated within 24h)
    const active24h = await DB.prepare(
      `SELECT COUNT(*) as count FROM pets WHERE updated_at > datetime('now', '-1 day')`
    ).first<{ count: number }>();

    // Active in last 7d
    const active7d = await DB.prepare(
      `SELECT COUNT(*) as count FROM pets WHERE updated_at > datetime('now', '-7 days')`
    ).first<{ count: number }>();

    // Top 5 pets by exp
    const topResult = await DB.prepare(
      `SELECT p.id, p.name, p.level, p.exp, p.total_chats, u.email, u.username
       FROM pets p
       LEFT JOIN users u ON p.user_id = u.id
       ORDER BY p.exp DESC
       LIMIT 5`
    ).all();
    const topPets = topResult.results.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id,
        name: r.name,
        level: r.level,
        exp: r.exp,
        totalChats: r.total_chats,
        email: r.email,
        username: r.username,
      };
    });

    // Total memories
    const memoryResult = await DB.prepare(
      `SELECT COUNT(*) as total FROM pet_memories`
    ).first<{ total: number }>();

    // Total conversations
    const convResult = await DB.prepare(
      `SELECT COUNT(*) as total FROM pet_conversations`
    ).first<{ total: number }>();

    return jsonResponse({
      totalPets: totalResult?.total || 0,
      levelDistribution,
      totalChats: chatsResult?.total_chats || 0,
      totalBrowses: chatsResult?.total_browses || 0,
      totalLikes: chatsResult?.total_likes || 0,
      active24h: active24h?.count || 0,
      active7d: active7d?.count || 0,
      totalMemories: memoryResult?.total || 0,
      totalConversations: convResult?.total || 0,
      topPets,
    });
  } catch (err) {
    console.error("[admin/pets/stats] Failed:", err);
    return serverError("统计数据查询失败");
  }
};
