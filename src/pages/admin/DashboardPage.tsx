import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Activity,
  Coins,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  CalendarDays,
  BarChart3,
  Zap,
  Ban,
  Gauge,
  RefreshCw,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { apiClient } from "../../services/api";
import type {
  DashboardResponse,
  DashboardTimeRange,
  CredentialStatusEntry,
  AuditEvent,
  SecurityAlert,
} from "../../types";

// ── Constants ────────────────────────────────────────────

const RANGE_OPTIONS: { value: DashboardTimeRange; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "custom", label: "自定义" },
];

const CHART_COLORS = {
  cyan: "#2EA7FF",
  purple: "#9381FF",
  teal: "#13DDC4",
  green: "#3FB950",
  red: "#F85149",
  orange: "#D29922",
  blue: "#58A6FF",
};

const SEVERITY_CONFIG: Record<
  string,
  { bg: string; border: string; text: string; icon: string }
> = {
  critical: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    icon: "text-red-400",
  },
  warning: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    icon: "text-orange-400",
  },
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    icon: "text-blue-400",
  },
};

const CREDENTIAL_HEALTH_CONFIG: Record<
  string,
  { label: string; dot: string; text: string }
> = {
  healthy: { label: "健康", dot: "bg-green-400", text: "text-green-400" },
  unhealthy: { label: "异常", dot: "bg-red-400", text: "text-red-400" },
  unknown: { label: "未知", dot: "bg-yellow-400", text: "text-yellow-400" },
};

const CARD_BASE =
  "rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_32px_rgba(2,6,23,0.45)]";
const CHART_CARD_BASE =
  "rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_8px_32px_rgba(2,6,23,0.45)]";

// ── Helpers ──────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function formatCurrency(n: number): string {
  if (n >= 1) return "$" + n.toFixed(2);
  return "$" + n.toFixed(4);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatChartDate(iso: string): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return iso;
  }
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function monthAgoStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

// ── Main Component ────────────────────────────────────────

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rangeParam = (searchParams.get("range") ?? "month") as DashboardTimeRange;
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";

  const effectiveRange: DashboardTimeRange = useMemo(() => {
    if (
      rangeParam === "today" ||
      rangeParam === "week" ||
      rangeParam === "month" ||
      rangeParam === "custom"
    ) {
      return rangeParam;
    }
    return "month";
  }, [rangeParam]);

  const [customFrom, setCustomFrom] = useState<string>(
    fromParam || monthAgoStr()
  );
  const [customTo, setCustomTo] = useState<string>(toParam || todayStr());

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");
      const from =
        effectiveRange === "custom" ? customFrom : undefined;
      const to = effectiveRange === "custom" ? customTo : undefined;
      const res = await apiClient.getAdminDashboard(effectiveRange, from, to);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [effectiveRange, customFrom, customTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRangeChange = (r: DashboardTimeRange): void => {
    const params: Record<string, string> = { range: r };
    if (r === "custom") {
      params.from = customFrom;
      params.to = customTo;
    }
    setSearchParams(params);
  };

  const handleCustomDateApply = (): void => {
    setSearchParams({
      range: "custom",
      from: customFrom,
      to: customTo,
    });
  };

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#2EA7FF]" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={loadData}
          className="rounded-md bg-[#2EA7FF] px-4 py-2 text-sm text-white transition-colors hover:bg-[#1d8ad6]"
        >
          重试
        </button>
      </div>
    );
  }

  if (!data) return null;

  const summaryCards = [
    {
      label: "总用户数",
      value: data.summary.totalUsers,
      icon: Users,
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
    },
    {
      label: "活跃用户",
      value: data.summary.activeUsers,
      icon: Activity,
      iconBg: "bg-teal-500/15",
      iconColor: "text-teal-400",
    },
    {
      label: "今日Token用量",
      value: formatNumber(data.consumption.todayTokens),
      icon: Coins,
      iconBg: "bg-purple-500/15",
      iconColor: "text-purple-400",
    },
    {
      label: "本月成本",
      value: formatCurrency(data.consumption.monthCost),
      icon: DollarSign,
      iconBg: "bg-green-500/15",
      iconColor: "text-green-400",
    },
    {
      label: "凭证健康",
      value: `${data.credentials.healthy}/${data.credentials.total}`,
      icon: ShieldCheck,
      iconBg: "bg-cyan-500/15",
      iconColor: "text-cyan-400",
    },
    {
      label: "安全告警",
      value: data.security.alerts.length,
      icon: AlertTriangle,
      iconBg: "bg-orange-500/15",
      iconColor: "text-orange-400",
    },
  ];

  const consumptionCards = [
    {
      label: "今日请求数",
      value: formatNumber(data.consumption.todayRequests),
      icon: Zap,
      tint: "bg-blue-500/[0.06]",
    },
    {
      label: "本月请求数",
      value: formatNumber(data.consumption.monthRequests),
      icon: BarChart3,
      tint: "bg-purple-500/[0.06]",
    },
    {
      label: "被拦截请求",
      value: formatNumber(data.consumption.blockedRequests),
      icon: Ban,
      tint: "bg-red-500/[0.06]",
    },
    {
      label: "配额耗尽用户",
      value: data.rateLimits.quotaExhaustedUsers,
      icon: Gauge,
      tint: "bg-orange-500/[0.06]",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Time Range Selector ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRangeChange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                effectiveRange === opt.value
                  ? "bg-[#2EA7FF] text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {effectiveRange === "custom" && (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-200 outline-none transition-colors focus:border-[#2EA7FF]"
            />
            <span className="text-slate-500">—</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayStr()}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-200 outline-none transition-colors focus:border-[#2EA7FF]"
            />
            <button
              onClick={handleCustomDateApply}
              className="rounded-md bg-[#2EA7FF] px-3 py-1.5 text-sm text-white transition-colors hover:bg-[#1d8ad6]"
            >
              应用
            </button>
          </div>
        )}

        <button
          onClick={loadData}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200 hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      {/* ── Summary Stats Cards (Row 1) ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <div key={card.label} className={CARD_BASE}>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg}`}
              >
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-slate-400">{card.label}</p>
                <p className="text-xl font-bold text-slate-100">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Consumption Overview Cards (Row 2) ── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {consumptionCards.map((card) => (
          <div
            key={card.label}
            className={`${CARD_BASE} ${card.tint}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-100">
                  {card.value}
                </p>
              </div>
              <card.icon className="h-6 w-6 text-slate-500" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Grid (2x2) ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard title="Token 用量趋势" subtitle="最近30天">
          <TokenTrendChart data={data.charts.tokenTrend} />
        </ChartCard>

        <ChartCard title="用户增长趋势" subtitle="最近30天每日新增">
          <UserGrowthChart data={data.charts.userGrowth} />
        </ChartCard>

        <ChartCard title="小时分布" subtitle="今日0-23时请求量">
          <HourlyTrendChart data={data.charts.hourlyTrend} />
        </ChartCard>

        <ChartCard title="Top 消费者" subtitle="选定范围内消费最高的用户">
          <TopConsumersChart data={data.charts.topConsumers} />
        </ChartCard>
      </div>

      {/* ── Credential Health + Security Alerts (Row) ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className={CHART_CARD_BASE}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">
              凭证健康状态
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                健康 {data.credentials.healthy}
              </span>
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                异常 {data.credentials.unhealthy}
              </span>
            </div>
          </div>
          <CredentialStatusList list={data.credentials.statusList} />
        </div>

        <div className={CHART_CARD_BASE}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">
              安全告警
            </h2>
            <span className="text-xs text-slate-400">
              共 {data.security.alerts.length} 条
            </span>
          </div>
          <SecurityAlertList alerts={data.security.alerts} />
        </div>
      </div>

      {/* ── Security Audit Summary ── */}
      <div className={CHART_CARD_BASE}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            安全审计摘要
          </h2>
          <span className="text-xs text-slate-400">
            最近 {data.security.recentAuditEvents.length} 条操作记录
          </span>
        </div>
        <AuditEventTable events={data.security.recentAuditEvents} />
      </div>
    </div>
  );
}

