import { jsonResponse, badRequest, serverError } from "../../lib/response";
import { requirePermission, validateUrl } from "../../lib/auth";
import { generateId } from "../../lib/utils";

/**
 * POST /api/admin/games — create a new game entry.
 * Requires `game:manage` permission.
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const auth = await requirePermission(context, "game:manage");
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的 JSON 请求体");
  }

  const name = (body.name as string)?.trim();
  const type = (body.type as string)?.trim();
  const config = (body.config as string)?.trim() || "mid";
  const rating = parseFloat(body.rating as string) || 0;
  const platforms = body.platforms;
  const description = (body.description as string)?.trim() || "";
  const reason = (body.reason as string)?.trim() || "";
  const tags = body.tags;
  const emoji = (body.emoji as string)?.trim() || "";
  const cover = (body.cover as string)?.trim() || null;

  if (!name || !type) {
    return badRequest("游戏名称和类型不能为空");
  }

  const id = (body.id as string)?.trim() || generateId(name);
  const platformsJson = JSON.stringify(Array.isArray(platforms) ? platforms : []);
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

  try {
    await context.env.DB.prepare(
      `INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`
    )
      .bind(id, name, type, rating, config, platformsJson, description, reason, tagsJson, emoji, cover)
      .run();

    return jsonResponse({ code: 0, message: "创建成功", data: { id } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      return badRequest("游戏 ID 已存在");
    }
    return serverError("数据库写入失败");
  }
};
