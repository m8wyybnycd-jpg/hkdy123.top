import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Coins,
  CalendarDays,
  Users as UsersIcon,
  ShieldX,
  TrendingUp,
  Crown,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { apiClient } from "../../services/api";
import type {
  TokenStats,
  TokenUsageLog,
  TokenUsageStatus,
  PaginatedResponse,
} from "../../types";

/** Default page size for the usage table. */
const DEFAULT_PAGE_SIZE = 20;

/** Status filter options. */
const STATUS_OPTIONS: { value: "" | TokenUsageStatus; label: string }[] = [
  { value: "", label: "全部状态" },
  { value: "success", label: "成功" },
  { value: "blocked", label: "已拦截" },
  { value: "error", label: "错误" },
];

/** Status badge color mapping. */
const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-500/15 text-green-400",
  blocked: "bg-amber-500/15 text-amber-400",
  error: "bg-red-500/15 text-red-400",
};

/** Format a number with thousands separators. */
function formatNumber(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return n.toLocaleString("en-US");
}

/** Format a cost value to 4 decimal places. */
function formatCost(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return "$0.0000";
  return `$${n.toFixed(4)}`;
}

/** Format an ISO 8601 timestamp to a readable date-time string. */
function formatDateTime(iso: string): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Shorten a date string (YYYY-MM-DD) to MM-DD for chart axis. */
function shortDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length >= 3) return `${parts[1]}-${parts[2]}`;
  return dateStr;
}

/** Stat card configuration. */
interface StatCardConfig {
  label: string;
  value: string;
  sublabel: string;
  icon: typeof Coins;
  iconColor: string;
}

/**
 * Admin Token management page: usage statistics overview,
 * usage log table with filtering, trend charts, and top user ranking.
 */