// ── Chart Card Wrapper ────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={CHART_CARD_BASE}>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d0a26] px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-slate-400">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Token Trend Chart ─────────────────────────────────────

function TokenTrendChart({
  data,
}: {
  data: DashboardResponse["charts"]["tokenTrend"];
}) {
  const chartData = data.map((d) => ({
    date: formatChartDate(d.date),
    tokens: d.tokens ?? 0,
  }));

  if (chartData.length === 0) {
    return <EmptyChart />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.cyan} stopOpacity={0.4} />
            <stop offset="100%" stopColor={CHART_COLORS.cyan} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#8B949E", fontSize: 12 }}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#8B949E", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatNumber}
        />
        <Tooltip
          content={<CustomTooltip formatter={formatNumber} />}
        />
        <Area
          type="monotone"
          dataKey="tokens"
          stroke={CHART_COLORS.cyan}
          strokeWidth={2}
          fill="url(#tokenGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── User Growth Chart ──────────────────────────────────────

function UserGrowthChart({
  data,
}: {
  data: DashboardResponse["charts"]["userGrowth"];
}) {
  const chartData = data.map((d) => ({
    date: formatChartDate(d.date),
    count: d.count ?? 0,
  }));

  if (chartData.length === 0) {
    return <EmptyChart />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.purple} stopOpacity={0.4} />
            <stop offset="100%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#8B949E", fontSize: 12 }}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#8B949E", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          content={<CustomTooltip />}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={CHART_COLORS.purple}
          strokeWidth={2}
          fill="url(#userGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Hourly Trend Chart ─────────────────────────────────────

