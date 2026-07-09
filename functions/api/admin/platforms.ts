import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";
import { requirePermission } from "../../lib/permission";
import { validateUrl } from "../../lib/validation";

/**
 * Generate a URL-safe slug ID from a name, with a timestamp suffix
 * to ensure uniqueness.
 */
function generateId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "platform"}-${Date.now().toString(36)}`;
}

/**
 * POST /api/admin/platforms
 *
 * Creates a new cloud gaming platform. Requires admin privileges.
 *
 * Body fields (camelCase → DB snake_case):
 * - name (required)        → name
 * - color (default #00a4ff) → color
 * - price                  → price
 * - freeInfo / freeTrial   → free_info
 * - url (required)         → url
 * - description            → description
 * - tags (string[])        → tags (JSON)
 * - activity / promo       → activity
 * - sortOrder              → sort_order
 * - id (optional)          → id
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "platform:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  let body: {
    id?: string;
    name?: string;
    color?: string;
    price?: string;
    freeInfo?: string;
    freeTrial?: string;
    url?: string;
    description?: string;
    tags?: string[];
    activity?: string;
    promo?: string;
    sortOrder?: number;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const name = body.name?.trim() ?? "";
  if (!name) {
    return badRequest("请输入平台名称");
  }
  const url = body.url?.trim() ?? "";
  if (!url) {
    return badRequest("请输入平台 URL");
  }
  const urlError = validateUrl(url, "url");
  if (urlError) return badRequest(urlError);

  const id = body.id?.trim() || generateId(name);
  const now = new Date().toISOString();
  const tags = JSON.stringify(body.tags ?? []);

  try {
    await DB.prepare(
      `INSERT INTO platforms (id, name, color, price, free_info, url, description, tags, activity, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        name,
        body.color ?? "#00a4ff",
        body.price ?? "",
        body.freeInfo ?? body.freeTrial ?? "",
        url,
        body.description ?? "",
        tags,
        body.activity ?? body.promo ?? "",
        body.sortOrder ?? 0,
        now
      )
      .run();
  } catch (err) {
    console.error("创建平台失败:", err);
    return serverError("创建失败，ID 可能已存在");
  }

  return jsonResponse(
    {
      id,
      name,
      color: body.color ?? "#00a4ff",
      price: body.price ?? "",
      freeInfo: body.freeInfo ?? body.freeTrial ?? "",
      url,
      desc: body.description ?? "",
      tags: body.tags ?? [],
      activity: body.activity ?? body.promo ?? "",
      sortOrder: body.sortOrder ?? 0,
    },
    "创建成功"
  );
};
