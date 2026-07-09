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
  return `${slug || "desktop"}-${Date.now().toString(36)}`;
}

/**
 * POST /api/admin/desktops
 *
 * Creates a new office cloud desktop entry. Requires admin privileges.
 *
 * Body fields (camelCase → DB snake_case):
 * - name (required)         → name
 * - url (required)          → url
 * - description             → description
 * - scenarios (string[])    → scenarios (JSON)
 * - priceRange              → price_range
 * - activity                → activity
 * - sortOrder               → sort_order
 * - id (optional)           → id
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "desktop:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  let body: {
    id?: string;
    name?: string;
    url?: string;
    description?: string;
    scenarios?: string[];
    scenario?: string[];
    priceRange?: string;
    activity?: string;
    sortOrder?: number;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const name = body.name?.trim() ?? "";
  if (!name) {
    return badRequest("请输入云电脑名称");
  }
  const url = body.url?.trim() ?? "";
  if (!url) {
    return badRequest("请输入云电脑 URL");
  }
  const urlError = validateUrl(url, "url");
  if (urlError) return badRequest(urlError);

  const id = body.id?.trim() || generateId(name);
  const now = new Date().toISOString();
  const scenarios = body.scenarios ?? body.scenario ?? [];
  const scenariosJson = JSON.stringify(scenarios);

  try {
    await DB.prepare(
      `INSERT INTO cloud_desktops (id, name, url, description, scenarios, price_range, activity, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        name,
        url,
        body.description ?? "",
        scenariosJson,
        body.priceRange ?? "",
        body.activity ?? "",
        body.sortOrder ?? 0,
        now
      )
      .run();
  } catch (err) {
    console.error("创建云电脑失败:", err);
    return serverError("创建失败，ID 可能已存在");
  }

  return jsonResponse(
    {
      id,
      name,
      url,
      desc: body.description ?? "",
      scenarios,
      priceRange: body.priceRange ?? "",
      activity: body.activity ?? "",
      sortOrder: body.sortOrder ?? 0,
    },
    "创建成功"
  );
};
