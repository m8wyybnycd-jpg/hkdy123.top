import { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  KeyRound,
  FileLock2,
  X,
  Search,
} from "lucide-react";
import { apiClient } from "../../services/api";
import type {
  UserStatusLog,
  CredentialAuditLog,
  CredentialDecryptLog,
  PaginatedResponse,
} from "../../types";

const DEFAULT_PAGE_SIZE = 20;

type AuditTab = "status" | "credential" | "decrypt";

/** Action label/color mapping for user status logs. */
const STATUS_ACTION_META: Record<string, { label: string; color: string }> = {
  ban: { label: "封禁", color: "bg-red-500/15 text-red-400" },
  unban: { label: "解封", color: "bg-green-500/15 text-green-400" },
  level_change: { label: "等级变更", color: "bg-blue-500/15 text-blue-400" },
  role_change: { label: "角色变更", color: "bg-purple-500/15 text-purple-400" },
};

/** Action label/color mapping for credential audit logs. */
const CRED_ACTION_META: Record<string, { label: string; color: string }> = {
  create: { label: "创建", color: "bg-green-500/15 text-green-400" },
  view: { label: "查看", color: "bg-blue-500/15 text-blue-400" },
  update: { label: "更新", color: "bg-amber-500/15 text-amber-400" },
  delete: { label: "删除", color: "bg-red-500/15 text-red-400" },
  test: { label: "测试", color: "bg-purple-500/15 text-purple-400" },
  renew: { label: "续期", color: "bg-aurora-cyan/15 text-aurora-cyan" },
};

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

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<AuditTab>("status");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1">
        <AuditTabButton active={activeTab === "status"} onClick={() => setActiveTab("status")} icon={Shield} label="操作审计" />
        <AuditTabButton active={activeTab === "credential"} onClick={() => setActiveTab("credential")} icon={KeyRound} label="凭证审计" />
        <AuditTabButton active={activeTab === "decrypt"} onClick={() => setActiveTab("decrypt")} icon={FileLock2} label="解密日志" />
      </div>

      {activeTab === "status" && <StatusLogSection />}
      {activeTab === "credential" && <CredentialLogSection />}
      {activeTab === "decrypt" && <DecryptLogSection />}
    </div>
  );
}

interface AuditTabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: typeof Shield;
  label: string;
}

function AuditTabButton({ active, onClick, icon: Icon, label }: AuditTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-[#2EA7FF] text-white" : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ── Shared Filter Bar ─────────────────────────────────────

interface FilterBarProps {
  actionFilter: string;
  onActionChange: (v: string) => void;
  actionOptions: { value: string; label: string }[];
  dateFrom: string;
  onDateFromChange: (v: string) => void;
  dateTo: string;
  onDateToChange: (v: string) => void;
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  onSearch: () => void;
  onReset: () => void;
  searchPlaceholder: string;
}

function FilterBar(props: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={props.searchInput}
          onChange={(e) => props.onSearchInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") props.onSearch(); }}
          placeholder={props.searchPlaceholder}
          aria-label="搜索"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
        />
      </div>
      <select
        value={props.actionFilter}
        onChange={(e) => props.onActionChange(e.target.value)}
        aria-label="按操作筛选"
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
      >
        {props.actionOptions.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0D1117]">{opt.label}</option>
        ))}
      </select>
      <input
        type="date"
        value={props.dateFrom}
        onChange={(e) => props.onDateFromChange(e.target.value)}
        aria-label="开始日期"
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
      />
      <span className="text-slate-500">—</span>
      <input
        type="date"
        value={props.dateTo}
        onChange={(e) => props.onDateToChange(e.target.value)}
        aria-label="结束日期"
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
      />
      <button onClick={props.onSearch} className="rounded-lg bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6]">搜索</button>
      <button onClick={props.onReset} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.08]">重置</button>
    </div>
  );
}

// ── Shared Pagination ─────────────────────────────────────

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}

function Pagination({ total, page, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-col items-start justify-between gap-2 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center">
      <p className="text-xs text-slate-400">共 {total} 条记录，第 {page}/{totalPages} 页</p>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} aria-label="上一页" className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-slate-300">{page}</span>
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} aria-label="下一页" className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Shared Error Banner ───────────────────────────────────

