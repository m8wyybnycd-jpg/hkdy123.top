/**
 * GET /api/admin/pets/[id]/memories — List memories for a pet
 *
 * Query params: page (default 1), pageSize (default 20)
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
    const url = new URL(context.request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
    const offset = (page - 1) * pageSize;

    // Verify pet exists
    const petExists = await DB.prepare(
      `SELECT id FROM pets WHERE id = ?`
    ).bind(petId).first();

    if (!petExists) return notFound("宠物不存在");

    // Count total
    const countResult = await DB.prepare(
      `SELECT COUNT(*) as total FROM pet_memories WHERE pet_id = ?`
    ).bind(petId).first<{ total: number }>();

    const total = countResult?.total || 0;

    // Fetch page (sorted by importance DESC, then created_at DESC)
    const result = await DB.prepare(
      `SELECT id, memory_type, content, importance, created_at, updated_at
       FROM pet_memories
       WHERE pet_id = ?
       ORDER BY importance DESC, created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(petId, pageSize, offset)
      .all();

    const items = (result.results || []).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id,
        memoryType: r.memory_type,
        content: r.content,
        importance: r.importance,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    return jsonResponse({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("[admin/pets/[id]/memories] Failed:", err);
    return serverError("记忆查询失败");
  }
};
