import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Gauge,
  ShieldCheck,
  Layers,
  X,
  CheckCircle2,
  Infinity as InfinityIcon,
} from "lucide-react";
import { apiClient } from "../../services/api";
import { usePermission } from "../../contexts/PermissionContext";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import type {
  UserQuota,
  UpdateQuotaPayload,
  BatchQuotaItem,
  RateLimit,
  CreateRateLimitPayload,
  UpdateRateLimitPayload,
  PaginatedResponse,
} from "../../types";
import { RATE_LIMIT_METHODS } from "../../types/consumption";

const DEFAULT_PAGE_SIZE = 20;

type TabId = "quotas" | "rateLimits";

interface QuotaFormState {
  dailyLimit: number;
  monthlyLimit: number;
  isUnlimited: boolean;
}

interface RateLimitFormState {
  name: string;
  endpointPattern: string;
  method: string;
  maxRequests: number;
  windowSeconds: number;
  perUser: boolean;
  enabled: boolean;
}

function formatNumber(n: number): string {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return n.toLocaleString("en-US");
}

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
    });
  } catch {
    return iso;
  }
}

function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default function ConsumptionPage() {
  const [activeTab, setActiveTab] = useState<TabId>("quotas");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1">
        <TabButton
          active={activeTab === "quotas"}
          onClick={() => setActiveTab("quotas")}
          icon={Gauge}
          label="配额管理"
        />
        <TabButton
          active={activeTab === "rateLimits"}
          onClick={() => setActiveTab("rateLimits")}
          icon={ShieldCheck}
          label="速率限制"
        />
      </div>
      {activeTab === "quotas" ? <QuotaManagementSection /> : <RateLimitSection />}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: typeof Gauge;
  label: string;
}

