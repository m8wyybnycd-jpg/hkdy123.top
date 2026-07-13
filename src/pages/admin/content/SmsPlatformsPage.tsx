import { useCallback, useEffect, useState, useRef } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "../../../services/api";
import HasPermission from "../../../components/HasPermission";
import { useFocusTrap } from "../../../hooks/useFocusTrap";
import type { SmsPlatform } from "../../../types";

/** Empty form for creating a new SMS platform. */
const EMPTY_FORM: Partial<SmsPlatform> = {
  id: "",
  name: "",
  url: "",
  category: "",
  countries: "",
  isFree: true,
  needRegister: false,
  supportChinese: false,
  retention: "",
  description: "",
  features: [],
  sortOrder: 0,
};

/** Features input helper — comma-separated string ↔ string array. */
const featuresToString = (features: string[] | undefined): string =>
  features ? features.join(", ") : "";

const featuresFromString = (str: string): string[] =>
  str.split(",").map((t) => t.trim()).filter(Boolean);

/**
 * Admin page for managing SMS-receiving / verification-code platforms.
 */
export default function SmsPlatformsPage() {
  const [list, setList] = useState<SmsPlatform[]>([]);
  const [filtered, setFiltered] = useState<SmsPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SmsPlatform | null>(null);
  const [form, setForm] = useState<Partial<SmsPlatform>>(EMPTY_FORM);
  const [featuresInput, setFeaturesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SmsPlatform | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, drawerOpen, () => setDrawerOpen(false));
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  const fetchList = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getSmsPlatforms();
      setList(data);
      setFiltered(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      setFiltered(list);
    } else {
      setFiltered(
        list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q)
        )
      );
    }
  }, [search, list]);

  const openCreate = (): void => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFeaturesInput("");
    setDrawerOpen(true);
  };

  const openEdit = (item: SmsPlatform): void => {
    setEditing(item);
    setForm({ ...item });
    setFeaturesInput(featuresToString(item.features));
    setDrawerOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        features: featuresFromString(featuresInput),
      };
      if (editing) {
        await apiClient.updateSmsPlatform(editing.id, payload);
      } else {
        await apiClient.createSmsPlatform(payload);
      }
      setDrawerOpen(false);
      await fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiClient.deleteSmsPlatform(deleteTarget.id);
      setDeleteTarget(null);
      await fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索平台名称..."
            aria-label="搜索平台"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-400 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
          />
        </div>
        <button
          onClick={fetchList}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08]"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
        <HasPermission code="sms_platform:manage">
          <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8aef]"
          >
          <Plus className="h-4 w-4" />
          新增
          </button>
        </HasPermission>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_rgba(2,6,23,0.45)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.06]">
              <th className="px-4 py-3 font-semibold text-slate-300">ID</th>
              <th className="px-4 py-3 font-semibold text-slate-300">名称</th>
              <th className="px-4 py-3 font-semibold text-slate-300">分类</th>
              <th className="px-4 py-3 font-semibold text-slate-300">国家/地区</th>
              <th className="px-4 py-3 font-semibold text-slate-300">免费</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-300">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#2EA7FF]" />
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((item) => (
                <tr key={item.id} className="border-b border-white/10 hover:bg-white/[0.08]/50">
                  <td className="px-4 py-3 text-slate-400">{item.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{item.name}</td>
                  <td className="px-4 py-3 text-slate-300">{item.category}</td>
                  <td className="px-4 py-3 text-slate-300">{item.countries}</td>
                  <td className="px-4 py-3">
                    {item.isFree ? (
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">免费</span>
                    ) : (
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">付费</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <HasPermission code="sms_platform:manage">
                        <button
                        onClick={() => openEdit(item)}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[#2EA7FF] hover:bg-[#2EA7FF]/10"
                        >
                        <Edit2 className="h-3.5 w-3.5" />
                        编辑
                        </button>
                      </HasPermission>
                      <HasPermission code="sms_platform:manage">
                        <button
                        onClick={() => setDeleteTarget(item)}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10"
                        >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                        </button>
                      </HasPermission>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "编辑平台" : "新增平台"}
            className="flex h-full w-full max-w-md flex-col bg-white/[0.04] shadow-[0_20px_60px_rgba(2,6,23,0.6)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-100">
                {editing ? "编辑平台" : "新增平台"}
              </h3>
              <button onClick={() => setDrawerOpen(false)} aria-label="关闭" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.10]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <FormField label="ID" required>
                <input
                  type="text"
                  value={form.id ?? ""}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  disabled={!!editing}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="如: sms01"
                />
              </FormField>
              <FormField label="名称" required>
                <input
                  type="text"
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="平台名称"
                />
              </FormField>
              <FormField label="网址" required>
                <input
                  type="url"
                  value={form.url ?? ""}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="https://..."
                />
              </FormField>
              <FormField label="分类">
                <input
                  type="text"
                  value={form.category ?? ""}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="如: 国内免费 / 国外免费 / 付费服务"
                />
              </FormField>
              <FormField label="支持国家/地区">
                <input
                  type="text"
                  value={form.countries ?? ""}
                  onChange={(e) => setForm({ ...form, countries: e.target.value })}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="如: 中国"
                />
              </FormField>
              <div className="grid grid-cols-3 gap-3">
                <Checkbox label="免费" checked={!!form.isFree} onChange={(v) => setForm({ ...form, isFree: v })} />
                <Checkbox label="需注册" checked={!!form.needRegister} onChange={(v) => setForm({ ...form, needRegister: v })} />
                <Checkbox label="支持中文" checked={!!form.supportChinese} onChange={(v) => setForm({ ...form, supportChinese: v })} />
              </div>
              <FormField label="保留时间">
                <input
                  type="text"
                  value={form.retention ?? ""}
                  onChange={(e) => setForm({ ...form, retention: e.target.value })}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="如: 实时 / 7天"
                />
              </FormField>
              <FormField label="描述">
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="简短描述"
                />
              </FormField>
              <FormField label="特点标签 (逗号分隔)">
                <input
                  type="text"
                  value={featuresInput}
                  onChange={(e) => setFeaturesInput(e.target.value)}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="如: 无需注册, 支持中文"
                />
              </FormField>
              <FormField label="排序">
                <input
                  type="number"
                  value={form.sortOrder ?? 0}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08]"
              >
                取消
              </button>
              <HasPermission code="sms_platform:manage">
                <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#2EA7FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8aef] disabled:opacity-50"
                >
                {saving ? "保存中..." : "保存"}
                </button>
              </HasPermission>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="确认删除平台"
            className="w-full max-w-sm rounded-xl bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.6)]"
          >
            <h3 className="text-lg font-semibold text-slate-100">确认删除</h3>
            <p className="mt-2 text-sm text-slate-400">
              确定要删除平台 <span className="font-medium text-slate-200">{deleteTarget.name}</span> 吗？
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08]"
              >
                取消
              </button>
              <HasPermission code="sms_platform:manage">
                <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                {saving ? "删除中..." : "确认删除"}
                </button>
              </HasPermission>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable form field wrapper with label. */
function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

/** Boolean checkbox used in the create/edit drawer. */
function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#2EA7FF]"
      />
      {label}
    </label>
  );
}
