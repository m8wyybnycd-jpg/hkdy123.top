import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { apiClient } from "../../services/api";
import { PERMISSION_GROUPS } from "../../constants/permissions";
import type { Permission } from "../../types";

interface PermissionAssignmentProps {
  /** Role ID to manage permissions for. */
  roleId: number;
  /** Role code (to check if super_admin for read-only mode). */
  roleCode: string;
  /** Back to role list. */
  onBack: () => void;
}

/**
 * Permission assignment component.
 *
 * Renders permissions grouped by module with checkboxes.
 * Supports select-all / invert-selection per module.
 * super_admin role is read-only (all permissions checked, cannot modify).
 */
export default function PermissionAssignment({
  roleId,
  roleCode,
  onBack,
}: PermissionAssignmentProps) {
  const isSuperAdmin = roleCode === "super_admin";
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.getRolePermissions(roleId);
      setAllPermissions(data.allPermissions);
      setSelectedIds(new Set(data.permissionIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTogglePermission = (permId: number): void => {
    if (isSuperAdmin) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
    setSuccessMsg("");
  };

  const handleSelectAllInModule = (modulePerms: Permission[]): void => {
    if (isSuperAdmin) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = modulePerms.every((p) => next.has(p.id));
      if (allSelected) {
        modulePerms.forEach((p) => next.delete(p.id));
      } else {
        modulePerms.forEach((p) => next.add(p.id));
      }
      return next;
    });
    setSuccessMsg("");
  };

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      setError("");
      await apiClient.updateRolePermissions(roleId, Array.from(selectedIds));
      setSuccessMsg("权限已更新");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by module using PERMISSION_GROUPS
  const groupedPermissions = PERMISSION_GROUPS.map((group) => {
    const perms = allPermissions.filter((p) => p.module === group.module);
    return { ...group, permissions: perms };
  }).filter((g) => g.permissions.length > 0);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#3b9eff]" />
          <span className="text-sm text-slate-400">加载中…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            返回角色列表
          </button>
          <h2 className="text-lg font-semibold text-slate-800">
            权限分配 — {roleCode}
          </h2>
          {isSuperAdmin && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-500">
              超级管理员（只读）
            </span>
          )}
        </div>
        {!isSuperAdmin && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8ae6] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "保存中…" : "保存权限"}
          </button>
        )}
      </div>

      {/* Error / Success messages */}
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
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg("")}
            className="ml-auto text-green-400 hover:text-green-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Permission groups */}
      <div className="space-y-4">
        {groupedPermissions.map((group) => {
          const groupPermIds = group.permissions.map((p) => p.id);
          const allChecked = groupPermIds.every((id) => selectedIds.has(id));
          const someChecked = groupPermIds.some((id) => selectedIds.has(id));

          return (
            <div
              key={group.module}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Module header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = !allChecked && someChecked;
                    }}
                    onChange={() => handleSelectAllInModule(group.permissions)}
                    disabled={isSuperAdmin}
                    className="h-4 w-4 rounded border-slate-300 text-[#3b9eff] focus:ring-[#3b9eff] disabled:opacity-50"
                  />
                  <span className="font-semibold text-slate-700">
                    {group.moduleLabel}
                  </span>
                </div>
                {!isSuperAdmin && (
                  <button
                    onClick={() => handleSelectAllInModule(group.permissions)}
                    className="text-xs text-slate-400 hover:text-[#3b9eff]"
                  >
                    {allChecked ? "取消全选" : "全选"}
                  </button>
                )}
              </div>

              {/* Permission checkboxes */}
              <div className="px-4 py-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.permissions.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(perm.id)}
                        onChange={() => handleTogglePermission(perm.id)}
                        disabled={isSuperAdmin}
                        className="h-4 w-4 rounded border-slate-300 text-[#3b9eff] focus:ring-[#3b9eff] disabled:opacity-50"
                      />
                      <div>
                        <span className="text-sm text-slate-700">
                          {perm.name}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">
                          {perm.code}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