function ErrorBanner({ error, onClose }: { error: string; onClose: () => void }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-400">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{error}</span>
      <button onClick={onClose} className="ml-auto text-red-400 hover:text-red-300" aria-label="关闭错误提示">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Status Log Section (user_status_logs)
// ══════════════════════════════════════════════════════════

function StatusLogSection() {
  const [data, setData] = useState<PaginatedResponse<UserStatusLog> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const fetch = useCallback(
    async (pageNum: number, search: string, action: string, from: string, to: string): Promise<void> => {
      try {
        setLoading(true);
        setError("");
        const res = await apiClient.getUserStatusLogs({
          page: pageNum,
          pageSize: DEFAULT_PAGE_SIZE,
          action: action || undefined,
          operator: search || undefined,
          dateFrom: from ? new Date(from).toISOString() : undefined,
          dateTo: to ? new Date(to + "T23:59:59").toISOString() : undefined,
        });
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetch(page, searchTerm, actionFilter, dateFrom, dateTo);
  }, [fetch, page, searchTerm, actionFilter, dateFrom, dateTo]);

  const handleSearch = (): void => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleReset = (): void => {
    setSearchInput("");
    setSearchTerm("");
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onClose={() => setError("")} />

      <FilterBar
        actionFilter={actionFilter}
        onActionChange={(v) => { setActionFilter(v); setPage(1); }}
        actionOptions={[
          { value: "", label: "全部操作" },
          { value: "ban", label: "封禁" },
          { value: "unban", label: "解封" },
          { value: "level_change", label: "等级变更" },
          { value: "role_change", label: "角色变更" },
        ]}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
        onReset={handleReset}
        searchPlaceholder="搜索操作人..."
      />

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.06]">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">时间</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">目标用户</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">操作</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">变更</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">操作人</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">原因</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">加载中…</td></tr>
              ) : !data || data.list.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">暂无审计记录</td></tr>
              ) : (
                data.list.map((log) => {
                  const meta = STATUS_ACTION_META[log.action] ?? { label: log.action, color: "bg-white/[0.10] text-slate-400" };
                  const isAnomaly = log.action === "ban";
                  return (
                    <tr key={log.id} className={`border-b border-white/10 last:border-0 hover:bg-white/[0.08] ${isAnomaly ? "bg-red-500/[0.03]" : ""}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDateTime(log.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">{log.userEmail || `User #${log.userId}`}</span>
                          <span className="text-xs text-slate-500">ID: {log.userId}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {log.oldValue || "—"} <span className="text-slate-500">→</span> {log.newValue || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {log.operatorName || `User #${log.operatorId ?? "?"}`}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-400" title={log.reason ?? ""}>
                        {log.reason || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {data && data.total > 0 && (
          <Pagination total={data.total} page={data.page} pageSize={data.pageSize} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Credential Audit Log Section (credential_audit_logs)
// ══════════════════════════════════════════════════════════

function CredentialLogSection() {
  const [data, setData] = useState<PaginatedResponse<CredentialAuditLog> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const fetch = useCallback(
    async (pageNum: number, search: string, action: string, from: string, to: string): Promise<void> => {
      try {
        setLoading(true);
        setError("");
        const res = await apiClient.getCredentialAuditLogs({
          page: pageNum,
          pageSize: DEFAULT_PAGE_SIZE,
          action: action || undefined,
          operator: search || undefined,
          dateFrom: from ? new Date(from).toISOString() : undefined,
          dateTo: to ? new Date(to + "T23:59:59").toISOString() : undefined,
        });
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetch(page, searchTerm, actionFilter, dateFrom, dateTo);
  }, [fetch, page, searchTerm, actionFilter, dateFrom, dateTo]);

  const handleSearch = (): void => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleReset = (): void => {
    setSearchInput("");
    setSearchTerm("");
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  /** Try to parse the detail JSON for display. */
  function parseDetail(detail: string): string {
    if (!detail || detail === "{}") return "—";
    try {
      const obj = JSON.parse(detail);
      const parts: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        parts.push(`${k}: ${v}`);
      }
      return parts.join(", ") || "—";
    } catch {
      return detail;
    }
  }

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onClose={() => setError("")} />

      <FilterBar
        actionFilter={actionFilter}
        onActionChange={(v) => { setActionFilter(v); setPage(1); }}
        actionOptions={[
          { value: "", label: "全部操作" },
          { value: "create", label: "创建" },
          { value: "view", label: "查看" },
          { value: "update", label: "更新" },
          { value: "delete", label: "删除" },
          { value: "test", label: "测试" },
          { value: "renew", label: "续期" },
        ]}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
        onReset={handleReset}
        searchPlaceholder="搜索操作人..."
      />

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.06]">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">时间</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">凭证</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">操作</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">操作人</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">IP</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">详情</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">加载中…</td></tr>
              ) : !data || data.list.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">暂无审计记录</td></tr>
              ) : (
                data.list.map((log) => {
                  const meta = CRED_ACTION_META[log.action] ?? { label: log.action, color: "bg-white/[0.10] text-slate-400" };
                  const isAnomaly = log.action === "delete";
                  return (
                    <tr key={log.id} className={`border-b border-white/10 last:border-0 hover:bg-white/[0.08] ${isAnomaly ? "bg-red-500/[0.03]" : ""}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDateTime(log.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">{log.credentialName || `Credential #${log.credentialId}`}</span>
                          <span className="text-xs text-slate-500">ID: {log.credentialId}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {log.operatorName || `User #${log.operatorId ?? "?"}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <code className="text-xs text-slate-400">{log.ip || "—"}</code>
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-slate-400" title={parseDetail(log.detail)}>
                        {parseDetail(log.detail)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {data && data.total > 0 && (
          <Pagination total={data.total} page={data.page} pageSize={data.pageSize} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Decrypt Log Section (credential_decrypt_logs)
// ══════════════════════════════════════════════════════════

function DecryptLogSection() {
  const [data, setData] = useState<PaginatedResponse<CredentialDecryptLog> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [successFilter, setSuccessFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const fetch = useCallback(
    async (pageNum: number, search: string, success: string, from: string, to: string): Promise<void> => {
      try {
        setLoading(true);
        setError("");
        const res = await apiClient.getCredentialDecryptLogs({
          page: pageNum,
          pageSize: DEFAULT_PAGE_SIZE,
          callerService: search || undefined,
          success: success === "true" ? true : success === "false" ? false : undefined,
          dateFrom: from ? new Date(from).toISOString() : undefined,
          dateTo: to ? new Date(to + "T23:59:59").toISOString() : undefined,
        });
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetch(page, searchTerm, successFilter, dateFrom, dateTo);
  }, [fetch, page, searchTerm, successFilter, dateFrom, dateTo]);

  const handleSearch = (): void => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleReset = (): void => {
    setSearchInput("");
    setSearchTerm("");
    setSuccessFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onClose={() => setError("")} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="搜索调用服务..."
            aria-label="搜索"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
          />
        </div>
        <select
          value={successFilter}
          onChange={(e) => { setSuccessFilter(e.target.value); setPage(1); }}
          aria-label="按状态筛选"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
        >
          <option value="" className="bg-[#0D1117]">全部状态</option>
          <option value="true" className="bg-[#0D1117]">成功</option>
          <option value="false" className="bg-[#0D1117]">失败</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="开始日期"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
        />
        <span className="text-slate-500">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="结束日期"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
        />
        <button onClick={handleSearch} className="rounded-lg bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6]">搜索</button>
        <button onClick={handleReset} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.08]">重置</button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.06]">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">时间</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">凭证</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">状态</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">调用服务</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">调用方IP</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">密钥版本</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">错误信息</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">加载中…</td></tr>
              ) : !data || data.list.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">暂无解密记录</td></tr>
              ) : (
                data.list.map((log) => {
                  const isAnomaly = !log.success;
                  return (
                    <tr key={log.id} className={`border-b border-white/10 last:border-0 hover:bg-white/[0.08] ${isAnomaly ? "bg-red-500/[0.04]" : ""}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDateTime(log.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">{log.credentialName || `Credential #${log.credentialId}`}</span>
                          <span className="text-xs text-slate-500">ID: {log.credentialId}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {log.success ? (
                          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">成功</span>
                        ) : (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">失败</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.callerService || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <code className="text-xs text-slate-400">{log.callerIp || "—"}</code>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                        {log.keyVersion !== null ? `v${log.keyVersion}` : "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-red-400/80" title={log.errorMessage}>
                        {log.errorMessage || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {data && data.total > 0 && (
          <Pagination total={data.total} page={data.page} pageSize={data.pageSize} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
