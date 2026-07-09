import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  conflict,
  serverError,
} from "../../lib/response";

/** Regex for role code: lowercase letters and underscores only. */
const CODE_REGEX = /^[a-z_]+$/;

/**
 * GET /api/admin/roles — List all roles with userCount and permissionCount.
 * POST /api/admin/roles — Create a new role.
 *
 * Both require `role:manage` permission.
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "role:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  try {
    const result = await DB.prepare(
      `SELECT
         r.id, r.name, r.code, r.description, r.is_system, r.status,
         r.created_at, r.updated_at,
         (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) AS user_count,
         (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_id = r.id) AS permission_count
       FROM roles r
       ORDER BY r.id ASC`
    ).all<
      Record<string, unknown>
    >();

    const roles = (result.results || []).map((row) => ({
      id: row.id as number,
      name: row.name as string,
      code: row.code as string,
      description: row.description as string,
      isSystem: row.is_system === 1,
      status: row.status as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      userCount: row.user_count as number,
      permissionCount: row.permission_count as number,
    }));

    return jsonResponse(roles);
  } catch {
    return serverError("数据库查询失败");
  }
};

export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "role:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  // Parse request body
  let body: { name?: string; code?: string; description?: string; status?: number };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  const name = body.name?.trim() ?? "";
  const code = body.code?.trim().toLowerCase() ?? "";
  const description = body.description?.trim() ?? "";
  const status = body.status ?? 1;

  // Validate name
  if (!name) {
    return badRequest("角色名称不能为空");
  }

  // Validate code format
  if (!code) {
    return badRequest("角色标识不能为空");
  }
  if (!CODE_REGEX.test(code)) {
    return badRequest("角色标识只能包含小写字母和下划线");
  }

  // Validate status
  if (status !== 0 && status !== 1) {
    return badRequest("状态值无效");
  }

  // Check code uniqueness
  try {
    const existing = await DB.prepare("SELECT id FROM roles WHERE code = ?")
      .bind(code)
      .first();
    if (existing) {
      return conflict("角色标识已存在");
    }
  } catch {
    return serverError("数据库查询失败");
  }

  // Insert new role
  try {
    await DB.prepare(
      `INSERT INTO roles (name, code, description, is_system, status)
       VALUES (?, ?, ?, 0, ?)`
    )
      .bind(name, code, description, status)
      .run();
  } catch {
    return serverError("创建角色失败");
  }

  // Query the created role
  try {
    const row = await DB.prepare("SELECT * FROM roles WHERE code = ?")
      .bind(code)
      .first<Record<string, unknown>>();

    if (!row) {
      return serverError("创建成功但查询失败");
    }

    return jsonResponse(
      {
        id: row.id as number,
        name: row.name as string,
        code: row.code as string,
        description: row.description as string,
        isSystem: row.is_system === 1,
        status: row.status as number,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      },
      "创建成功",
      0,
      201
    );
  } catch {
    return serverError("创建成功但查询失败");
  }
};
