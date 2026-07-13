import { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Gamepad2,
  Monitor,
  Tag,
  Library,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "../../services/api";
import type { AdminDashboardStats, AdminUserItem } from "../../types";

/** Stats card configuration. */
interface StatCardConfig {
  label: string;
  value: number;
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
}

/**
 * Admin dashboard page: overview statistics, content distribution chart,
 * and recent user registrations.
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");
      const [dashRes, usersRes] = await Promise.all([
        apiClient.getAdminDashboard(),
        apiClient.getAdminUsers(undefined, 1, 5),
      ]);
      setStats(dashRes);
      setRecentUsers(usersRes.list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#2EA7FF]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={loadData}
          className="rounded-md bg-[#2EA7FF] px-4 py-2 text-sm text-white hover:bg-[#1d8ad6]"
        >
          重试
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const statCards: StatCardConfig[] = [
    { label: "总用户数", value: stats.totalUsers, icon: Users, iconBg: "bg-blue-50", iconColor: "text-aurora-cyan" },
    { label: "今日新增", value: stats.todayNewUsers, icon: UserPlus, iconBg: "bg-green-500/15", iconColor: "text-green-400" },
    { label: "云游戏平台", value: stats.totalPlatforms, icon: Gamepad2, iconBg: "bg-purple-50", iconColor: "text-purple-500" },
    { label: "办公云电脑", value: stats.totalDesktops, icon: Monitor, iconBg: "bg-orange-50", iconColor: "text-orange-500" },
    { label: "薅羊毛", value: stats.totalDeals, icon: Tag, iconBg: "bg-pink-50", iconColor: "text-pink-500" },
    { label: "游戏库", value: stats.totalGames, icon: Library, iconBg: "bg-cyan-50", iconColor: "text-cyan-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_32px_rgba(2,6,23,0.45)]"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">{card.label}</p>
                <p className="text-xl font-bold text-slate-100">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Recent Users */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Content Distribution Chart */}
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
          <h2 className="mb-4 text-base font-semibold text-slate-100">内容分布</h2>
          <ContentDistributionChart stats={stats} />
        </div>

        {/* Recent Users */}
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
          <h2 className="mb-4 text-base font-semibold text-slate-100">最新注册用户</h2>
          {recentUsers.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">暂无用户数据</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {user.email}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                  {user.isAdmin && (
                    <span className="ml-2 shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-aurora-cyan">
                      管理员
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Format an ISO 8601 timestamp to a readable date string. */
function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Simple SVG bar chart showing content type distribution. */
function ContentDistributionChart({
  stats,
}: {
  stats: AdminDashboardStats;
}) {
  const data = [
    { label: "云游戏平台", value: stats.totalPlatforms, color: "#8b5cf6" },
    { label: "办公云电脑", value: stats.totalDesktops, color: "#f97316" },
    { label: "薅羊毛", value: stats.totalDeals, color: "#ec4899" },
    { label: "游戏库", value: stats.totalGames, color: "#06b6d4" },
  ];
  const maxValue: number = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end justify-around gap-2 px-4" style={{ height: "200px" }}>
      {data.map((d) => {
        const barHeight: number = Math.max((d.value / maxValue) * 140, 4);
        return (
          <div
            key={d.label}
            className="flex flex-1 flex-col items-center justify-end"
            style={{ height: "100%" }}
          >
            <span className="mb-1 text-sm font-bold text-slate-200">{d.value}</span>
            <div
              className="w-full max-w-[60px] rounded-t-md transition-all"
              style={{
                height: `${barHeight}px`,
                backgroundColor: d.color,
              }}
            />
            <span className="mt-2 text-center text-xs text-slate-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
