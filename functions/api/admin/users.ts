import {
  jsonResponse,
  serverError,
} from "../../lib/response";
import { requirePermission } from "../../lib/permission";
import type { AdminUserItem, PaginatedResponse } from "../../../src/types";

/**
 * GET /api/admin/users
 *
 * Returns a paginated list of all users with optional email search.
 * Requires admin privileges.
 *
 * Query params:
 * - search: email模糊搜索关键词
 * - page: 页码 (default 1)
 * - pageSize: 每页条数 (default 20, max 100)
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "user:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  // Parse query parameters
  const url = new URL(context.request.url);
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const page = Math.max(
    1,
    parseInt(url.searchParams.get("page") ?? "1", 10) || 1
  );
  const pageSize = Math.min(
    100,
    Math.max(
      1,
      parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20
    )
  );
  const offset = (page - 1) * pageSize;

  try {
    // Build WHERE clause and params
    const whereClause = search ? "WHERE email LIKE ?" : "";
    const searchParams = search ? [`%${search}%`] : [];

    // Get total count
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as total FROM users ${whereClause}`
    )
      .bind(...searchParams)
      .first();
    const total = (countRow?.total as number) ?? 0;

    // Get paginated results
    const result = await DB.prepare(
      `SELECT id, email, username, is_admin, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY id DESC LIMIT ? OFFSET ?`
    )
      .bind(...searchParams, pageSize, offset)
      .all();

    const list: AdminUserItem[] = (result.results ?? []).map((row) => ({
      id: row.id as number,
      email: row.email as string,
      username: (row.username as string) ?? "",
      isAdmin: row.is_admin === 1,
      createdAt: row.created_at as string,
      updatedAt: (row.updated_at as string) ?? "",
    }));

    const data: PaginatedResponse<AdminUserItem> = {
      list,
      total,
      page,
      pageSize,
    };

    return jsonResponse(data, "ok");
  } catch (err) {
    console.error("admin/users 查询失败:", err);
    return serverError("数据库查询失败");
  }
};
