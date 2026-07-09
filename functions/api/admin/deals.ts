import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";
import { requirePermission } from "../../lib/permission";
import { validateUrl } from "../../lib/validation";

/**
 * Generate a URL-safe slug ID from a title, with a timestamp suffix
 * to ensure uniqueness.
 */
function generateId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "deal"}-${Date.now().toString(36)}`;
}

/**
 * POST /api/admin/deals
 *
 * Creates a new deal / freebie / coupon entry. Requires admin privileges.
 *
 * Body fields (camelCase → DB snake_case):
 * - title (required)       → title
 * - description            → description
 * - link / url (required)  → link
 * - category (required)    → category
 * - tags (string[])        → tags (JSON)
 * - expiresAt / expiryDate → expires_at
 * - sortOrder              → sort_order
 * - id (optional)          → id
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "deal:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  let body: {
    id?: string;
    title?: string;
    description?: string;
    link?: string;
    url?: string;
    category?: string;
    tags?: string[];
    expiresAt?: string | null;
    expiryDate?: string | null;
    sortOrder?: number;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const title = body.title?.trim() ?? "";
  if (!title) {
    return badRequest("请输入标题");
  }
  const link = (body.link ?? body.url)?.trim() ?? "";
  if (!link) {
    return badRequest("请输入链接");
  }
  const linkError = validateUrl(link, "link");
  if (linkError) return badRequest(linkError);
  const category = body.category?.trim() ?? "";
  if (!category) {
    return badRequest("请选择分类");
  }

  const id = body.id?.trim() || generateId(title);
  const now = new Date().toISOString();
  const tagsJson = JSON.stringify(body.tags ?? []);
  const expiresAt = body.expiresAt ?? body.expiryDate ?? "";

  try {
    await DB.prepare(
      `INSERT INTO deals (id, title, description, link, category, tags, updated_at, expires_at, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        title,
        body.description ?? "",
        link,
        category,
        tagsJson,
        now,
        expiresAt,
        body.sortOrder ?? 0
      )
      .run();
  } catch (err) {
    console.error("创建优惠失败:", err);
    return serverError("创建失败，ID 可能已存在");
  }

  return jsonResponse(
    {
      id,
      title,
      description: body.description ?? "",
      link,
      category,
      tags: body.tags ?? [],
      updatedAt: now,
      expiresAt: expiresAt || null,
      sortOrder: body.sortOrder ?? 0,
    },
    "创建成功"
  );
};