function HourlyTrendChart({
  data,
}: {
  data: DashboardResponse["charts"]["hourlyTrend"];
}) {
  const chartData = data.map((d) => ({
    hour: `${d.hour}h`,
    count: d.count,
  }));

  if (chartData.length === 0) {
    return <EmptyChart />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="hour"
          tick={{ fill: "#8B949E", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tick={{ fill: "#8B949E", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatNumber}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={<CustomTooltip />}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS.teal} fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Top Consumers Chart ────────────────────────────────────

function TopConsumersChart({
  data,
}: {
  data: DashboardResponse["charts"]["topConsumers"];
}) {
  const chartData = data.map((d) => ({
    name: d.username || `用户${d.userId}`,
    tokens: d.tokens,
  }));

  if (chartData.length === 0) {
    return <EmptyChart />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#8B949E", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatNumber}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#8B949E", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={<CustomTooltip formatter={formatNumber} />}
        />
        <Bar dataKey="tokens" radius={[0, 3, 3, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS.cyan} fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Empty Chart Placeholder ────────────────────────────────

function EmptyChart() {
  return (
    <div className="flex h-[240px] items-center justify-center">
      <div className="text-center">
        <BarChart3 className="mx-auto mb-2 h-8 w-8 text-slate-600" />
        <p className="text-sm text-slate-500">暂无数据</p>
      </div>
    </div>
  );
}

// ── Credential Status List ─────────────────────────────────

function CredentialStatusList({
  list,
}: {
  list: CredentialStatusEntry[];
}) {
  if (list.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        暂无凭证数据
      </div>
    );
  }

  return (
    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
      {list.map((cred) => {
        const health =
          CREDENTIAL_HEALTH_CONFIG[cred.lastHealthStatus] ??
          CREDENTIAL_HEALTH_CONFIG.unknown;
        return (
          <div
            key={cred.id}
            className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">
                {cred.name}
              </p>
              <p className="text-xs text-slate-400">{cred.provider}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-500 sm:inline">
                {cred.lastHealthCheck
                  ? formatDate(cred.lastHealthCheck)
                  : "未检查"}
              </span>
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${health.text} bg-white/5`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${health.dot}`} />
                {health.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Security Alert List ────────────────────────────────────

function SecurityAlertList({ alerts }: { alerts: SecurityAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        暂无安全告警
      </div>
    );
  }

  return (
    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
      {alerts.map((alert, i) => {
        const config =
          SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
        const time =
          (alert.createdAt as string) ||
          (alert.lastTriggered as string) ||
          "";
        const desc = formatAlertDescription(alert);
        return (
          <div
            key={i}
            className={`rounded-lg border px-4 py-2.5 ${config.bg} ${config.border}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-sm font-medium ${config.text}`}>
                  {formatAlertType(alert.type)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {desc}
                </p>
              </div>
              {time && (
                <span className="shrink-0 text-xs text-slate-500">
                  {formatDate(time)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatAlertType(type: string): string {
  const map: Record<string, string> = {
    rate_limit_violation: "速率限制违规",
    user_banned: "用户被封禁",
    user_unbanned: "用户被解封",
    credential_delete: "凭证被删除",
    credential_test: "凭证测试",
    credential_renew: "凭证续期",
    credential_action: "凭证操作",
    encryption_key_operation: "加密密钥操作",
  };
  return map[type] ?? type;
}

function formatAlertDescription(alert: SecurityAlert): string {
  const parts: string[] = [];
  if (alert.userId) parts.push(`用户#${alert.userId}`);
  if (alert.username) parts.push(alert.username as string);
  if (alert.endpoint) parts.push(alert.endpoint as string);
  if (alert.reason) parts.push(alert.reason as string);
  if (alert.operatorName) parts.push(`操作者: ${alert.operatorName}`);
  if (alert.ip) parts.push(alert.ip as string);
  if (alert.count) parts.push(`${alert.count} 次`);
  return parts.join(" · ") || "无详细信息";
}

// ── Audit Event Table ──────────────────────────────────────

function AuditEventTable({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        暂无审计记录
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs text-slate-400">
            <th className="pb-2 pr-4 font-medium">时间</th>
            <th className="pb-2 pr-4 font-medium">操作者</th>
            <th className="pb-2 pr-4 font-medium">操作</th>
            <th className="pb-2 pr-4 font-medium">模块</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, i) => {
            const isBan =
              event.action === "ban" || event.action === "user_banned";
            const isKeyOp =
              event.module === "security" ||
              (event.action ?? "").includes("encrypt") ||
              (event.action ?? "").includes("key");
            const actionClass = isBan
              ? "text-red-400 font-medium"
              : isKeyOp
                ? "text-orange-400 font-medium"
                : "text-slate-200";
            const operator =
              event.operatorName ||
              event.username ||
              `用户#${event.userId}`;
            return (
              <tr
                key={i}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
              >
                <td className="py-2.5 pr-4 text-xs text-slate-400 whitespace-nowrap">
                  {event.createdAt ? formatDate(event.createdAt) : "—"}
                </td>
                <td className="py-2.5 pr-4 text-slate-300 whitespace-nowrap">
                  {operator}
                </td>
                <td className={`py-2.5 pr-4 ${actionClass}`}>
                  {event.action}
                  {event.target ? (
                    <span className="ml-1 text-xs text-slate-500">
                      → {event.target}
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">
                  {event.module || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
