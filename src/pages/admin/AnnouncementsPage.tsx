import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  AlertTriangle,
  X,
  Megaphone,
} from "lucide-react";
import { apiClient } from "../../services/api";
import { usePermission } from "../../contexts/PermissionContext";
import type {
  Announcement,
  AnnouncementType,
  AnnouncementStatus,
  PaginatedResponse,
} from "../../types";
import HasPermission from "../../components/HasPermission";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/** Default page size for the announcement list. */
const DEFAULT_PAGE_SIZE = 20;

/** Status filter options. */
const STATUS_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: "全部" },
  { value: 0, label: "草稿" },
  { value: 1, label: "已发布" },
  { value: 2, label: "已归档" },
];

/** Type options. */
const TYPE_OPTIONS: { value: AnnouncementType; label: string }[] = [
  { value: "notice", label: "通知" },
  { value: "announcement", label: "公告" },
  { value: "maintenance", label: "维护" },
];

/** Status badge style mapping. */
const STATUS_BADGES: Record<number, { label: string; className: string }> = {
  0: { label: "草稿", className: "bg-slate-100 text-slate-500" },
  1: { label: "已发布", className: "bg-green-50 text-green-500" },
  2: { label: "已归档", className: "bg-amber-50 text-amber-500" },
};

/** Type badge style mapping. */
const TYPE_BADGES: Record<string, string> = {
  notice: "bg-blue-50 text-blue-500",
  announcement: "bg-purple-50 text-purple-500",
  maintenance: "bg-orange-50 text-orange-500",
};

/**
 * Admin announcements management page.
 *
 * Features: paginated table, status filter, create/edit modal, delete confirmation.
 * Button-level permission control via HasPermission component.
 */
export default function AnnouncementsPage() {
  const [data, setData] = useState<PaginatedResponse<Announcement> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);

  const fetchAnnouncements = useCallback(
    async (status: number | undefined, pageNum: number): Promise<void> => {
      try {
        setLoading(true);
        setError("");
        const res = await apiClient.getAdminAnnouncements(status, pageNum, DEFAULT_PAGE_SIZE);
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
    fetchAnnouncements(statusFilter, page);
  }, [fetchAnnouncements, statusFilter, page]);

  const handleOpenCreate = (): void => {
    setEditingAnn(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (ann: Announcement): void => {
    setEditingAnn(ann);
    setEditModalOpen(true);
  };

  const handleStatusFilterChange = (status: number | undefined): void => {
    setPage(1);
    setStatusFilter(status);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      setActionLoading(deleteTarget.id);
      await apiClient.deleteAnnouncement(deleteTarget.id);
      setDeleteTarget(null);
      await fetchAnnouncements(statusFilter, page);
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
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">公告管理</h1>
        <HasPermission code="announcement:manage">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-lg bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8ae6]"
          >
            <Plus className="h-4 w-4" />
            新建公告
          </button>
        </HasPermission>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
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

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 font-semibold text-slate-600">标题</th>
                <th className="px-4 py-3 font-semibold text-slate-600">类型</th>
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
                data.list.map((ann) => (
                  <tr
                    key={ann.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-500">{ann.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">{ann.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGES[ann.type] ?? "bg-slate-100 text-slate-500"}`}>
                        {TYPE_OPTIONS.find((t) => t.value === ann.type)?.label ?? ann.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[ann.status]?.className ?? "bg-slate-100 text-slate-500"}`}>
                        {STATUS_BADGES[ann.status]?.label ?? "未知"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ann.sortOrder}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(ann.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <HasPermission code="announcement:manage">
                          <button
                            onClick={() => handleOpenEdit(ann)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            aria-label="编辑"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">编辑</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(ann)}
                            disabled={actionLoading === ann.id}
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

      {/* Edit/Create Modal */}
      <AnnouncementEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => fetchAnnouncements(statusFilter, page)}
        announcement={editingAnn}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="确认删除公告"
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">确认删除</h3>
            </div>
            <p className="text-sm text-slate-500">
              确定要删除公告{" "}
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

// ── Edit/Create Modal Component ───────────────────────────

interface AnnouncementEditModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  announcement: Announcement | null;
}

/**
 * Announcement create/edit modal.
 *
 * Create mode: announcement is null.
 * Edit mode: announcement has existing data.
 */
function AnnouncementEditModal({
  open,
  onClose,
  onSaved,
  announcement,
}: AnnouncementEditModalProps) {
  const isEdit = announcement !== null;
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, open, onClose);

  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [type, setType] = useState<AnnouncementType>("notice");
  const [status, setStatus] = useState<AnnouncementStatus>(0);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Populate form when opening
  useEffect(() => {
    if (open) {
      setTitle(announcement?.title ?? "");
      setContent(announcement?.content ?? "");
      setType(announcement?.type ?? "notice");
      setStatus(announcement?.status ?? 0);
      setSortOrder(announcement?.sortOrder ?? 0);
      setError("");
    }
  }, [open, announcement]);

  const handleSubmit = async (): Promise<void> => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError("公告标题不能为空");
      return;
    }
    if (!trimmedContent) {
      setError("公告内容不能为空");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = {
        title: trimmedTitle,
        content: trimmedContent,
        type,
        status,
        sortOrder,
      };

      if (isEdit && announcement) {
        await apiClient.updateAnnouncement(announcement.id, data);
      } else {
        await apiClient.createAnnouncement(data);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "编辑公告" : "新建公告"}
        className="w-full max-w-lg rounded-lg bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">
            {isEdit ? "编辑公告" : "新建公告"}
          </h3>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              公告标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入公告标题"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
            />
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AnnouncementType)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              公告内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入公告内容"
              rows={5}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(Number(e.target.value) as AnnouncementStatus)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
            >
              <option value={0}>草稿</option>
              <option value={1}>已发布</option>
              <option value={2}>已归档</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">排序值</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
            />
            <p className="mt-1 text-xs text-slate-400">数值越大越靠前显示</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-md bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8ae6] disabled:opacity-50"
          >
            {loading ? "保存中…" : "保存"}
          </button>
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