function TabButton({ active, onClick, icon: Icon, label }: TabButtonProps) {
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

// ══════════════════════════════════════════════════════════
// Quota Management Section
// ══════════════════════════════════════════════════════════

function QuotaManagementSection() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission("quota:manage");

  const [data, setData] = useState<PaginatedResponse<UserQuota> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [editTarget, setEditTarget] = useState<UserQuota | null>(null);
  const [editForm, setEditForm] = useState<QuotaFormState>({
    dailyLimit: 100000,
    monthlyLimit: 3000000,
    isUnlimited: false,
  });
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");
  const editModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(editModalRef, !!editTarget, () => setEditTarget(null));

  const [batchOpen, setBatchOpen] = useState<boolean>(false);
  const [batchForm, setBatchForm] = useState<QuotaFormState>({
    dailyLimit: 100000,
    monthlyLimit: 3000000,
    isUnlimited: false,
  });
  const [batchResetUsage, setBatchResetUsage] = useState<boolean>(false);
  const [batchSaving, setBatchSaving] = useState<boolean>(false);
  const [batchError, setBatchError] = useState<string>("");
  const [batchResult, setBatchResult] = useState<string>("");
  const batchModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(batchModalRef, batchOpen, () => setBatchOpen(false));

  const fetchQuotas = useCallback(
    async (search: string, pageNum: number): Promise<void> => {
      try {
        setLoading(true);
        setError("");
        const res = await apiClient.getQuotas({
          page: pageNum,
          pageSize: DEFAULT_PAGE_SIZE,
          search: search || undefined,
          realtime: true,
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
    fetchQuotas(searchTerm, page);
  }, [fetchQuotas, searchTerm, page]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, searchTerm]);

  const handleSearch = (): void => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") handleSearch();
  };

  const toggleSelect = (userId: number): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = (): void => {
    if (!data?.list) return;
    const allSelected = data.list.every((q) => selectedIds.has(q.userId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        data.list.forEach((q) => next.delete(q.userId));
      } else {
        data.list.forEach((q) => next.add(q.userId));
      }
      return next;
    });
  };

  const handleOpenEdit = (quota: UserQuota): void => {
    setEditTarget(quota);
    setEditForm({
      dailyLimit: quota.dailyLimit,
      monthlyLimit: quota.monthlyLimit,
      isUnlimited: quota.isUnlimited,
    });
    setEditError("");
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editTarget) return;
    try {
      setEditSaving(true);
      setEditError("");
      const payload: UpdateQuotaPayload = {
        dailyLimit: editForm.isUnlimited ? 0 : editForm.dailyLimit,
        monthlyLimit: editForm.isUnlimited ? 0 : editForm.monthlyLimit,
        isUnlimited: editForm.isUnlimited,
      };
      await apiClient.updateQuota(editTarget.userId, payload);
      setEditTarget(null);
      await fetchQuotas(searchTerm, page);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setEditSaving(false);
    }
  };

  const handleOpenBatch = (): void => {
    setBatchForm({ dailyLimit: 100000, monthlyLimit: 3000000, isUnlimited: false });
    setBatchResetUsage(false);
    setBatchError("");
    setBatchResult("");
    setBatchOpen(true);
  };

  const handleSaveBatch = async (): Promise<void> => {
    try {
      setBatchSaving(true);
      setBatchError("");
      setBatchResult("");
      const items: BatchQuotaItem[] = Array.from(selectedIds).map((userId) => ({
        userId,
        dailyLimit: batchForm.isUnlimited ? 0 : batchForm.dailyLimit,
        monthlyLimit: batchForm.isUnlimited ? 0 : batchForm.monthlyLimit,
        isUnlimited: batchForm.isUnlimited,
        resetUsage: batchResetUsage,
      }));
      const result = await apiClient.batchUpdateQuotas({ quotas: items });
      setBatchResult(`成功 ${result.successCount} 个，失败 ${result.failureCount} 个`);
      await fetchQuotas(searchTerm, page);
      setSelectedIds(new Set());
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "批量操作失败");
    } finally {
      setBatchSaving(false);
    }
  };

  const totalPages: number = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const allOnPageSelected = useMemo(() => {
    if (!data?.list || data.list.length === 0) return false;
    return data.list.every((q) => selectedIds.has(q.userId));
  }, [data, selectedIds]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-300" aria-label="关闭错误提示">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="搜索用户邮箱或ID..."
            aria-label="搜索配额"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
          />
        </div>
        <button onClick={handleSearch} className="rounded-lg bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6]">
          搜索
        </button>
        {canManage && selectedIds.size > 0 && (
          <button
            onClick={handleOpenBatch}
            className="flex items-center gap-2 rounded-lg border border-[#2EA7FF]/30 bg-[#2EA7FF]/10 px-4 py-2 text-sm font-medium text-[#2EA7FF] hover:bg-[#2EA7FF]/20"
          >
            <Layers className="h-4 w-4" />
            批量设置 ({selectedIds.size})
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.06]">
                {canManage && (
                  <th className="whitespace-nowrap px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label="全选当前页"
                      className="h-4 w-4 rounded border-white/20 bg-white/[0.06] accent-[#2EA7FF]"
                    />
                  </th>
                )}
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">用户</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">日配额</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">日用量</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">月配额</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">月用量</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">状态</th>
                {canManage && <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-300">操作</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canManage ? 8 : 7} className="px-4 py-12 text-center text-slate-400">加载中…</td></tr>
              ) : !data || data.list.length === 0 ? (
                <tr><td colSpan={canManage ? 8 : 7} className="px-4 py-12 text-center text-slate-400">暂无数据</td></tr>
              ) : (
                data.list.map((quota) => {
                  const dailyUsed = quota.realtimeDailyUsage ?? quota.currentDailyUsage;
                  const monthlyUsed = quota.realtimeMonthlyUsage ?? quota.currentMonthlyUsage;
                  const dailyPct = quota.isUnlimited ? 0 : usagePercent(dailyUsed, quota.dailyLimit);
                  const monthlyPct = quota.isUnlimited ? 0 : usagePercent(monthlyUsed, quota.monthlyLimit);
                  const isSelected = selectedIds.has(quota.userId);
                  return (
                    <tr key={quota.userId} className={`border-b border-white/10 last:border-0 hover:bg-white/[0.08] ${isSelected ? "bg-[#2EA7FF]/[0.04]" : ""}`}>
                      {canManage && (
                        <td className="whitespace-nowrap px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(quota.userId)}
                            aria-label={`选择用户 ${quota.email ?? quota.userId}`}
                            className="h-4 w-4 rounded border-white/20 bg-white/[0.06] accent-[#2EA7FF]"
                          />
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">{quota.email ?? `User #${quota.userId}`}</span>
                          <span className="text-xs text-slate-500">ID: {quota.userId}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {quota.isUnlimited ? (
                          <span className="flex items-center gap-1 text-aurora-cyan"><InfinityIcon className="h-4 w-4" />无限</span>
                        ) : formatNumber(quota.dailyLimit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {quota.isUnlimited ? (
                          <span className="text-slate-400">{formatNumber(dailyUsed)}</span>
                        ) : (
                          <UsageCell used={dailyUsed} limit={quota.dailyLimit} percent={dailyPct} />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                        {quota.isUnlimited ? (
                          <span className="flex items-center gap-1 text-aurora-cyan"><InfinityIcon className="h-4 w-4" />无限</span>
                        ) : formatNumber(quota.monthlyLimit)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {quota.isUnlimited ? (
                          <span className="text-slate-400">{formatNumber(monthlyUsed)}</span>
                        ) : (
                          <UsageCell used={monthlyUsed} limit={quota.monthlyLimit} percent={monthlyPct} />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {quota.isDefault ? (
                          <span className="rounded-full bg-white/[0.10] px-2 py-0.5 text-xs font-medium text-slate-400">默认</span>
                        ) : quota.isUnlimited ? (
                          <span className="rounded-full bg-aurora-cyan/15 px-2 py-0.5 text-xs font-medium text-aurora-cyan">无限</span>
                        ) : (
                          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">自定义</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            onClick={() => handleOpenEdit(quota)}
                            disabled={loading}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#2EA7FF] hover:bg-aurora-cyan/10 disabled:opacity-50"
                            aria-label="编辑配额"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">编辑</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > 0 && (
          <div className="flex flex-col items-start justify-between gap-2 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center">
            <p className="text-xs text-slate-400">
              共 {data.total} 条记录，第 {data.page}/{totalPages} 页
              {selectedIds.size > 0 && ` · 已选 ${selectedIds.size} 个`}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="上一页" className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-slate-300">{page}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} aria-label="下一页" className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Quota Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={editModalRef} role="dialog" aria-modal="true" aria-label="编辑用户配额" className="w-full max-w-md rounded-lg border border-white/10 bg-[#0D1117] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">编辑配额</h3>
              <button onClick={() => setEditTarget(null)} className="rounded-md p-1 text-slate-400 hover:bg-white/[0.08]" aria-label="关闭"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              用户：<span className="font-medium text-slate-200">{editTarget.email ?? `User #${editTarget.userId}`}</span>
            </p>
            {editError && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/15 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{editError}</span>
              </div>
            )}
            <label className="mb-4 flex cursor-pointer items-center justify-between rounded-md bg-white/[0.06] px-4 py-3">
              <span className="text-sm text-slate-300">无限配额</span>
              <button type="button" role="switch" aria-checked={editForm.isUnlimited} onClick={() => setEditForm((f) => ({ ...f, isUnlimited: !f.isUnlimited }))} className={`relative h-6 w-11 rounded-full transition-colors ${editForm.isUnlimited ? "bg-[#2EA7FF]" : "bg-white/15"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${editForm.isUnlimited ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </label>
            <div className={`space-y-4 ${editForm.isUnlimited ? "pointer-events-none opacity-40" : ""}`}>
              <div>
                <label htmlFor="edit-daily-limit" className="mb-2 block text-sm text-slate-300">日配额 (tokens)</label>
                <input id="edit-daily-limit" type="number" min={0} value={editForm.dailyLimit} onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) setEditForm((f) => ({ ...f, dailyLimit: n })); }} className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]" />
              </div>
              <div>
                <label htmlFor="edit-monthly-limit" className="mb-2 block text-sm text-slate-300">月配额 (tokens)</label>
                <input id="edit-monthly-limit" type="number" min={0} value={editForm.monthlyLimit} onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) setEditForm((f) => ({ ...f, monthlyLimit: n })); }} className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditTarget(null)} disabled={editSaving} className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.08] disabled:opacity-50">取消</button>
              <button onClick={handleSaveEdit} disabled={editSaving} className="rounded-md bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6] disabled:opacity-50">{editSaving ? "保存中…" : "保存"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Quota Modal */}
      {batchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={batchModalRef} role="dialog" aria-modal="true" aria-label="批量设置配额" className="w-full max-w-md rounded-lg border border-white/10 bg-[#0D1117] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">批量设置配额</h3>
              <button onClick={() => setBatchOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-white/[0.08]" aria-label="关闭"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              将对 <span className="font-medium text-[#2EA7FF]">{selectedIds.size}</span> 个用户应用相同的配额设置。
            </p>
            {batchError && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/15 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{batchError}</span>
              </div>
            )}
            {batchResult && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-green-500/30 bg-green-500/15 px-3 py-2 text-sm text-green-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{batchResult}</span>
              </div>
            )}
            <label className="mb-4 flex cursor-pointer items-center justify-between rounded-md bg-white/[0.06] px-4 py-3">
              <span className="text-sm text-slate-300">无限配额</span>
              <button type="button" role="switch" aria-checked={batchForm.isUnlimited} onClick={() => setBatchForm((f) => ({ ...f, isUnlimited: !f.isUnlimited }))} className={`relative h-6 w-11 rounded-full transition-colors ${batchForm.isUnlimited ? "bg-[#2EA7FF]" : "bg-white/15"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${batchForm.isUnlimited ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </label>
            <div className={`space-y-4 ${batchForm.isUnlimited ? "pointer-events-none opacity-40" : ""}`}>
              <div>
                <label htmlFor="batch-daily-limit" className="mb-2 block text-sm text-slate-300">日配额 (tokens)</label>
                <input id="batch-daily-limit" type="number" min={0} value={batchForm.dailyLimit} onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) setBatchForm((f) => ({ ...f, dailyLimit: n })); }} className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]" />
              </div>
              <div>
                <label htmlFor="batch-monthly-limit" className="mb-2 block text-sm text-slate-300">月配额 (tokens)</label>
                <input id="batch-monthly-limit" type="number" min={0} value={batchForm.monthlyLimit} onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) setBatchForm((f) => ({ ...f, monthlyLimit: n })); }} className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]" />
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-center justify-between rounded-md bg-white/[0.06] px-4 py-3">
              <div>
                <span className="text-sm text-slate-300">重置用量计数器</span>
                <p className="mt-0.5 text-xs text-slate-500">将选中用户的日/月用量归零</p>
              </div>
              <button type="button" role="switch" aria-checked={batchResetUsage} onClick={() => setBatchResetUsage((v) => !v)} className={`relative h-6 w-11 rounded-full transition-colors ${batchResetUsage ? "bg-amber-500" : "bg-white/15"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${batchResetUsage ? "translate-x-[22px]" : "translate-x-0.5"}`} />
              </button>
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setBatchOpen(false)} disabled={batchSaving} className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.08] disabled:opacity-50">关闭</button>
              <button onClick={handleSaveBatch} disabled={batchSaving} className="rounded-md bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6] disabled:opacity-50">{batchSaving ? "执行中…" : `应用到 ${selectedIds.size} 个用户`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Usage Cell with Progress Bar ──────────────────────────

interface UsageCellProps {
  used: number;
  limit: number;
  percent: number;
}

function UsageCell({ used, limit, percent }: UsageCellProps) {
  const barColor = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="font-medium text-slate-200">{formatNumber(used)}</span>
        <span className="text-xs text-slate-500">/ {formatNumber(limit)}</span>
      </div>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-slate-500">{percent}%</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Rate Limit Rules Section
// ══════════════════════════════════════════════════════════

function RateLimitSection() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission("quota:manage");

  const [rules, setRules] = useState<RateLimit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<RateLimit | null>(null);
  const [form, setForm] = useState<RateLimitFormState>({
    name: "",
    endpointPattern: "/api/ai/*",
    method: "ALL",
    maxRequests: 100,
    windowSeconds: 60,
    perUser: true,
    enabled: true,
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, modalOpen, () => setModalOpen(false));

  const [deleteTarget, setDeleteTarget] = useState<RateLimit | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  const fetchRules = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");
      const res = await apiClient.getRateLimits();
      setRules(res.list ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleOpenCreate = (): void => {
    setModalMode("create");
    setEditTarget(null);
    setForm({
      name: "",
      endpointPattern: "/api/ai/*",
      method: "ALL",
      maxRequests: 100,
      windowSeconds: 60,
      perUser: true,
      enabled: true,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleOpenEdit = (rule: RateLimit): void => {
    setModalMode("edit");
    setEditTarget(rule);
    setForm({
      name: rule.name,
      endpointPattern: rule.endpointPattern,
      method: rule.method,
      maxRequests: rule.maxRequests,
      windowSeconds: rule.windowSeconds,
      perUser: rule.perUser,
      enabled: rule.enabled,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!form.name.trim() || !form.endpointPattern.trim()) {
      setFormError("规则名称和端点模式不能为空");
      return;
    }
    if (form.maxRequests <= 0 || form.windowSeconds <= 0) {
      setFormError("请求数和时间窗口必须大于 0");
      return;
    }
    try {
      setSaving(true);
      setFormError("");
      if (modalMode === "create") {
        const payload: CreateRateLimitPayload = {
          name: form.name.trim(),
          endpointPattern: form.endpointPattern.trim(),
          method: form.method,
          maxRequests: form.maxRequests,
          windowSeconds: form.windowSeconds,
          perUser: form.perUser,
          enabled: form.enabled,
        };
        await apiClient.createRateLimit(payload);
      } else if (editTarget) {
        const payload: UpdateRateLimitPayload = {
          name: form.name.trim(),
          endpointPattern: form.endpointPattern.trim(),
          method: form.method,
          maxRequests: form.maxRequests,
          windowSeconds: form.windowSeconds,
          perUser: form.perUser,
          enabled: form.enabled,
        };
        await apiClient.updateRateLimit(editTarget.id, payload);
      }
      setModalOpen(false);
      await fetchRules();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (rule: RateLimit): Promise<void> => {
    try {
      await apiClient.updateRateLimit(rule.id, { enabled: !rule.enabled });
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await apiClient.deleteRateLimit(deleteTarget.id);
      setDeleteTarget(null);
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-300" aria-label="关闭错误提示">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">共 {rules.length} 条速率限制规则</p>
        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6]"
          >
            <Plus className="h-4 w-4" />
            新建规则
          </button>
        )}
      </div>

      {/* Rate Limit Rules Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.06]">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">规则名称</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">端点模式</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">方法</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">请求限制</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">时间窗口</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">范围</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-300">状态</th>
                {canManage && <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-300">操作</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canManage ? 8 : 7} className="px-4 py-12 text-center text-slate-400">加载中…</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={canManage ? 8 : 7} className="px-4 py-12 text-center text-slate-400">暂无规则，点击「新建规则」创建</td></tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-white/10 last:border-0 hover:bg-white/[0.08]">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-200">{rule.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-xs text-aurora-cyan">{rule.endpointPattern}</code>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded-full bg-white/[0.10] px-2 py-0.5 text-xs font-medium text-slate-300">{rule.method}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">{formatNumber(rule.maxRequests)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      {rule.windowSeconds >= 3600
                        ? `${(rule.windowSeconds / 3600).toFixed(1)} 小时`
                        : rule.windowSeconds >= 60
                        ? `${Math.round(rule.windowSeconds / 60)} 分钟`
                        : `${rule.windowSeconds} 秒`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {rule.perUser ? (
                        <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400">按用户</span>
                      ) : (
                        <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-400">全局</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {canManage ? (
                        <button
                          onClick={() => handleToggleEnabled(rule)}
                          className={`relative h-5 w-9 rounded-full transition-colors ${rule.enabled ? "bg-green-500" : "bg-white/15"}`}
                          role="switch"
                          aria-checked={rule.enabled}
                          aria-label={rule.enabled ? "点击禁用" : "点击启用"}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${rule.enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                        </button>
                      ) : rule.enabled ? (
                        <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">启用</span>
                      ) : (
                        <span className="rounded-full bg-white/[0.10] px-2 py-0.5 text-xs font-medium text-slate-400">禁用</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(rule)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#2EA7FF] hover:bg-aurora-cyan/10"
                            aria-label="编辑规则"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">编辑</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(rule)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10"
                            aria-label="删除规则"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">删除</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Rate Limit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={modalRef} role="dialog" aria-modal="true" aria-label={modalMode === "create" ? "新建速率限制规则" : "编辑速率限制规则"} className="w-full max-w-lg rounded-lg border border-white/10 bg-[#0D1117] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">
                {modalMode === "create" ? "新建速率限制规则" : "编辑规则"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-white/[0.08]" aria-label="关闭">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/15 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="rl-name" className="mb-2 block text-sm text-slate-300">规则名称</label>
                <input
                  id="rl-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="如：AI 接口限流"
                  className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
                />
              </div>
              <div>
                <label htmlFor="rl-endpoint" className="mb-2 block text-sm text-slate-300">端点模式 (glob)</label>
                <input
                  id="rl-endpoint"
                  type="text"
                  value={form.endpointPattern}
                  onChange={(e) => setForm((f) => ({ ...f, endpointPattern: e.target.value }))}
                  placeholder="/api/ai/*"
                  className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
                />
                <p className="mt-1 text-xs text-slate-500">支持通配符，如 /api/ai/* 匹配所有 AI 接口</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rl-method" className="mb-2 block text-sm text-slate-300">HTTP 方法</label>
                  <select
                    id="rl-method"
                    value={form.method}
                    onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                    className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
                  >
                    {RATE_LIMIT_METHODS.map((m) => (
                      <option key={m} value={m} className="bg-[#0D1117]">{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="rl-max" className="mb-2 block text-sm text-slate-300">最大请求数</label>
                  <input
                    id="rl-max"
                    type="number"
                    min={1}
                    value={form.maxRequests}
                    onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) setForm((f) => ({ ...f, maxRequests: n })); }}
                    className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="rl-window" className="mb-2 block text-sm text-slate-300">时间窗口 (秒)</label>
                <input
                  id="rl-window"
                  type="number"
                  min={1}
                  value={form.windowSeconds}
                  onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) setForm((f) => ({ ...f, windowSeconds: n })); }}
                  className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#2EA7FF] focus:ring-1 focus:ring-[#2EA7FF]"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {form.windowSeconds >= 3600
                    ? `约 ${(form.windowSeconds / 3600).toFixed(1)} 小时`
                    : form.windowSeconds >= 60
                    ? `约 ${Math.round(form.windowSeconds / 60)} 分钟`
                    : `${form.windowSeconds} 秒`}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="rl-scope"
                    checked={form.perUser}
                    onChange={() => setForm((f) => ({ ...f, perUser: true }))}
                    className="h-4 w-4 accent-[#2EA7FF]"
                  />
                  <span className="text-sm text-slate-300">按用户限制</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="rl-scope"
                    checked={!form.perUser}
                    onChange={() => setForm((f) => ({ ...f, perUser: false }))}
                    className="h-4 w-4 accent-[#2EA7FF]"
                  />
                  <span className="text-sm text-slate-300">全局限制</span>
                </label>
              </div>
              <label className="flex cursor-pointer items-center justify-between rounded-md bg-white/[0.06] px-4 py-3">
                <span className="text-sm text-slate-300">启用此规则</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.enabled}
                  onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${form.enabled ? "bg-green-500" : "bg-white/15"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${form.enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} disabled={saving} className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.08] disabled:opacity-50">取消</button>
              <button onClick={handleSave} disabled={saving} className="rounded-md bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d8ad6] disabled:opacity-50">
                {saving ? "保存中…" : modalMode === "create" ? "创建" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={deleteModalRef} role="dialog" aria-modal="true" aria-label="确认删除规则" className="w-full max-w-sm rounded-lg border border-white/10 bg-[#0D1117] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.6)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">确认删除</h3>
            </div>
            <p className="text-sm text-slate-400">
              确定要删除规则 <span className="font-medium text-slate-200">{deleteTarget.name}</span> 吗？此操作不可撤销。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.08] disabled:opacity-50">取消</button>
              <button onClick={handleDelete} disabled={deleting} className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50">
                {deleting ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