export default function TokensPage() {
  // Stats state
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Usage table state
  const [usageData, setUsageData] = useState<PaginatedResponse<TokenUsageLog> | null>(null);
  const [usageLoading, setUsageLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  // Filter state
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [modelFilter, setModelFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"" | TokenUsageStatus>("");

  // Error state
  const [error, setError] = useState<string>("");

  /** Fetch token statistics overview. */
  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      setStatsLoading(true);
      const data = await apiClient.getTokenStats();
      setStats(data);
    } catch (err) {
      console.error("[TokensPage] stats fetch error:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  /** Fetch paginated usage logs with current filters. */
  const fetchUsage = useCallback(
    async (pageNum: number): Promise<void> => {
      try {
        setUsageLoading(true);
        setError("");
        const data = await apiClient.getTokenUsage({
          page: pageNum,
          pageSize: DEFAULT_PAGE_SIZE,
          model: modelFilter || undefined,
          status: statusFilter || undefined,
        });
        setUsageData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setUsageLoading(false);
      }
    },
    [modelFilter, statusFilter]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsage(page);
  }, [fetchUsage, page]);

  /** Handle search button click. */
  const handleSearch = (): void => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  /** Handle Enter key in search input. */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") handleSearch();
  };

  /** Handle status filter change. */
  const handleStatusChange = (value: "" | TokenUsageStatus): void => {
    setStatusFilter(value);
    setPage(1);
  };

  /** Handle model filter change. */
  const handleModelChange = (value: string): void => {
    setModelFilter(value);
    setPage(1);
  };

  /** Reset all filters. */
  const handleResetFilters = (): void => {
    setSearchInput("");
    setSearchTerm("");
    setModelFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const totalPages: number = usageData
    ? Math.max(1, Math.ceil(usageData.total / usageData.pageSize))
    : 1;

  // Filter usage data by search term (client-side email/userId filter)
  const filteredList = useMemo(() => {
    if (!usageData?.list) return [];
    if (!searchTerm) return usageData.list;
    const term = searchTerm.toLowerCase();
    return usageData.list.filter(
      (log) =>
        String(log.userId).includes(term) ||
        (log.model ?? "").toLowerCase().includes(term) ||
        (log.endpoint ?? "").toLowerCase().includes(term)
    );
  }, [usageData, searchTerm]);

  // Stat cards
  const statCards: StatCardConfig[] = useMemo(() => {
    if (!stats) {
      return [
        { label: "今日用量", value: "—", sublabel: "tokens", icon: Coins, iconColor: "text-aurora-cyan" },
        { label: "本月用量", value: "—", sublabel: "tokens", icon: CalendarDays, iconColor: "text-blue-400" },
        { label: "活跃用户", value: "—", sublabel: "今日", icon: UsersIcon, iconColor: "text-green-400" },
        { label: "今日拦截", value: "—", sublabel: "次", icon: ShieldX, iconColor: "text-amber-400" },
      ];
    }
    return [
      {
        label: "今日用量",
        value: formatNumber(stats.today.totalTokens),
        sublabel: `${stats.today.requestCount} 次请求 · ${formatCost(stats.today.totalCost)}`,
        icon: Coins,
        iconColor: "text-aurora-cyan",
      },
      {
        label: "本月用量",
        value: formatNumber(stats.thisMonth.totalTokens),
        sublabel: `${stats.thisMonth.requestCount} 次请求 · ${formatCost(stats.thisMonth.totalCost)}`,
        icon: CalendarDays,
        iconColor: "text-blue-400",
      },
      {
        label: "活跃用户",
        value: formatNumber(stats.today.uniqueUsers),
        sublabel: "今日活跃",
        icon: UsersIcon,
        iconColor: "text-green-400",
      },
      {
        label: "今日拦截",
        value: formatNumber(stats.statusBreakdown.blocked.count),
        sublabel: `近30天 ${formatNumber(stats.statusBreakdown.blocked.count)} 次`,
        icon: ShieldX,
        iconColor: "text-amber-400",
      },
    ];
  }, [stats]);

  // Chart data
  const dailyTrendData = useMemo(() => {
    if (!stats?.dailyTrend) return [];
    return stats.dailyTrend.map((d) => ({
      date: shortDate(d.date),
      tokens: d.totalTokens,
      cost: Number(d.totalCost.toFixed(4)),
      requests: d.requestCount,
    }));
  }, [stats]);

  const topUsersData = useMemo(() => {
    if (!stats?.topUsers) return [];
    return stats.topUsers.map((u) => ({
      name: u.email.length > 16 ? u.email.slice(0, 14) + "…" : u.email,
      tokens: u.totalTokens,
      cost: Number(u.totalCost.toFixed(4)),
    }));
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-400 hover:text-red-300"
            aria-label="关闭错误提示"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_8px_32px_rgba(2,6,23,0.45)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-100">
                  {statsLoading ? (
                    <span className="inline-block h-7 w-24 animate-pulse rounded bg-white/10" />
                  ) : (
                    card.value
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500">{card.sublabel}</p>
              </div>
              <div className={`rounded-lg bg-white/[0.06] p-2.5 ${card.iconColor}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Daily Trend Line Chart */}
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-aurora-cyan" />
            <h3 className="text-sm font-semibold text-slate-200">近30天用量趋势</h3>
          </div>
          {statsLoading ? (
            <div className="flex h-[260px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-aurora-cyan" />
            </div>
          ) : dailyTrendData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-slate-500">
              暂无趋势数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#8b949e", fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: "#8b949e", fontSize: 11 }}
                  tickFormatter={(v) => formatNumber(v as number)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(13,17,23,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#f0f6fc" }}
                  formatter={(value, name) => {
                    const v = Number(value) || 0;
                    if (name === "tokens") return [formatNumber(v), "Tokens"];
                    if (name === "cost") return [formatCost(v), "成本"];
                    return [formatNumber(v), name];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                  formatter={(value) => (value === "tokens" ? "Tokens" : value === "cost" ? "成本" : value)}
                />
                <Line
                  type="monotone"
                  dataKey="tokens"
                  stroke="#2EA7FF"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#3FB950"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  yAxisId="right"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#8b949e", fontSize: 11 }}
                  tickFormatter={(v) => `$${(v as number).toFixed(2)}`}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Users Bar Chart */}
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
          <div className="mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">消费 Top 10 用户（近30天）</h3>
          </div>
          {statsLoading ? (
            <div className="flex h-[260px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />
            </div>
          ) : topUsersData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-slate-500">
              暂无排行数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={topUsersData}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  tick={{ fill: "#8b949e", fontSize: 11 }}
                  tickFormatter={(v) => formatNumber(v as number)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#8b949e", fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(13,17,23,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#f0f6fc" }}
                  formatter={(value, name) => {
                    const v = Number(value) || 0;
                    if (name === "tokens") return [formatNumber(v), "Tokens"];
                    return [formatNumber(v), name];
                  }}
                />
                <Bar dataKey="tokens" fill="#2EA7FF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="搜索用户ID / 模型 / 端点..."
            aria-label="搜索用量记录"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
          />
        </div>
        <input
          type="text"
          value={modelFilter}
          onChange={(e) => handleModelChange(e.target.value)}
          placeholder="模型名称"
          aria-label="按模型筛选"
          className="w-40 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
        />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as "" | TokenUsageStatus)}
          aria-label="按状态筛选"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-game-dark">
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6]"
        >
          搜索
        </button>
        {(searchTerm || modelFilter || statusFilter) && (
          <button
            onClick={handleResetFilters}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.08]"
          >
            重置
          </button>
        )}
      </div>

      {/* Usage Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.06]">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">用户ID</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">模型</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">端点</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">Token数</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">成本</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">时间</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">状态</th>
              </tr>
            </thead>
            <tbody>
              {usageLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    加载中…
                  </td>
                </tr>
              ) : !filteredList || filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                filteredList.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/10 last:border-0 hover:bg-white/[0.08]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.userId}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-200">
                      {log.model ?? "—"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-400" title={log.endpoint ?? ""}>
                      {log.endpoint ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200">{formatNumber(log.totalTokens)}</span>
                        <span className="text-xs text-slate-500">
                          ↑{formatNumber(log.tokensIn)} ↓{formatNumber(log.tokensOut)}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      {formatCost(log.cost)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[log.status] ?? "bg-white/[0.10] text-slate-400"}`}
                      >
                        {log.status === "success" ? "成功" : log.status === "blocked" ? "已拦截" : "错误"}
                      </span>
                      {log.blockReason && (
                        <p className="mt-1 text-xs text-amber-400/80" title={log.blockReason}>
                          {log.blockReason}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usageData && usageData.total > 0 && (
          <div className="flex flex-col items-start justify-between gap-2 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center">
            <p className="text-xs text-slate-400">
              共 {usageData.total} 条记录，第 {usageData.page}/{totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="上一页"
                className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-slate-300">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="下一页"
                className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
