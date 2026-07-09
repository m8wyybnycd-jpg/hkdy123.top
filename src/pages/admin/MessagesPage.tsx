import { useEffect, useState, useCallback, useRef } from "react";
import {
  Send,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Mail,
  Users,
} from "lucide-react";
import { apiClient } from "../../services/api";
import { usePermission } from "../../contexts/PermissionContext";
import type {
  Message,
  PaginatedResponse,
} from "../../types";
import HasPermission from "../../components/HasPermission";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/** Default page size for the message list. */
const DEFAULT_PAGE_SIZE = 20;

/**
 * Admin messages management page.
 *
 * Features:
 * - Send message form (to specific user or all users)
 * - Paginated sent messages list with delete
 * - Button-level permission control via HasPermission
 */
export default function MessagesPage() {
  const [data, setData] = useState<PaginatedResponse<Message> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  // Send form state
  const [recipientId, setRecipientId] = useState<string>("-1");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<string>("");

  const canManage = usePermission().hasPermission("message:manage");

  const fetchMessages = useCallback(
    async (pageNum: number): Promise<void> => {
      try {
        setLoading(true);
        setError("");
        const res = await apiClient.getAdminMessages(pageNum, DEFAULT_PAGE_SIZE);
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
    fetchMessages(page);
  }, [fetchMessages, page]);

  const handleSend = async (): Promise<void> => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const rid = parseInt(recipientId, 10);

    if (isNaN(rid)) {
      setError("请输入有效的接收者ID");
      return;
    }
    if (!trimmedTitle) {
      setError("消息标题不能为空");
      return;
    }
    if (!trimmedContent) {
      setError("消息内容不能为空");
      return;
    }

    setSending(true);
    setError("");
    setSendSuccess("");

    try {
      await apiClient.sendMessage({
        recipientId: rid,
        title: trimmedTitle,
        content: trimmedContent,
      });

      setSendSuccess("消息发送成功");
      setTitle("");
      setContent("");
      setRecipientId("-1");
      await fetchMessages(1);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      setActionLoading(deleteTarget.id);
      await apiClient.deleteMessage(deleteTarget.id);
      setDeleteTarget(null);
      await fetchMessages(page);
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

      {/* Success Banner */}
      {sendSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
          <Send className="h-4 w-4 shrink-0" />
          <span>{sendSuccess}</span>
          <button
            onClick={() => setSendSuccess("")}
            className="ml-auto text-green-400 hover:text-green-600"
            aria-label="关闭成功提示"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">站内信管理</h1>
      </div>

      {/* Send Message Form */}
      <HasPermission code="message:manage">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-700">
            <Send className="h-4 w-4 text-[#3b9eff]" />
            发送消息
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Recipient */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                接收者
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={recipientId === "-1" ? "-1" : "custom"}
                  onChange={(e) => {
                    if (e.target.value === "-1") {
                      setRecipientId("-1");
                    } else {
                      setRecipientId("");
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
                >
                  <option value="-1">全体用户</option>
                  <option value="custom">指定用户</option>
                </select>
                {recipientId !== "-1" && (
                  <input
                    type="number"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    placeholder="用户ID"
                    className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
                  />
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {recipientId === "-1" ? "将发送给所有注册用户" : "请输入接收者的用户ID"}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                消息标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入消息标题"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
              />
            </div>

            {/* Content */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                消息内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入消息内容"
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-1.5 rounded-lg bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8ae6] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? "发送中…" : "发送消息"}
            </button>
          </div>
        </div>
      </HasPermission>

      {/* Sent Messages Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 font-semibold text-slate-600">标题</th>
                <th className="px-4 py-3 font-semibold text-slate-600">接收者</th>
                <th className="px-4 py-3 font-semibold text-slate-600">发送时间</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    加载中…
                  </td>
                </tr>
              ) : !data || data.list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.list.map((msg) => (
                  <tr
                    key={msg.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-500">{msg.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">{msg.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {msg.recipientId === -1 ? (
                        <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-500">
                          <Users className="h-3 w-3" />
                          全体
                        </span>
                      ) : (
                        <span className="text-slate-600">用户 #{msg.recipientId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(msg.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canManage && (
                          <button
                            onClick={() => setDeleteTarget(msg)}
                            disabled={actionLoading === msg.id}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                            aria-label="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">删除</span>
                          </button>
                        )}
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="确认删除消息"
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">确认删除</h3>
            </div>
            <p className="text-sm text-slate-500">
              确定要删除消息{" "}
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
