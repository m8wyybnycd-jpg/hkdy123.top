import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { logOperation, getClientIP } from "../../../lib/logger";

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
 * GET /api/admin/images/:id — 获取单张图片详情。
 * 需要 gallery:view 权限。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "gallery:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = context.params.id;
  if (!id || typeof id !== "string") {
    return badRequest("无效的图片 ID");
  }

  try {
    const row = await DB.prepare("SELECT * FROM images WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) {
      return notFound("图片不存在");
    }

    return jsonResponse(mapImageRow(row));
  } catch {
    return serverError("数据库查询失败");
  }
};

/**
 * PUT /api/admin/images/:id — 重命名图片。
 * 需要 gallery:manage 权限。
 *
 * 请求体：{ name: "新名称" }
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "gallery:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = context.params.id;
  if (!id || typeof id !== "string") {
    return badRequest("无效的图片 ID");
  }

  let body: { name?: string };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const name = body.name?.trim();
  if (!name) {
    return badRequest("名称不能为空");
  }
  if (name.length > 255) {
    return badRequest("名称长度不能超过 255 个字符");
  }

  const userId = context.data.user?.userId ?? null;

  try {
    const result = await DB.prepare(
      `UPDATE images SET name = ?, updated_at = datetime('now') WHERE id = ?`
    )
      .bind(name, id)
      .run();

    if (result.meta?.changes === 0) {
      return notFound("图片不存在");
    }

    const row = await DB.prepare("SELECT * FROM images WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) {
      return serverError("更新成功但查询失败");
    }

    // 记录操作日志
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "rename",
      module: "gallery",
      target: id,
      ip: getClientIP(context.request),
      detail: { newName: name },
    });

    return jsonResponse(mapImageRow(row), "重命名成功");
  } catch {
    return serverError("重命名失败");
  }
};

/**
 * DELETE /api/admin/images/:id — 删除图片。
 * 需要 gallery:manage 权限。
 *
 * 注意：仅从 D1 删除元数据记录，不会删除 Cloudflare Images 上的图片文件。
 * 如需彻底清理，需在 CF Images 控制台手动删除。
 */
export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "gallery:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const id = context.params.id;
  if (!id || typeof id !== "string") {
    return badRequest("无效的图片 ID");
  }

  const userId = context.data.user?.userId ?? null;

  try {
    // 先查询是否存在（用于日志记录）
    const existing = await DB.prepare("SELECT name FROM images WHERE id = ?")
      .bind(id)
      .first<{ name: string }>();

    if (!existing) {
      return notFound("图片不存在");
    }

    await DB.prepare("DELETE FROM images WHERE id = ?").bind(id).run();

    // 记录操作日志
    await logOperation(DB, {
      userId,
      username: context.data.user?.username ?? null,
      action: "delete",
      module: "gallery",
      target: id,
      ip: getClientIP(context.request),
      detail: { name: existing.name },
    });

    return jsonResponse(null, "删除成功");
  } catch {
    return serverError("删除失败");
  }
};
