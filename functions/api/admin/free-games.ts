import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";
import { requirePermission } from "../../lib/permission";
import { validateUrl } from "../../lib/validation";

/**
 * Generate a URL-safe slug ID from a name.
 */
function generateId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "fg"}-${Date.now().toString(36)}`;
}

/**
 * POST /api/admin/free-games
 *
 * Creates a new free game resource. Requires `free_game:manage`.
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "free_game:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  let body: {
    id?: string;
    name?: string;
    type?: string;
    platform?: string;
    description?: string;
    quarkLink?: string;
    emoji?: string;
    sortOrder?: number;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const name = body.name?.trim() ?? "";
  if (!name) return badRequest("请输入游戏名称");

  const quarkLink = body.quarkLink?.trim() ?? "";
  if (!quarkLink) return badRequest("请输入夸克网盘链接");
  const urlError = validateUrl(quarkLink, "quarkLink");
  if (urlError) return badRequest(urlError);

  const id = body.id?.trim() || generateId(name);
  const now = new Date().toISOString();

  try {
    await DB.prepare(
      `INSERT INTO free_games (id, name, type, platform, description, quark_link, emoji, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        name,
        body.type ?? "",
        body.platform ?? "",
        body.description ?? "",
        quarkLink,
        body.emoji ?? "",
        body.sortOrder ?? 0,
        now
      )
      .run();
  } catch (err) {
    console.error("创建免费游戏失败:", err);
    return serverError("创建失败，ID 可能已存在");
  }

  return jsonResponse(
    {
      id,
      name,
      type: body.type ?? "",
      platform: body.platform ?? "",
      description: body.description ?? "",
      quarkLink,
      emoji: body.emoji ?? "",
      sortOrder: body.sortOrder ?? 0,
    },
    "创建成功"
  );
};
