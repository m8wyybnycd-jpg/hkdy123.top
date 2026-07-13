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
  return `${slug || "sms"}-${Date.now().toString(36)}`;
}

function toInt(v: unknown, fallback: number): number {
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v ? 1 : 0;
  if (typeof v === "string") return v === "true" || v === "1" ? 1 : 0;
  return fallback;
}

/**
 * POST /api/admin/sms-platforms
 *
 * Creates a new SMS-receiving platform. Requires `sms_platform:manage`.
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "sms_platform:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  let body: {
    id?: string;
    name?: string;
    url?: string;
    category?: string;
    countries?: string;
    isFree?: boolean;
    needRegister?: boolean;
    supportChinese?: boolean;
    retention?: string;
    description?: string;
    features?: string[];
    sortOrder?: number;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const name = body.name?.trim() ?? "";
  if (!name) return badRequest("请输入平台名称");

  const url = body.url?.trim() ?? "";
  if (!url) return badRequest("请输入平台网址");
  const urlError = validateUrl(url, "url");
  if (urlError) return badRequest(urlError);

  const id = body.id?.trim() || generateId(name);
  const now = new Date().toISOString();
  const features = JSON.stringify(body.features ?? []);

  try {
    await DB.prepare(
      `INSERT INTO sms_platforms (id, name, url, category, countries, is_free, need_register, support_chinese, retention, description, features, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        name,
        url,
        body.category ?? "",
        body.countries ?? "",
        toInt(body.isFree, 1),
        toInt(body.needRegister, 0),
        toInt(body.supportChinese, 0),
        body.retention ?? "",
        body.description ?? "",
        features,
        body.sortOrder ?? 0,
        now
      )
      .run();
  } catch (err) {
    console.error("创建接码平台失败:", err);
    return serverError("创建失败，ID 可能已存在");
  }

  return jsonResponse(
    {
      id,
      name,
      url,
      category: body.category ?? "",
      countries: body.countries ?? "",
      isFree: !!body.isFree,
      needRegister: !!body.needRegister,
      supportChinese: !!body.supportChinese,
      retention: body.retention ?? "",
      description: body.description ?? "",
      features: body.features ?? [],
      sortOrder: body.sortOrder ?? 0,
    },
    "创建成功"
  );
};
