import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
} from "../../lib/response";
import { logOperation, getClientIP } from "../../lib/logger";

/**
 * GET /api/admin/messages — 管理员查看已发送消息列表（分页）。
 * POST /api/admin/messages — 发送消息（指定 recipient_id 或 -1 全体）。
 *
 * GET  需要 message:view 权限。
 * POST 需要 message:manage 权限。
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "message:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  // 解析查询参数
  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(url.searchParams.get("pageSize") || "20", 10))
  );

  const offset = (page - 1) * pageSize;

  try {
    const countRow = await DB.prepare(
      "SELECT COUNT(*) as count FROM messages"
    ).first<{ count: number }>();
    const total = countRow?.count ?? 0;

    const result = await DB.prepare(
      `SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(pageSize, offset)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map((row) => ({
      id: row.id as number,
      senderId: row.sender_id as number,
      recipientId: row.recipient_id as number,
      title: row.title as string,
      content: row.content as string,
      isRead: row.is_read as number,
      readAt: row.read_at as string | null,
      createdAt: row.created_at as string,
    }));

    return jsonResponse({ list, total, page, pageSize });
  } catch {
    return serverError("数据库查询失败");
  }
};

export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "message:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  // 解析请求体
  let body: {
    recipientId?: number;
    title?: string;
    content?: string;
  };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const recipientId = body.recipientId;
  const title = body.title?.trim() ?? "";
  const content = body.content?.trim() ?? "";

  // 校验
  if (recipientId === undefined || recipientId === null || isNaN(recipientId)) {
    return badRequest("请指定接收者");
  }
  if (!title) {
    return badRequest("消息标题不能为空");
  }
  if (!content) {
    return badRequest("消息内容不能为空");
  }

  const senderId = context.data.user?.userId ?? 0;

  try {
    const result = await DB.prepare(
      `INSERT INTO messages (sender_id, recipient_id, title, content)
       VALUES (?, ?, ?, ?)`
    )
      .bind(senderId, recipientId, title, content)
      .run();

    const insertId = result.meta?.last_row_id;

    const row = await DB.prepare("SELECT * FROM messages WHERE id = ?")
      .bind(insertId)
      .first<Record<string, unknown>>();

    if (!row) {
      return serverError("发送成功但查询失败");
    }

    // 记录操作日志
    await logOperation(DB, {
      userId: context.data.user?.userId ?? null,
      username: context.data.user?.username ?? null,
      action: "create",
      module: "message",
      target: String(insertId),
      ip: getClientIP(context.request),
      detail: { recipientId, title },
    });

    return jsonResponse(
      {
        id: row.id as number,
        senderId: row.sender_id as number,
        recipientId: row.recipient_id as number,
        title: row.title as string,
        content: row.content as string,
        isRead: row.is_read as number,
        readAt: row.read_at as string | null,
        createdAt: row.created_at as string,
      },
      "发送成功",
      0,
      201
    );
  } catch {
    return serverError("发送消息失败");
  }
};
