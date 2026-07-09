import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search,
  Shield,
  ShieldOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  UserCog,
} from "lucide-react";
import { apiClient } from "../../services/api";
import { usePermission } from "../../contexts/PermissionContext";
import type { AdminUserItem, PaginatedResponse, RoleOption } from "../../types";
import UserRoleModal from "../../components/admin/UserRoleModal";
import HasPermission from "../../components/HasPermission";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/** Default page size for the user list. */
const DEFAULT_PAGE_SIZE = 20;

/** Tag colors for different role codes. */
const ROLE_TAG_COLORS: Record<string, string> = {
  super_admin: "bg-blue-50 text-blue-500",
  operator: "bg-green-50 text-green-500",
};

/** Default tag color for unknown role codes. */
const DEFAULT_ROLE_TAG_COLOR = "bg-slate-100 text-slate-500";

/**
 * Admin user management page: searchable paginated table with
 * toggle-admin, delete, and assign-role operations.
 */
export default function UsersPage() {
  const [data, setData] = useState<PaginatedResponse<AdminUserItem> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserItem | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  // User roles cache: userId → RoleOption[]
  const [userRolesCache, setUserRolesCache] = useState<Record<number, RoleOption[]>>({});

  // Role modal state
  const [roleModalOpen, setRoleModalOpen] = useState<boolean>(false);
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);

  const { hasPermission } = usePermission();
  const canManageUsers = hasPermission("user:manage");

  const fetchUsers = useCallback(
    async (search: string, pageNum: number): Promise<void> => {
      try {
        setLoading(true);
        setError("");
        const res = await apiClient.getAdminUsers(
          search || undefined,
          pageNum,
          DEFAULT_PAGE_SIZE
        );
        setData(res);
        // Fetch roles for each user in the page
        fetchUserRoles(res.list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /** Fetch role information for a list of users. */
  const fetchUserRoles = async (users: AdminUserItem[]): Promise<void> => {
    for (const user of users) {
      try {
        const data = await apiClient.getUserRoles(user.id);
        setUserRolesCache((prev) => ({
          ...prev,
          [user.id]: data.allRoles.filter((r) =>
            data.currentRoleIds.includes(r.id)
          ),
        }));
      } catch {
        // Non-fatal: role info just won't display for this user
      }
    }
  };

  useEffect(() => {
    fetchUsers(searchTerm, page);
  }, [fetchUsers, searchTerm, page]);

  const handleSearch = (): void => {
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleToggleAdmin = async (user: AdminUserItem): Promise<void> => {
    try {
      setActionLoading(user.id);
      await apiClient.updateAdminUser(user.id, { isAdmin: !user.isAdmin });
      await fetchUsers(searchTerm, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      setActionLoading(deleteTarget.id);
      await apiClient.deleteAdminUser(deleteTarget.id);
      setDeleteTarget(null);
      await fetchUsers(searchTerm, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRoleModal = (user: AdminUserItem): void => {
    setRoleModalUser(user);
    setRoleModalOpen(true);
  };

  const handleRoleModalSaved = (): void => {
    if (roleModalUser) {
      fetchUsers(searchTerm, page);
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

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="搜索邮箱..."
            aria-label="搜索用户"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8ae6]"
        >
          搜索
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 font-semibold text-slate-600">邮箱</th>
                <th className="px-4 py-3 font-semibold text-slate-600">用户名</th>
                <th className="px-4 py-3 font-semibold text-slate-600">角色</th>
                <th className="px-4 py-3 font-semibold text-slate-600">注册时间</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">操作</th>
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
                data.list.map((user) => {
                  const userRoles = userRolesCache[user.id] ?? [];
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-500">{user.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{user.email}</td>
                      <td className="px-4 py-3 text-slate-600">{user.username}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {userRoles.length > 0 ? (
                            userRoles.map((role) => (
                              <span
                                key={role.id}
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  ROLE_TAG_COLORS[role.code] ?? DEFAULT_ROLE_TAG_COLOR
                                }`}
                              >
                                {role.name}
                              </span>
                            ))
                          ) : user.isAdmin ? (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-500">
                              管理员
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                              普通用户
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canManageUsers && (
                            <button
                              onClick={() => handleOpenRoleModal(user)}
                              disabled={actionLoading === user.id}
                              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#3b9eff] hover:bg-blue-50 disabled:opacity-50"
                              title="分配角色"
                              aria-label="分配角色"
                            >
                              <UserCog className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">分配角色</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleAdmin(user)}
                            disabled={actionLoading === user.id}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            title={user.isAdmin ? "取消管理员" : "设为管理员"}
                            aria-label={user.isAdmin ? "取消管理员" : "设为管理员"}
                          >
                            {user.isAdmin ? (
                              <ShieldOff className="h-3.5 w-3.5" />
                            ) : (
                              <Shield className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">
                              {user.isAdmin ? "取消管理" : "设为管理"}
                            </span>
                          </button>
                          <HasPermission code="user:manage">
                            <button
                              onClick={() => setDeleteTarget(user)}
                              disabled={actionLoading === user.id}
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
                  );
                })
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
                aria-label="上一页"
                className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-slate-600">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="下一页"
                className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
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
            aria-label="确认删除用户"
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">确认删除</h3>
            </div>
            <p className="text-sm text-slate-500">
              确定要删除用户 <span className="font-medium text-slate-700">{deleteTarget.email}</span> 吗？此操作不可撤销。
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

      {/* User Role Assignment Modal */}
      <UserRoleModal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        onSaved={handleRoleModalSaved}
        userId={roleModalUser?.id ?? null}
        userLabel={roleModalUser?.email ?? roleModalUser?.username}
      />
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
