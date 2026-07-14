import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";
import { logOperation, getClientIP } from "../../lib/logger";

/**
 * 将 D1 行（snake_case）映射为 Image 对象（camelCase）。
 */
function mapImageRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    fileSize: row.file_size as number,
    mimeType: row.mime_type as string,
    width: (row.width as number) ?? null,
    height: (row.height as number) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * GET /api/admin/images — 图片库列表（分页 + 搜索）。
 * 需要 gallery:view 权限。
 *
 * 查询参数：
 * - page: 页码（默认 1）
 * - pageSize: 每页条数（默认 20，最大 100）
 * - search: 模糊匹配 name
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "gallery:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(url.searchParams.get("pageSize") || "20", 10))
  );
  const search = (url.searchParams.get("search") || "").trim();

  const offset = (page - 1) * pageSize;

  try {
    const conditions: string[] = [];
    const params: string[] = [];

    if (search) {
      conditions.push("name LIKE ?");
      params.push(`%${search}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // 查询总数
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as count FROM images ${whereClause}`
    )
      .bind(...params)
      .first<{ count: number }>();
    const total = countRow?.count ?? 0;

    // 查询列表
    const result = await DB.prepare(
      `SELECT id, name, url, file_size, mime_type, width, height, created_at, updated_at
       FROM images ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, pageSize, offset)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map(mapImageRow);

    return jsonResponse({ list, total, page, pageSize });
  } catch {
    return serverError("数据库查询失败");
  }
};

/**
 * POST /api/admin/images — 上传图片（保存元数据到 D1）。
 * 需要 gallery:manage 权限。
 *
 * 接收 multipart/form-data（field: file），代理到 Cloudflare Images API。
 * 上传成功后自动将元数据写入 D1 images 表。
 *
 * 需在项目 Secrets 中配置 CF_ACCOUNT_ID 和 CF_IMAGES_TOKEN。
 *
 * 返回：{ code: 0, data: { id, name, url, ... } }
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "gallery:manage");
  if (denied) return denied;

  const { DB, CF_ACCOUNT_ID, CF_IMAGES_TOKEN } = context.env as Env & {
    CF_ACCOUNT_ID?: string;
    CF_IMAGES_TOKEN?: string;
  };

  if (!DB) return serverError("数据库不可用");

  // 检查 Cloudflare Images 配置
  if (!CF_ACCOUNT_ID || !CF_IMAGES_TOKEN) {
    return badRequest(
      "图片上传服务未配置，请联系管理员配置 CF_ACCOUNT_ID 和 CF_IMAGES_TOKEN"
    );
  }

  // 解析 multipart/form-data
  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return badRequest("无法解析表单数据");
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return badRequest("请选择要上传的图片文件");
  }

  // 客户端校验
  if (!file.type.startsWith("image/")) {
    return badRequest("仅支持图片文件（JPG、PNG、GIF、WebP 等）");
  }
  if (file.size > 10 * 1024 * 1024) {
    return badRequest("图片大小不能超过 10MB");
  }

  try {
    // 代理上传到 Cloudflare Images API
    const cfFormData = new FormData();
    cfFormData.append("file", file);

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_IMAGES_TOKEN}`,
        },
        body: cfFormData,
      }
    );

    if (!cfResponse.ok) {
      const errText = await cfResponse.text();
      console.error("Cloudflare Images API error:", errText);
      return serverError("图片上传失败，请稍后重试");
    }

    const cfData = (await cfResponse.json()) as {
      success: boolean;
      result?: {
        id?: string;
        filename?: string;
        variants?: string[];
        meta?: { [key: string]: unknown };
      };
      errors?: { code: number; message: string }[];
    };

    if (!cfData.success || !cfData.result?.variants?.length) {
      return serverError("图片上传失败：未返回图片 URL");
    }

    // 使用第一个 variant 作为图片 URL（public 变体）
    const imageUrl = cfData.result.variants[0];
    const cfImageId = cfData.result.id || crypto.randomUUID();
    const fileName = cfData.result.filename || file.name || "untitled";

    // 生成 UUID 作为 D1 主键
    const imageId = crypto.randomUUID();

    // 写入 D1 images 表
    await DB.prepare(
      `INSERT INTO images (id, name, url, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(imageId, fileName, imageUrl, file.size, file.type)
      .run();

    const row = await DB.prepare("SELECT * FROM images WHERE id = ?")
      .bind(imageId)
      .first<Record<string, unknown>>();

    if (!row) {
      return serverError("图片上传成功但记录保存失败");
    }

    // 记录操作日志
    const userId = context.data.user?.userId ?? null;
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "upload",
      module: "gallery",
      target: imageId,
      ip: getClientIP(context.request),
      detail: { name: fileName, size: file.size, mimeType: file.type },
    });

    return jsonResponse(mapImageRow(row), "上传成功", 0, 201);
  } catch (err) {
    console.error("图片上传异常:", err);
    return serverError("图片上传异常，请稍后重试");
  }
};
