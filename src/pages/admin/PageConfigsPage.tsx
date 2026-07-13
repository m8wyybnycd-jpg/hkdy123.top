import { useEffect, useState, useCallback, useRef } from "react";
import { Save, AlertCircle, Check, X, Plus, Pencil, LayoutTemplate } from "lucide-react";
import { apiClient } from "../../services/api";
import { clearPageConfigsCache } from "../../hooks/usePageConfigs";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import type { PageConfig, SavePageConfigRequest } from "../../types";

/** 编辑表单状态（新建或编辑时使用）。 */
interface EditForm {
  page_key: string;
  page_name: string;
  title: string;
  subtitle: string;
  description: string;
  is_enabled: boolean;
  params: string;
  sort_order: number;
}

/** 空表单默认值（用于新建）。 */
const EMPTY_FORM: EditForm = {
  page_key: "",
  page_name: "",
  title: "",
  subtitle: "",
  description: "",
  is_enabled: true,
  params: "{}",
  sort_order: 0,
};

/**
 * Admin page configuration management page.
 *
 * Features:
 * - List all page configs (including disabled) in a table
 * - Edit existing config via modal form (Hero text, visibility, sort order, params)
 * - Create new page config
 * - Toggle enable/disable
 * - Clear frontend localStorage cache on save
 */
