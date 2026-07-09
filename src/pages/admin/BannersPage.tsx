import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  AlertTriangle,
  X,
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
  Search,
} from "lucide-react";
import { apiClient } from "../../services/api";
import type { Banner, PaginatedResponse } from "../../types";
import HasPermission from "../../components/HasPermission";
import BannerFormDialog from "./BannerFormDialog";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/** Default page size for the banner list. */
const DEFAULT_PAGE_SIZE = 20;

/** Status filter options. */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "全部" },
  { value: "active", label: "启用" },
  { value: "inactive", label: "禁用" },
];

/**
 * Admin banners management page.
 *
 * Features: paginated table, title search, status filter,
 * create/edit dialog, toggle active, delete confirmation.
 */
export default function BannersPage() {
  const [data, setData] = useState<PaginatedResponse<Banner> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const fetchBanners = useCallback(
    async (searchVal: string, status: string, pageNum: number): Promise<void> => {
      try {
        setLoading(true);
        setError("");
        const res = await apiClient.getAdminBanners(
          searchVal || undefined,
          status || undefined,
          pageNum,
          DEFAULT_PAGE_SIZE
        );
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
    fetchBanners(search, statusFilter, page);
  }, [fetchBanners, search, statusFilter, page]);

  const handleOpenCreate = (): void => {
    setEditingBanner(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (banner: Banner): void => {
    setEditingBanner(banner);
    setEditModalOpen(true);
  };

  const handleSearch = (): void => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleStatusFilterChange = (status: string): void => {
    setPage(1);
    setStatusFilter(status);
  };

  const handleToggle = async (banner: Banner): Promise<void> => {
    try {
      setActionLoading(banner.id);
      await apiClient.toggleBanner(banner.id);
      await fetchBanners(search, statusFilter, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "切换失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      setActionLoading(deleteTarget.id);
      await apiClient.deleteBanner(deleteTarget.id);
      setDeleteTarget(null);
      await fetchBanners(search, statusFilter, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setActionLoading(null);
    }
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
            aria-label="关闭错误提示"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">轮播图管理</h1>
        <HasPermission code="banner:write">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-lg bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8ae6]"
          >
            <Plus className="h-4 w-4" />
            新建轮播图
          </button>
        </HasPermission>
      </div>

      {/* Search + Status Filter */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="搜索标题…"
              aria-label="搜索轮播图"
              className="w-48 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            搜索
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusFilterChange(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-[#3b9eff] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 font-semibold text-slate-600">图片</th>
                <th className="px-4 py-3 font-semibold text-slate-600">标题</th>
                <th className="px-4 py-3 font-semibold text-slate-600">状态</th>
                <th className="px-4 py-3 font-semibold text-slate-600">排序</th>
                <th className="px-4 py-3 font-semibold text-slate-600">创建时间</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">操作</th>
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
                data.list.map((banner) => (
                  <tr
                    key={banner.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-500">{banner.id}</td>
                    <td className="px-4 py-3">
                      <div className="h-10 w-16 overflow-hidden rounded border border-slate-200 bg-slate-100">
                        {banner.imageUrl ? (
                          <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-slate-300" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-700">{banner.title}</span>
                      {banner.linkUrl && (
                        <span className="ml-1 text-xs text-slate-400">
                          → {banner.linkUrl}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          banner.isActive === 1
                            ? "bg-green-50 text-green-500"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {banner.isActive === 1 ? "启用" : "禁用"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{banner.sortOrder}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(banner.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <HasPermission code="banner:write">
                          <button
                            onClick={() => handleToggle(banner)}
                            disabled={actionLoading === banner.id}
                            title={banner.isActive === 1 ? "点击禁用" : "点击启用"}
                            aria-label={banner.isActive === 1 ? "禁用" : "启用"}
                            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${
                              banner.isActive === 1
                                ? "text-green-500 hover:bg-green-50"
                                : "text-slate-400 hover:bg-slate-100"
                            }`}
                          >
                            {banner.isActive === 1 ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(banner)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            aria-label="编辑"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">编辑</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(banner)}
                            disabled={actionLoading === banner.id}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                            aria-label="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">删除</span>
                          </button>
                        </HasPermission>
                      </div>
                    </td>
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

      {/* Edit/Create Dialog */}
      <BannerFormDialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => fetchBanners(search, statusFilter, page)}
        banner={editingBanner}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="确认删除轮播图"
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">确认删除</h3>
            </div>
            <p className="text-sm text-slate-500">
              确定要删除轮播图{" "}
              <span className="font-medium text-slate-700">{deleteTarget.title}</span>{" "}
              吗？此操作不可撤销。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === deleteTarget.id}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading === deleteTarget.id ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
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
