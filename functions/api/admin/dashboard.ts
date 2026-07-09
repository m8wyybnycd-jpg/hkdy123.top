import {
  jsonResponse,
  serverError,
} from "../../lib/response";
import { requirePermission } from "../../lib/permission";
import type { AdminDashboardStats } from "../../../src/types";

/**
 * GET /api/admin/dashboard
 *
 * Returns aggregate statistics for the admin dashboard:
 * total users, today's new users, and counts for each content table.
 * Requires admin privileges.
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "dashboard:view");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) {
    return serverError("数据库不可用");
  }

  try {
    // Use Promise.allSettled so that a failure on one table
    // defaults to 0 rather than failing the entire request.
    // (Promise.all is fail-fast — a single reject would skip all ?? 0 fallbacks.)
    const results = await Promise.allSettled([
      DB.prepare("SELECT COUNT(*) as total FROM users").first<{ total: number }>(),
      DB.prepare(
        "SELECT COUNT(*) as total FROM users WHERE date(created_at) = date('now')"
      ).first<{ total: number }>(),
      DB.prepare("SELECT COUNT(*) as total FROM platforms").first<{ total: number }>(),
      DB.prepare("SELECT COUNT(*) as total FROM cloud_desktops").first<{ total: number }>(),
      DB.prepare("SELECT COUNT(*) as total FROM deals").first<{ total: number }>(),
      DB.prepare("SELECT COUNT(*) as total FROM games").first<{ total: number }>(),
    ]);

    /** Extract count from a settled result, defaulting to 0 on rejection. */
    const extractCount = (result: PromiseSettledResult<{ total: number } | null>): number =>
      result.status === "fulfilled" && result.value ? result.value.total : 0;

    const stats: AdminDashboardStats = {
      totalUsers: extractCount(results[0]),
      todayNewUsers: extractCount(results[1]),
      totalPlatforms: extractCount(results[2]),
      totalDesktops: extractCount(results[3]),
      totalDeals: extractCount(results[4]),
      totalGames: extractCount(results[5]),
    };

    return jsonResponse(stats, "ok");
  } catch (err) {
    console.error("admin/dashboard 查询失败:", err);
    return serverError("统计数据查询失败");
  }
};
