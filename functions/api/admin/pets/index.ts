/**
 * GET  /api/admin/pets        — List all pets (paginated, filterable)
 * GET  /api/admin/pets/stats  — Pet system statistics overview
 *
 * All endpoints require `pet:view` permission.
 */

import { requirePermission } from "../../../lib/permission";
import { jsonResponse, serverError } from "../../../lib/response";

/** Map a D1 row to a pet DTO with user email. */
function toPetDTO(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.email ?? null,
    username: row.username ?? null,
    name: row.name,
    level: row.level,
    exp: row.exp,
    state: row.state,
    mood: row.mood,
    totalChats: row.total_chats,
    totalBrowses: row.total_browses,
    totalLikes: row.total_likes,
    hatchedAt: row.hatched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── GET: List all pets (paginated) ──
export const onRequestGet = async (context: PageContext): Promise<Response> => {
  const denied = await requirePermission(context, "pet:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const url = new URL(context.request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
    const offset = (page - 1) * pageSize;

    // Filters
    const level = url.searchParams.get("level"); // 1-5
    const search = url.searchParams.get("search"); // name or email
    const sortBy = url.searchParams.get("sortBy") || "created_at"; // created_at | level | total_chats | exp
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "ASC" : "DESC";

    // Build WHERE clause
    const conditions: string[] = [];
    const binds: (string | number)[] = [];

    if (level && level >= "1" && level <= "5") {
      conditions.push("p.level = ?");
      binds.push(parseInt(level, 10));
    }

    if (search) {
      conditions.push("(p.name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)");
      const pattern = `%${search}%`;
      binds.push(pattern, pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Validate sort column to prevent SQL injection
    const validSortColumns = ["created_at", "level", "total_chats", "exp", "total_browses", "total_likes", "updated_at"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "created_at";

    // Count total
    const countResult = await DB.prepare(
      `SELECT COUNT(*) as total
       FROM pets p
       LEFT JOIN users u ON p.user_id = u.id
       ${whereClause}`
    )
      .bind(...binds)
      .first<{ total: number }>();

    const total = countResult?.total || 0;

    // Fetch page
    const result = await DB.prepare(
      `SELECT p.*, u.email, u.username
       FROM pets p
       LEFT JOIN users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY p.${sortColumn} ${sortOrder}
       LIMIT ? OFFSET ?`
    )
      .bind(...binds, pageSize, offset)
      .all();

    const list = (result.results || []).map((row) =>
      toPetDTO(row as Record<string, unknown>)
    );

    return jsonResponse({
      items: list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("[admin/pets] List failed:", err);
    return serverError("宠物查询失败");
  }
};
