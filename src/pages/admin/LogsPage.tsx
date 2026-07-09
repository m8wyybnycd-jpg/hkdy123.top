import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Download,
  AlertCircle,
  Activity,
  LogIn,
} from "lucide-react";
import { apiClient } from "../../services/api";
import type {
  OperationLog,
  LoginLog,
  PaginatedResponse,
  LogQueryParams,
} from "../../types";

/** Default page size for log lists. */
const DEFAULT_PAGE_SIZE = 20;

/** Tab identifiers. */
type LogTab = "operation" | "login";

/** Tab configuration. */
const TABS: { id: LogTab; label: string; icon: typeof Activity }[] = [
  { id: "operation", label: "操作日志", icon: Activity },
  { id: "login", label: "登录日志", icon: LogIn },
];

/** Module filter options for operation logs. */
const MODULE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "全部模块" },
  { value: "user", label: "用户" },
  { value: "role", label: "角色" },
  { value: "platform", label: "平台" },
  { value: "desktop", label: "云电脑" },
  { value: "deal", label: "薅羊毛" },
  { value: "game", label: "游戏" },
  { value: "announcement", label: "公告" },
  { value: "message", label: "消息" },
  { value: "settings", label: "设置" },
];

/** Action badge color mapping. */
const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-50 text-green-500",
  update: "bg-blue-50 text-blue-500",
  delete: "bg-red-50 text-red-500",
  login: "bg-purple-50 text-purple-500",
  logout: "bg-slate-100 text-slate-500",
};

/** Status badge color mapping for login logs. */
const LOGIN_STATUS_COLORS: Record<string, string> = {
  success: "bg-green-50 text-green-500",
  fail: "bg-red-50 text-red-500",
};

/**
 * Admin logs viewing page with two tabs: operation logs and login logs.
 *
 * Features:
 * - Tab switching between operation and login logs
 * - Search by username, filter by module (operation) / date range
 * - Pagination
 * - CSV export (opens download link with auth token)
 */
export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<LogTab>("operation");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">日志查看</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#3b9eff] text-[#3b9eff]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "operation" ? (
        <OperationLogsTab />
      ) : (
        <LoginLogsTab />
      )}
    </div>
  );
}

// ── Operation Logs Tab ────────────────────────────────────

/** Operation logs tab with search, module filter, pagination, and CSV export. */
function OperationLogsTab() {
  const [data, setData] = useState<PaginatedResponse<OperationLog> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const fetchLogs = useCallback(
    async (search: string, module: string, pageNum: number): Promise<void> => {
      try {
        setLoading(true);
        setError("");
        const params: LogQueryParams = {
          search: search || undefined,
          module: module || undefined,
          page: pageNum,
          pageSize: DEFAULT_PAGE_SIZE,
        };
        const res = await apiClient.getOperationLogs(params);
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
    fetchLogs(searchTerm, moduleFilter, page);
  }, [fetchLogs, searchTerm, moduleFilter, page]);

  const handleSearch = (): void => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleModuleChange = (value: string): void => {
    setPage(1);
    setModuleFilter(value);
  };

  const handleExport = (): void => {
    const params: LogQueryParams = {
      search: searchTerm || undefined,
      module: moduleFilter || undefined,
    };
    const url = apiClient.getOperationLogsExportUrl(params);
    // Open in new tab with auth token via fetch
    downloadCSV(url);
  };

  const totalPages: number = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="搜索用户名..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
          />
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => handleModuleChange(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
        >
          {MODULE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8ae6]"
        >
          搜索
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          导出CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 font-semibold text-slate-600">用户</th>
                <th className="px-4 py-3 font-semibold text-slate-600">操作</th>
                <th className="px-4 py-3 font-semibold text-slate-600">模块</th>
                <th className="px-4 py-3 font-semibold text-slate-600">目标</th>
                <th className="px-4 py-3 font-semibold text-slate-600">IP</th>
                <th className="px-4 py-3 font-semibold text-slate-600">时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    加载中…
                  </td>
                </tr>
              ) : !data || data.list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.list.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-500">{log.id}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.username ?? `用户#${log.userId ?? "?"}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-500"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{log.module}</td>
                    <td className="px-4 py-3 text-slate-500">{log.target ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{log.ip ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-400">
              共 {data.total} 条记录，第 {data.page}/{totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                上一页
              </button>
              <span className="text-sm text-slate-600">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Login Logs Tab ────────────────────────────────────────

/** Login logs tab with search, date filter, pagination, and CSV export. */
function LoginLogsTab() {
  const [data, setData] = useState<PaginatedResponse<LoginLog> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const fetchLogs = useCallback(
    async (search: string, pageNum: number): Promise<void> => {
      try {
        setLoading(true);
        setError("");
        const params: LogQueryParams = {
          search: search || undefined,
          page: pageNum,
          pageSize: DEFAULT_PAGE_SIZE,
        };
        const res = await apiClient.getLoginLogs(params);
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
    fetchLogs(searchTerm, page);
  }, [fetchLogs, searchTerm, page]);

  const handleSearch = (): void => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleExport = (): void => {
    const params: LogQueryParams = {
      search: searchTerm || undefined,
    };
    const url = apiClient.getLoginLogsExportUrl(params);
    downloadCSV(url);
  };

  const totalPages: number = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="搜索用户名..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8ae6]"
        >
          搜索
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          导出CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 font-semibold text-slate-600">用户</th>
                <th className="px-4 py-3 font-semibold text-slate-600">状态</th>
                <th className="px-4 py-3 font-semibold text-slate-600">方式</th>
                <th className="px-4 py-3 font-semibold text-slate-600">IP</th>
                <th className="px-4 py-3 font-semibold text-slate-600">时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    加载中…
                  </td>
                </tr>
              ) : !data || data.list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.list.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-500">{log.id}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.username ?? `用户#${log.userId ?? "?"}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LOGIN_STATUS_COLORS[log.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {log.status === "success" ? "成功" : "失败"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.method === "email" ? "邮箱" : log.method === "sms" ? "短信" : log.method ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{log.ip ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-400">
              共 {data.total} 条记录，第 {data.page}/{totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                上一页
              </button>
              <span className="text-sm text-slate-600">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Download CSV from an API URL with cookie-based authentication.
 *
 * Fetches the CSV with credentials, creates a Blob URL, and triggers download.
 */
async function downloadCSV(url: string): Promise<void> {
  try {
    const response = await fetch(url, {
      credentials: "include",
    });
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `logs_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Non-fatal: export failed
  }
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
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}
