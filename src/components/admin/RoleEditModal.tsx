import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { apiClient } from "../../services/api";
import type { CreateRoleRequest, UpdateRoleRequest } from "../../types";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface RoleEditModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Close the modal. */
  onClose: () => void;
  /** Called after a role is successfully created or updated. */
  onSaved?: () => void;
  /** Existing role ID for edit mode; null for create mode. */
  roleId?: number | null;
  /** Existing role name (edit mode only). */
  roleName?: string;
  /** Existing role code (edit mode only, displayed as read-only). */
  roleCode?: string;
  /** Existing role description (edit mode only). */
  roleDescription?: string;
  /** Existing role status (edit mode only). */
  roleStatus?: number;
}

/** Regex for role code: lowercase letters and underscores only. */
const CODE_REGEX = /^[a-z_]+$/;

/**
 * Role create/edit modal.
 *
 * Create mode: code is editable (lowercase + underscore only).
 * Edit mode: code is displayed as read-only (cannot be changed).
 */
export default function RoleEditModal({
  open,
  onClose,
  onSaved,
  roleId,
  roleName,
  roleCode,
  roleDescription,
  roleStatus,
}: RoleEditModalProps) {
  const isEdit = roleId != null && roleId > 0;

  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(containerRef, open, onClose);

  // Populate form when opening in edit mode
  useEffect(() => {
    if (open) {
      setName(roleName ?? "");
      setCode(roleCode ?? "");
      setDescription(roleDescription ?? "");
      setStatus(roleStatus ?? 1);
      setError("");
    }
  }, [open, roleName, roleCode, roleDescription, roleStatus]);

  const handleSubmit = async (): Promise<void> => {
    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("角色名称不能为空");
      return;
    }

    // Validate code (create mode only)
    if (!isEdit) {
      const trimmedCode = code.trim().toLowerCase();
      if (!trimmedCode) {
        setError("角色标识不能为空");
        return;
      }
      if (!CODE_REGEX.test(trimmedCode)) {
        setError("角色标识只能包含小写字母和下划线");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      if (isEdit) {
        const data: UpdateRoleRequest = {
          name: trimmedName,
          description: description.trim(),
          status,
        };
        await apiClient.updateRole(roleId!, data);
      } else {
        const data: CreateRoleRequest = {
          name: trimmedName,
          code: code.trim().toLowerCase(),
          description: description.trim(),
          status,
        };
        await apiClient.createRole(data);
      }

      onSaved?.();
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
        aria-label={isEdit ? "编辑角色" : "新建角色"}
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">
            {isEdit ? "编辑角色" : "新建角色"}
          </h3>
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
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              角色名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：运营人员"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
            />
          </div>

          {/* Code */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              角色标识 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              disabled={isEdit}
              placeholder="如：operator"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff] disabled:bg-slate-50 disabled:text-slate-400"
            />
            <p className="mt-1 text-xs text-slate-400">
              {isEdit
                ? "角色标识创建后不可修改"
                : "只能包含小写字母和下划线"}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="角色描述（选填）"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#3b9eff] focus:ring-1 focus:ring-[#3b9eff]"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              状态
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value={1}
                  checked={status === 1}
                  onChange={() => setStatus(1)}
                  className="text-[#3b9eff] focus:ring-[#3b9eff]"
                />
                <span className="text-sm text-slate-700">启用</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value={0}
                  checked={status === 0}
                  onChange={() => setStatus(0)}
                  disabled={isEdit && roleCode === "super_admin"}
                  className="text-[#3b9eff] focus:ring-[#3b9eff] disabled:opacity-50"
                />
                <span className="text-sm text-slate-700">禁用</span>
              </label>
            </div>
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
