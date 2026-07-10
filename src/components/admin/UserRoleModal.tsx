import { useState, useEffect, useCallback, useRef } from "react";
import { X, AlertCircle, Info } from "lucide-react";
import { apiClient } from "../../services/api";
import type { RoleOption } from "../../types";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface UserRoleModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Close the modal. */
  onClose: () => void;
  /** Called after roles are successfully saved. */
  onSaved?: () => void;
  /** User ID to manage roles for. */
  userId: number | null;
  /** User display name (email or username). */
  userLabel?: string;
}

/**
 * User role binding modal.
 *
 * Displays all enabled roles as checkboxes.
 * Supports multi-select. Shows a note that effective permissions
 * are the union of all assigned roles' permissions.
 */
export default function UserRoleModal({
  open,
  onClose,
  onSaved,
  userId,
  userLabel,
}: UserRoleModalProps) {
  const [allRoles, setAllRoles] = useState<RoleOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(containerRef, open, onClose);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!userId) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.getUserRoles(userId);
      setAllRoles(data.allRoles);
      setSelectedIds(new Set(data.currentRoleIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      fetchData();
    }
  }, [open, userId, fetchData]);

  const handleToggleRole = (roleId: number): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!userId) return;
    try {
      setSaving(true);
      setError("");
      await apiClient.updateUserRoles(userId, Array.from(selectedIds));
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="分配角色"
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">分配角色</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {userLabel && (
            <p className="text-sm text-slate-500">
              用户：<span className="font-medium text-slate-700">{userLabel}</span>
            </p>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#3b9eff]" />
            </div>
          ) : (
            <>
              {/* Role checkboxes */}
              <div className="space-y-2">
                {allRoles.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">
                    暂无可用角色
                  </p>
                ) : (
                  allRoles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-3 cursor-pointer rounded-md border border-slate-200 px-3 py-2.5 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(role.id)}
                        onChange={() => handleToggleRole(role.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#3b9eff] focus:ring-[#3b9eff]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">
                            {role.name}
                          </span>
                          {role.code === "super_admin" && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-500">
                              系统
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{role.code}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <p className="text-xs text-blue-600">
                  用户的实际权限为所分配所有角色权限的并集。
                </p>
              </div>
            </>
          )}
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
            onClick={handleSave}
            disabled={loading || saving}
            className="rounded-md bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8ae6] disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
