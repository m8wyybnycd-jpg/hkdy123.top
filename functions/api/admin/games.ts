import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";
import { requirePermission } from "../../lib/permission";

/**
 * Generate a URL-safe slug ID from a name, with a timestamp suffix
 * to ensure uniqueness.
 */
function generateId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "game"}-${Date.now().toString(36)}`;
}

/**
 * POST /api/admin/games
 *
 * Creates a new game entry. Requires admin privileges.
 *
 * Body fields (camelCase → DB snake_case):
 * - name (required)       → name
 * - type (required)       → type
 * - rating (0–10)         → rating
 * - config / specs        → config
 * - platforms (string[])  → platforms (JSON)
 * - description           → description
 * - reason                → reason
 * - tags (string[])       → tags (JSON)
 * - emoji (default 🎮)    → emoji
 * - sortOrder             → sort_order
 * - id (optional)         → id
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "game:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  let body: {
    id?: string;
    name?: string;
    type?: string;
    rating?: number;
    config?: string;
    specs?: string;
    platforms?: string[];
    description?: string;
    reason?: string;
    tags?: string[];
    emoji?: string;
    sortOrder?: number;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const name = body.name?.trim() ?? "";
  if (!name) {
    return badRequest("请输入游戏名称");
  }
  const type = body.type?.trim() ?? "";
  if (!type) {
    return badRequest("请选择游戏类型");
  }

  const id = body.id?.trim() || generateId(name);
  const rating = typeof body.rating === "number" ? body.rating : 0;
  const config = body.config ?? body.specs ?? "mid";
  const platformsJson = JSON.stringify(body.platforms ?? []);
  const tagsJson = JSON.stringify(body.tags ?? []);

  try {
    await DB.prepare(
      `INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        name,
        type,
        rating,
        config,
        platformsJson,
        body.description ?? "",
        body.reason ?? "",
        tagsJson,
        body.emoji ?? "🎮",
        body.sortOrder ?? 0
      )
      .run();
  } catch (err) {
    console.error("创建游戏失败:", err);
    return serverError("创建失败，ID 可能已存在");
  }

  return jsonResponse(
    {
      id,
      name,
      type,
      rating,
      config,
      platforms: body.platforms ?? [],
      desc: body.description ?? "",
      reason: body.reason ?? "",
      tags: body.tags ?? [],
      emoji: body.emoji ?? "🎮",
      sortOrder: body.sortOrder ?? 0,
    },
    "创建成功"
  );
};
