import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "../../services/api";
import type { RoleListItem } from "../../types";
import RoleEditModal from "../../components/admin/RoleEditModal";
import PermissionAssignment from "../../components/admin/PermissionAssignment";
import HasPermission from "../../components/HasPermission";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/**
 * Admin roles management page.
 *
 * Two view modes:
 * 1. Default: role list table with create/edit/delete/permission actions.
 * 2. Permission assignment: when URL params contain tab=permissions&roleId=X.
 */
export default function RolesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleListItem | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<RoleListItem | null>(null);

  // Permission view state
  const permTab = searchParams.get("tab");
  const permRoleId = searchParams.get("roleId");
  const isPermissionView = permTab === "permissions" && permRoleId != null;

  const fetchRoles = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.getAdminRoles();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleOpenCreate = (): void => {
    setEditingRole(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (role: RoleListItem): void => {
    setEditingRole(role);
    setEditModalOpen(true);
  };

  const handleOpenPermissions = (role: RoleListItem): void => {
    setSearchParams({ tab: "permissions", roleId: String(role.id) });
  };

  const handleBackToList = (): void => {
    setSearchParams({});
    fetchRoles();
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      setActionLoading(deleteTarget.id);
      await apiClient.deleteRole(deleteTarget.id);
      setDeleteTarget(null);
      await fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setActionLoading(null);
    }
  };

  // Permission assignment view
  if (isPermissionView && permRoleId) {
    const roleId = Number(permRoleId);
    const role = roles.find((r) => r.id === roleId);
    const roleCode = role?.code ?? "";

    return (
      <PermissionAssignment
        roleId={roleId}
        roleCode={roleCode}
        onBack={handleBackToList}
      />
    );
  }

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
        <h1 className="text-xl font-bold text-slate-800">权限角色</h1>
        <HasPermission code="role:manage">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-lg bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8ae6]"
          >
            <Plus className="h-4 w-4" />
            新建角色
          </button>
        </HasPermission>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 font-semibold text-slate-600">ID</th>
                <th className="px-4 py-3 font-semibold text-slate-600">名称</th>
                <th className="px-4 py-3 font-semibold text-slate-600">标识</th>
                <th className="px-4 py-3 font-semibold text-slate-600">描述</th>
                <th className="px-4 py-3 font-semibold text-slate-600">用户数</th>
                <th className="px-4 py-3 font-semibold text-slate-600">权限数</th>
                <th className="px-4 py-3 font-semibold text-slate-600">状态</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    加载中…
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr
                    key={role.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-500">{role.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{role.name}</span>
                        {role.isSystem && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-500">
                            系统
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                        {role.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{role.description || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{role.userCount}</td>
                    <td className="px-4 py-3 text-slate-600">{role.permissionCount}</td>
                    <td className="px-4 py-3">
                      {role.status === 1 ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-500">
                          启用
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          禁用
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <HasPermission code="role:manage">
                          <button
                            onClick={() => handleOpenEdit(role)}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            aria-label="编辑"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">编辑</span>
                          </button>
                        </HasPermission>
                        {!role.isSystem && (
                          <>
                            <HasPermission code="role:manage">
                              <button
                                onClick={() => handleOpenPermissions(role)}
                                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[#3b9eff] hover:bg-blue-50"
                                aria-label="权限管理"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">权限</span>
                              </button>
                            </HasPermission>
                            <HasPermission code="role:manage">
                              <button
                                onClick={() => setDeleteTarget(role)}
                                disabled={actionLoading === role.id}
                                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                                aria-label="删除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">删除</span>
                              </button>
                            </HasPermission>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      <RoleEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => fetchRoles()}
        roleId={editingRole?.id ?? null}
        roleName={editingRole?.name}
        roleCode={editingRole?.code}
        roleDescription={editingRole?.description}
        roleStatus={editingRole?.status}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="确认删除角色"
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">确认删除</h3>
            </div>
            <p className="text-sm text-slate-500">
              确定要删除角色{" "}
              <span className="font-medium text-slate-700">{deleteTarget.name}</span>{" "}
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