export default function PageConfigsPage() {
  const [configs, setConfigs] = useState<PageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit/Create modal state
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [isNew, setIsNew] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, !!editing, () => !saving && setEditing(null));

  /** Fetch all page configs from admin API. */
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.getAdminPageConfigs();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  /** Clear success message after 3 seconds. */
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  /** Open edit modal for an existing config. */
  const handleEdit = (config: PageConfig) => {
    setIsNew(false);
    setEditing({
      page_key: config.page_key,
      page_name: config.page_name,
      title: config.title,
      subtitle: config.subtitle,
      description: config.description,
      is_enabled: config.is_enabled,
      params: config.params,
      sort_order: config.sort_order,
    });
  };

  /** Open create modal. */
  const handleCreate = () => {
    setIsNew(true);
    setEditing({ ...EMPTY_FORM });
  };

  /** Save (create or update) the editing config. */
  const handleSave = async () => {
    if (!editing) return;

    if (!editing.page_key.trim() || !editing.page_name.trim()) {
      setError("页面标识和页面名称不能为空");
      return;
    }

    // Validate params JSON
    try {
      JSON.parse(editing.params || "{}");
    } catch {
      setError("自定义参数必须是合法的 JSON 格式");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload: SavePageConfigRequest = {
        page_name: editing.page_name,
        title: editing.title,
        subtitle: editing.subtitle,
        description: editing.description,
        is_enabled: editing.is_enabled,
        params: editing.params,
        sort_order: editing.sort_order,
      };

      if (isNew) {
        await apiClient.createPageConfig({ ...payload, page_key: editing.page_key });
        setSuccessMsg("页面配置创建成功");
      } else {
        await apiClient.updatePageConfig(editing.page_key, payload);
        setSuccessMsg("页面配置更新成功");
      }

      // Clear frontend cache so users see changes on next refresh
      clearPageConfigsCache();

      // Close modal and refresh list
      setEditing(null);
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  /** Quick toggle enable/disable without opening the modal. */
  const handleToggleEnabled = async (config: PageConfig) => {
    try {
      setError("");
      await apiClient.updatePageConfig(config.page_key, {
        page_name: config.page_name,
        title: config.title,
        subtitle: config.subtitle,
        description: config.description,
        is_enabled: !config.is_enabled,
        params: config.params,
        sort_order: config.sort_order,
      });
      clearPageConfigsCache();
      setSuccessMsg(`${config.page_name} 已${config.is_enabled ? "禁用" : "启用"}`);

      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <LayoutTemplate className="h-5 w-5 text-aurora-cyan" />
            页面配置管理
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            管理前台页面的显示内容、可见性及排序
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-aurora-cyan/80"
        >
          <Plus className="h-4 w-4" />
          新增配置
        </button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <Check className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/50/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-aurora-cyan" />
        </div>
      ) : (
        /* Config table */
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#1a1d2e]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">页面标识</th>
                <th className="px-4 py-3">页面名称</th>
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">排序</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    暂无页面配置数据
                  </td>
                </tr>
              ) : (
                configs
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((config) => (
                    <tr
                      key={config.page_key}
                      className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.08]"
                    >
                      <td className="px-4 py-3">
                        <code className="rounded bg-white/[0.04]/5 px-1.5 py-0.5 text-xs text-slate-400">
                          {config.page_key}
                        </code>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {config.page_name}
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-slate-400">
                        {config.title || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleEnabled(config)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            config.is_enabled
                              ? "bg-green-500/10 text-green-400 hover:bg-green-500/100/20"
                              : "bg-white/[0.20]/10 text-slate-400 hover:bg-white/[0.20]/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              config.is_enabled ? "bg-green-400" : "bg-white/[0.20]"
                            }`}
                          />
                          {config.is_enabled ? "启用" : "禁用"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{config.sort_order}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEdit(config)}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-aurora-cyan transition-colors hover:bg-aurora-cyan/10"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !saving && setEditing(null)}
          />

          {/* Modal */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={isNew ? "新增页面配置" : `编辑 — ${editing.page_name}`}
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1d2e] shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h2 className="text-base font-semibold text-white">
                {isNew ? "新增页面配置" : `编辑 — ${editing.page_name}`}
              </h2>
              <button
                onClick={() => !saving && setEditing(null)}
                aria-label="关闭"
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-white/[0.04]/5 hover:text-white"
                disabled={saving}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 px-5 py-5">
              {/* Section: Basic info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  基础信息
                </h3>

                {/* page_key */}
                <div>
                  <label className="mb-1 block text-sm text-slate-400">
                    页面标识
                  </label>
                  <input
                    type="text"
                    value={editing.page_key}
                    onChange={(e) =>
                      setEditing({ ...editing, page_key: e.target.value })
                    }
                    disabled={!isNew}
                    placeholder="如 cloud-games"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04]/5 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-aurora-cyan/50 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                {/* page_name */}
                <div>
                  <label className="mb-1 block text-sm text-slate-400">
                    页面名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editing.page_name}
                    onChange={(e) =>
                      setEditing({ ...editing, page_name: e.target.value })
                    }
                    placeholder="如 云游戏"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04]/5 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-aurora-cyan/50"
                  />
                </div>

                {/* is_enabled + sort_order */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-400">是否启用</label>
                    <button
                      onClick={() =>
                        setEditing({ ...editing, is_enabled: !editing.is_enabled })
                      }
                      aria-label={editing.is_enabled ? "禁用" : "启用"}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        editing.is_enabled ? "bg-green-500" : "bg-white/[0.25]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          editing.is_enabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-400">
                      排序权重
                    </label>
                    <input
                      type="number"
                      value={editing.sort_order}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          sort_order: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-24 rounded-lg border border-white/10 bg-white/[0.04]/5 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-aurora-cyan/50"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Hero text */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Hero 文案 <span className="text-xs text-aurora-cyan/70">(标题/描述同步 SEO)</span>
                </h3>

                <div>
                  <label className="mb-1 block text-sm text-slate-400">标题</label>
                  <input
                    type="text"
                    value={editing.title}
                    onChange={(e) =>
                      setEditing({ ...editing, title: e.target.value })
                    }
                    placeholder="如 不用高配电脑，也能畅玩 3A 大作"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04]/5 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-aurora-cyan/50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-400">
                    副标题
                  </label>
                  <input
                    type="text"
                    value={editing.subtitle}
                    onChange={(e) =>
                      setEditing({ ...editing, subtitle: e.target.value })
                    }
                    placeholder="如 汇聚各大云游戏平台"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04]/5 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-aurora-cyan/50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-400">
                    描述 <span className="text-xs text-aurora-cyan/70">(同步 SEO meta description)</span>
                  </label>
                  <textarea
                    value={editing.description}
                    onChange={(e) =>
                      setEditing({ ...editing, description: e.target.value })
                    }
                    rows={2}
                    placeholder="影响搜索引擎收录的页面描述，建议 80-160 字"
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04]/5 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-aurora-cyan/50"
                  />
                </div>
              </div>

              {/* Section: Custom params */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  自定义参数 (JSON)
                </h3>
                <textarea
                  value={editing.params}
                  onChange={(e) =>
                    setEditing({ ...editing, params: e.target.value })
                  }
                  rows={4}
                  placeholder='{"key": "value"}'
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04]/5 px-3 py-2 font-mono text-xs text-slate-200 outline-none transition-colors focus:border-aurora-cyan/50"
                />
                <p className="text-xs text-slate-400">
                  JSON 格式的自定义参数，预留扩展用途
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-white/5 px-5 py-4">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-white/[0.04]/5 hover:text-slate-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-aurora-cyan/80 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    保存中…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    保存配置
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
