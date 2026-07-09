import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  badRequest,
  notFound,
  serverError,
} from "../../../lib/response";
import { logOperation, getClientIP } from "../../../lib/logger";

/** 公告类型白名单。 */
const VALID_TYPES = ["notice", "announcement", "maintenance"];

/** 公告状态白名单：0=草稿, 1=已发布, 2=已归档。 */
const VALID_STATUSES = [0, 1, 2];

/**
 * PUT /api/admin/announcements/:id — 编辑公告。
 * DELETE /api/admin/announcements/:id — 删除公告。
 *
 * 两者均需要 announcement:manage 权限。
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "announcement:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const annId = Number(context.params.id);
  if (!annId || isNaN(annId)) {
    return badRequest("无效的公告ID");
  }

  // 解析请求体
  let body: {
    title?: string;
    content?: string;
    type?: string;
    status?: number;
    sortOrder?: number;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  // 查询现有公告
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare("SELECT * FROM announcements WHERE id = ?")
      .bind(annId)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!existing) {
    return notFound("公告不存在");
  }

  const title = body.title?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  const type = body.type?.trim() ?? "notice";
  const status = body.status ?? 0;
  const sortOrder = body.sortOrder ?? 0;

  // 校验
  if (!title) {
    return badRequest("公告标题不能为空");
  }
  if (!content) {
    return badRequest("公告内容不能为空");
  }
  if (!VALID_TYPES.includes(type)) {
    return badRequest("公告类型无效");
  }
  if (!VALID_STATUSES.includes(status)) {
    return badRequest("公告状态无效");
  }

  // 如果状态从非发布变为发布，设置 published_at
  const prevStatus = existing.status as number;
  let publishedAt: string | null = (existing.published_at as string) || null;
  if (status === 1 && prevStatus !== 1) {
    publishedAt = new Date().toISOString();
  }
  if (status !== 1) {
    publishedAt = null;
  }

  try {
    await DB.prepare(
      `UPDATE announcements
       SET title = ?, content = ?, type = ?, status = ?, sort_order = ?, published_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(title, content, type, status, sortOrder, publishedAt, annId)
      .run();
  } catch {
    return serverError("更新公告失败");
  }

  // 查询更新后的公告
  try {
    const row = await DB.prepare("SELECT * FROM announcements WHERE id = ?")
      .bind(annId)
      .first<Record<string, unknown>>();

    // 记录操作日志
    await logOperation(DB, {
      userId: context.data.user?.userId ?? null,
      username: context.data.user?.username ?? null,
      action: "update",
      module: "announcement",
      target: String(annId),
      ip: getClientIP(context.request),
      detail: { title, type, status },
    });

    return jsonResponse({
      id: row!.id as number,
      title: row!.title as string,
      content: row!.content as string,
      type: row!.type as string,
      status: row!.status as number,
      sortOrder: row!.sort_order as number,
      createdBy: row!.created_by as number | null,
      createdAt: row!.created_at as string,
      updatedAt: row!.updated_at as string,
      publishedAt: row!.published_at as string | null,
    });
  } catch {
    return serverError("更新成功但查询失败");
  }
};

export const onRequestDelete = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "announcement:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const annId = Number(context.params.id);
  if (!annId || isNaN(annId)) {
    return badRequest("无效的公告ID");
  }

  // 查询现有公告
  let existing: Record<string, unknown> | null;
  try {
    existing = await DB.prepare("SELECT * FROM announcements WHERE id = ?")
      .bind(annId)
      .first();
  } catch {
    return serverError("数据库查询失败");
  }

  if (!existing) {
    return notFound("公告不存在");
  }

  try {
    await DB.prepare("DELETE FROM announcements WHERE id = ?")
      .bind(annId)
      .run();
  } catch {
    return serverError("删除公告失败");
  }

  // 记录操作日志
  await logOperation(DB, {
    userId: context.data.user?.userId ?? null,
    username: context.data.user?.username ?? null,
    action: "delete",
    module: "announcement",
    target: String(annId),
    ip: getClientIP(context.request),
    detail: { title: existing.title },
  });

  return jsonResponse(null, "删除成功");
};
