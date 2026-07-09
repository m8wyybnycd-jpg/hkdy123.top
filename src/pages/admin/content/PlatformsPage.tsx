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
import { useFocusTrap } from "../../../hooks/useFocusTrap";
import type { Platform } from "../../../types";

/** Empty platform form for creating new entries. */
const EMPTY_FORM: Partial<Platform> = {
  id: "",
  name: "",
  color: "#3b9eff",
  price: "",
  freeInfo: "",
  url: "",
  desc: "",
  tags: [],
  activity: "",
};

/** Tags input helper — comma-separated string ↔ string array. */
const tagsToString = (tags: string[] | undefined): string =>
  tags ? tags.join(", ") : "";

const tagsFromString = (str: string): string[] =>
  str.split(",").map((t) => t.trim()).filter(Boolean);

/**
 * Admin page for managing cloud gaming platforms.
 *
 * Features: search, table, create/edit drawer form, delete modal.
 */
export default function PlatformsPage() {
  const [list, setList] = useState<Platform[]>([]);
  const [filtered, setFiltered] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Platform | null>(null);
  const [form, setForm] = useState<Partial<Platform>>(EMPTY_FORM);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Platform | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, drawerOpen, () => setDrawerOpen(false));
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  const fetchList = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getPlatforms();
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
            p.desc.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q)
        )
      );
    }
  }, [search, list]);

  const openCreate = (): void => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setTagsInput("");
    setDrawerOpen(true);
  };

  const openEdit = (item: Platform): void => {
    setEditing(item);
    setForm({ ...item });
    setTagsInput(tagsToString(item.tags));
    setDrawerOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        tags: tagsFromString(tagsInput),
      };
      if (editing) {
        await apiClient.updatePlatform(editing.id, payload);
      } else {
        await apiClient.createPlatform(payload);
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
      await apiClient.deletePlatform(deleteTarget.id);
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
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
          />
        </div>
        <button
          onClick={fetchList}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8aef]"
        >
          <Plus className="h-4 w-4" />
          新增
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 font-semibold text-slate-600">ID</th>
              <th className="px-4 py-3 font-semibold text-slate-600">名称</th>
              <th className="px-4 py-3 font-semibold text-slate-600">价格</th>
              <th className="px-4 py-3 font-semibold text-slate-600">免费信息</th>
              <th className="px-4 py-3 font-semibold text-slate-600">活动</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#3b9eff]" />
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-500">{item.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-slate-700">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.price}</td>
                  <td className="px-4 py-3 text-slate-600">{item.freeInfo}</td>
                  <td className="px-4 py-3 text-slate-600">{item.activity || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[#3b9eff] hover:bg-[#3b9eff]/10"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        编辑
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </button>
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
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-800">
                {editing ? "编辑平台" : "新增平台"}
              </h3>
              <button onClick={() => setDrawerOpen(false)} aria-label="关闭" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
                  placeholder="如: netease"
                />
              </FormField>
              <FormField label="名称" required>
                <input
                  type="text"
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
                  placeholder="平台显示名称"
                />
              </FormField>
              <FormField label="品牌颜色">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color ?? "#3b9eff"}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-9 w-12 rounded border border-slate-200"
                  />
                  <input
                    type="text"
                    value={form.color ?? ""}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
                    placeholder="#3b9eff"
                  />
                </div>
              </FormField>
              <FormField label="价格">
                <input
                  type="text"
                  value={form.price ?? ""}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
                  placeholder="如: ¥29.9/月"
                />
              </FormField>
              <FormField label="免费信息">
                <input
                  type="text"
                  value={form.freeInfo ?? ""}
                  onChange={(e) => setForm({ ...form, freeInfo: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
                  placeholder="如: 每日30分钟免费"
                />
              </FormField>
              <FormField label="官网链接">
                <input
                  type="url"
                  value={form.url ?? ""}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
                  placeholder="https://..."
                />
              </FormField>
              <FormField label="描述">
                <textarea
                  value={form.desc ?? ""}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
                  placeholder="简短描述"
                />
              </FormField>
              <FormField label="标签 (逗号分隔)">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
                  placeholder="如: 免费试用, 低延迟"
                />
              </FormField>
              <FormField label="活动">
                <input
                  type="text"
                  value={form.activity ?? ""}
                  onChange={(e) => setForm({ ...form, activity: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
                  placeholder="如: 新用户首月半价"
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#3b9eff] px-4 py-2 text-sm font-medium text-white hover:bg-[#2b8aef] disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
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
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-slate-800">确认删除</h3>
            <p className="mt-2 text-sm text-slate-500">
              确定要删除平台 <span className="font-medium text-slate-700">{deleteTarget.name}</span> 吗？
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {saving ? "删除中..." : "确认删除"}
              </button>
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
      <label className="mb-1.5 block text-sm font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
