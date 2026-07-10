import { requirePermission } from "../../../lib/permission";
import {
  jsonResponse,
  serverError,
} from "../../../lib/response";

/** 默认每页条数。 */
const DEFAULT_PAGE_SIZE = 20;

/** 最大每页条数。 */
const MAX_PAGE_SIZE = 100;

/**
 * GET /api/admin/logs/operation — 操作日志列表（分页 + 筛选）。
 * GET /api/admin/logs/operation?export=csv — 导出 CSV。
 *
 * 需要 log:view 权限。
 *
 * 查询参数：
 * - search:  按用户名搜索
 * - module:  按模块筛选
 * - startDate: 开始日期
 * - endDate:   结束日期
 * - page:    页码
 * - pageSize: 每页条数
 * - export:  设为 "csv" 时导出 CSV
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "log:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const url = new URL(context.request.url);
  const search = url.searchParams.get("search")?.trim() || "";
  const moduleFilter = url.searchParams.get("module")?.trim() || "";
  const startDate = url.searchParams.get("startDate")?.trim() || "";
  const endDate = url.searchParams.get("endDate")?.trim() || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.max(
    1,
    Math.min(MAX_PAGE_SIZE, parseInt(url.searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10))
  );
  const exportCsv = url.searchParams.get("export") === "csv";

  // 构建 WHERE 条件
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (search) {
    conditions.push("username LIKE ?");
    bindings.push(`%${search}%`);
  }
  if (moduleFilter) {
    conditions.push("module = ?");
    bindings.push(moduleFilter);
  }
  if (startDate) {
    conditions.push("created_at >= ?");
    bindings.push(startDate);
  }
  if (endDate) {
    conditions.push("created_at <= ?");
    bindings.push(endDate + " 23:59:59");
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  try {
    // CSV 导出
    if (exportCsv) {
      const result = await DB.prepare(
        `SELECT id, user_id, username, action, module, target, ip, detail, created_at
         FROM operation_logs ${whereClause}
         ORDER BY created_at DESC LIMIT 10000`
      )
        .bind(...bindings)
        .all<Record<string, unknown>>();

      const rows = result.results || [];
      const csvLines: string[] = [
        "ID,用户ID,用户名,操作,模块,目标,IP,详情,时间",
      ];

      for (const row of rows) {
        const fields = [
          String(row.id ?? ""),
          String(row.user_id ?? ""),
          String(row.username ?? ""),
          String(row.action ?? ""),
          String(row.module ?? ""),
          String(row.target ?? ""),
          String(row.ip ?? ""),
          String(row.detail ?? ""),
          formatCsvDate(row.created_at),
        ];
        csvLines.push(fields.map(escapeCsvField).join(","));
      }

      const csv = "\uFEFF" + csvLines.join("\n");

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="operation_logs_${Date.now()}.csv"`,
        },
      });
    }

    // 分页查询
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as count FROM operation_logs ${whereClause}`
    )
      .bind(...bindings)
      .first<{ count: number }>();
    const total = countRow?.count ?? 0;

    const offset = (page - 1) * pageSize;
    const result = await DB.prepare(
      `SELECT * FROM operation_logs ${whereClause}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(...bindings, pageSize, offset)
      .all<Record<string, unknown>>();

    const list = (result.results || []).map((row) => ({
      id: row.id as number,
      userId: row.user_id as number | null,
      username: row.username as string | null,
      action: row.action as string,
      module: row.module as string,
      target: row.target as string | null,
      ip: row.ip as string | null,
      detail: row.detail as string | null,
      createdAt: row.created_at as string,
    }));

    return jsonResponse({ list, total, page, pageSize });
  } catch {
    return serverError("数据库查询失败");
  }
};

/**
 * Escape a CSV field value: wrap in quotes if it contains commas, quotes, or newlines.
 */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a D1 datetime string for CSV export (e.g. "2026-07-10 08:17:08" -> "2026-07-10 08:17:08").
 * Handles both ISO format and SQLite datetime format.
 */
function formatCsvDate(raw: unknown): string {
  if (!raw) return "";
  const str = String(raw);
  const d = new Date(str.includes("T") ? str : str.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return str;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
