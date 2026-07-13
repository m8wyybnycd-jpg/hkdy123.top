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
import type { Game } from "../../../types";

/** Empty form for creating a new game. */
const EMPTY_FORM: Partial<Game> & { platformsInput?: string; tagsInput?: string } = {
  id: "",
  name: "",
  type: "",
  rating: 0,
  config: "mid",
  platforms: [],
  desc: "",
  reason: "",
  tags: [],
  emoji: "",
  cover: "",
  platformsInput: "",
  tagsInput: "",
};

/**
 * Admin page for managing the game catalogue (111+ titles).
 */
export default function GamesPage() {
  const [list, setList] = useState<Game[]>([]);
  const [filtered, setFiltered] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, drawerOpen, () => setDrawerOpen(false));
  useFocusTrap(deleteModalRef, !!deleteTarget, () => setDeleteTarget(null));

  const fetchList = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getGames();
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
          (g) =>
            g.name.toLowerCase().includes(q) ||
            g.type.toLowerCase().includes(q) ||
            g.id.toLowerCase().includes(q)
        )
      );
    }
  }, [search, list]);

  const openCreate = (): void => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDrawerOpen(true);
  };

  const openEdit = (item: Game): void => {
    setEditing(item);
    setForm({
      ...item,
      platformsInput: (item.platforms || []).join(", "),
      tagsInput: (item.tags || []).join(", "),
    });
    setDrawerOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        rating: form.rating,
        config: form.config,
        platforms: (form.platformsInput || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        description: form.desc,
        reason: form.reason,
        tags: (form.tagsInput || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        emoji: form.emoji,
        cover: form.cover,
      };
      if (editing) {
        await apiClient.updateGame(editing.id, payload);
      } else {
        if (form.id) payload.id = form.id;
        await apiClient.createGame(payload);
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
      await apiClient.deleteGame(deleteTarget.id);
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
            placeholder="搜索游戏名称..."
            aria-label="搜索游戏"
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
        <HasPermission code="game:manage">
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
              <th className="px-4 py-3 font-semibold text-slate-300">类型</th>
              <th className="px-4 py-3 font-semibold text-slate-300">评分</th>
              <th className="px-4 py-3 font-semibold text-slate-300">配置</th>
              <th className="px-4 py-3 font-semibold text-slate-300">平台</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-300">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#2EA7FF]" />
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((item) => (
                <tr key={item.id} className="border-b border-white/10 hover:bg-white/[0.08]/50">
                  <td className="px-4 py-3 text-slate-400">{item.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.emoji}</span>
                      <span className="font-medium text-slate-200">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{item.type}</td>
                  <td className="px-4 py-3 text-slate-300">{item.rating.toFixed(1)}</td>
                  <td className="px-4 py-3 text-slate-300">{item.config}</td>
                  <td className="px-4 py-3 text-slate-300">{(item.platforms || []).join(", ")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <HasPermission code="game:manage">
                        <button
                          onClick={() => openEdit(item)}
                          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[#2EA7FF] hover:bg-[#2EA7FF]/10"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          编辑
                        </button>
                      </HasPermission>
                      <HasPermission code="game:manage">
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
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
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
            aria-label={editing ? "编辑游戏" : "新增游戏"}
            className="flex h-full w-full max-w-md flex-col bg-white/[0.04] shadow-[0_20px_60px_rgba(2,6,23,0.6)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-100">
                {editing ? "编辑游戏" : "新增游戏"}
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
                  placeholder="如: naraka-bladepoint"
                />
              </FormField>
              <FormField label="名称" required>
                <input
                  type="text"
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="游戏名称"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="类型">
                  <input
                    type="text"
                    value={form.type ?? ""}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                    placeholder="如: 动作RPG"
                  />
                </FormField>
                <FormField label="评分 (0-10)">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={form.rating ?? 0}
                    onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="配置要求">
                  <select
                    value={form.config ?? "mid"}
                    onChange={(e) => setForm({ ...form, config: e.target.value as "low" | "mid" | "high" })}
                    className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  >
                    <option value="low">低配</option>
                    <option value="mid">中配</option>
                    <option value="high">高配</option>
                  </select>
                </FormField>
                <FormField label="封面 Emoji">
                  <input
                    type="text"
                    value={form.emoji ?? ""}
                    onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                    className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                    placeholder="如: 🎮"
                  />
                </FormField>
              </div>
              <FormField label="支持平台 (逗号分隔)">
                <input
                  type="text"
                  value={form.platformsInput ?? ""}
                  onChange={(e) => setForm({ ...form, platformsInput: e.target.value })}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="如: netease, start, gelaiyun"
                />
              </FormField>
              <FormField label="标签 (逗号分隔)">
                <input
                  type="text"
                  value={form.tagsInput ?? ""}
                  onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="如: 武侠, 大逃杀, 多人竞技"
                />
              </FormField>
              <FormField label="封面图 URL">
                <input
                  type="url"
                  value={form.cover ?? ""}
                  onChange={(e) => setForm({ ...form, cover: e.target.value })}
                  className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="https://..."
                />
              </FormField>
              <FormField label="描述">
                <textarea
                  value={form.desc ?? ""}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="简短描述"
                />
              </FormField>
              <FormField label="推荐理由">
                <textarea
                  value={form.reason ?? ""}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus:border-[#2EA7FF] focus:outline-none focus:ring-1 focus:ring-[#2EA7FF]"
                  placeholder="推荐理由"
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
              <HasPermission code="game:manage">
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
            aria-label="确认删除游戏"
            className="w-full max-w-sm rounded-xl bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(2,6,23,0.6)]"
          >
            <h3 className="text-lg font-semibold text-slate-100">确认删除</h3>
            <p className="mt-2 text-sm text-slate-400">
              确定要删除游戏 <span className="font-medium text-slate-200">{deleteTarget.name}</span> 吗？
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08]"
              >
                取消
              </button>
              <HasPermission code="game:manage">
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
