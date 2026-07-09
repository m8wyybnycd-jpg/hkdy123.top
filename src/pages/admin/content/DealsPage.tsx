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
import type { Deal, DealCategory } from "../../../types";
import { DEAL_CATEGORIES } from "../../../types";

/** Empty deal form for creating new entries. */
const EMPTY_FORM: Partial<Deal> = {
  id: "",
  title: "",
  description: "",
  link: "",
  category: "checkin" as DealCategory,
  tags: [],
  updatedAt: new Date().toISOString(),
  expiresAt: null,
};

/** Tags input helper — comma-separated string ↔ string array. */
const tagsToString = (tags: string[] | undefined): string =>
  tags ? tags.join(", ") : "";

const tagsFromString = (str: string): string[] =>
  str.split(",").map((t) => t.trim()).filter(Boolean);

/** Format ISO timestamp to readable date string. */
const formatDate = (iso: string | null): string => {
  if (!iso) return "长期有效";
  try {
    return new Date(iso).toLocaleDateString("zh-CN");
  } catch {
    return iso;
  }
};

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

/** Category label lookup. */
const CATEGORY_LABELS: Record<DealCategory, string> = {
  checkin: "签到免费",
  limited_free: "限免监控",
  coupon: "优惠码",
  new_user: "新用户",
  wildcard: "野路子",
};

/**
 * Admin page for managing deals (薅羊毛).
 *
 * Features: search, category filter, table, create/edit drawer, delete modal.
 */
export default function DealsPage() {
  const [list, setList] = useState<Deal[]>([]);
  const [filtered, setFiltered] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<DealCategory | "all">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<Partial<Deal>>(EMPTY_FORM);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, drawerOpen, () => setDrawerOpen(false));
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  const fetchList = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getDeals();
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
    let result = list;
    if (categoryFilter !== "all") {
      result = result.filter((d) => d.category === categoryFilter);
    }
    if (q) {
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, categoryFilter, list]);

  const openCreate = (): void => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, updatedAt: new Date().toISOString() });
    setTagsInput("");
    setDrawerOpen(true);
  };

  const openEdit = (item: Deal): void => {
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
        updatedAt: new Date().toISOString(),
      };
      if (editing) {
        await apiClient.updateDeal(editing.id, payload);
      } else {
        await apiClient.createDeal(payload);
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
      await apiClient.deleteDeal(deleteTarget.id);
      setDeleteTarget(null);
      await fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题..."
            aria-label="搜索优惠"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-[#3b9eff] focus:outline-none focus:ring-1 focus:ring-[#3b9eff]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as DealCategory | "all")}
          aria-label="按分类筛选"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#3b9eff] focus:outline-none"
        >
          {DEAL_CATEGORIES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
              <th className="px-4 py-3 font-semibold text-slate-600">标题</th>
              <th className="px-4 py-3 font-semibold text-slate-600">分类</th>
              <th className="px-4 py-3 font-semibold text-slate-600">过期时间</th>
              <th className="px-4 py-3 font-semibold text-slate-600">更新时间</th>
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
                  <td className="px-4 py-3 font-medium text-slate-700">{item.title}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(item.expiresAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(item.updatedAt)}</td>
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
            aria-label={editing ? "编辑优惠" : "新增优惠"}
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-800">
                {editing ? "编辑优惠" : "新增优惠"}
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
                  className={inputClass}
                  placeholder="唯一标识"
                />
              </FormField>
              <FormField label="标题" required>
                <input
                  type="text"
                  value={form.title ?? ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                  placeholder="优惠标题"
                />
              </FormField>
              <FormField label="描述">
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="优惠详情"
                />
              </FormField>
              <FormField label="链接">
                <input
                  type="url"
                  value={form.link ?? ""}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className={inputClass}
                  placeholder="https://..."
                />
              </FormField>
              <FormField label="分类" required>
                <select
                  value={form.category ?? "checkin"}
                  onChange={(e) => setForm({ ...form, category: e.target.value as DealCategory })}
                  className={inputClass}
                >
                  {DEAL_CATEGORIES.filter((c) => c.value !== "all").map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="标签 (逗号分隔)">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className={inputClass}
                  placeholder="如: 限时, 免费"
                />
              </FormField>
              <FormField label="过期时间">
                <input
                  type="date"
                  value={form.expiresAt ? form.expiresAt.split("T")[0] : ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-400">留空表示长期有效</p>
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
            aria-label="确认删除优惠"
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-slate-800">确认删除</h3>
            <p className="mt-2 text-sm text-slate-500">
              确定要删除 <span className="font-medium text-slate-700">{deleteTarget.title}</span> 吗？
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
