import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Save, AlertCircle, Check } from "lucide-react";
import { apiClient } from "../../services/api";
import type { SettingItem } from "../../types";

/** Tab identifiers for the settings page. */
type SettingsTab = "basic" | "params" | "logging";

/** Tab configuration. */
const TABS: { id: SettingsTab; label: string }[] = [
  { id: "basic", label: "基础配置" },
  { id: "params", label: "参数管理" },
  { id: "logging", label: "日志设置" },
];

/** Form field configuration for basic tab. */
const BASIC_FIELDS: { key: string; label: string; placeholder: string; type?: string }[] = [
  { key: "site_name", label: "网站名称", placeholder: "如：云游戏中心" },
  { key: "logo_url", label: "Logo URL", placeholder: "https://..." },
  { key: "icp_number", label: "备案号", placeholder: "如：粤ICP备XXXXX号" },
  { key: "contact_email", label: "联系邮箱", placeholder: "admin@example.com", type: "email" },
  { key: "contact_qq", label: "客服QQ", placeholder: "QQ号" },
  { key: "contact_wechat", label: "微信", placeholder: "微信号" },
  { key: "site_description", label: "网站描述", placeholder: "网站简要描述" },
];

/** Form field configuration for params tab. */
const PARAMS_FIELDS: { key: string; label: string; placeholder: string; type: "number" | "toggle" }[] = [
  { key: "password_min_length", label: "密码最小长度", placeholder: "8", type: "number" },
  { key: "password_max_attempts", label: "最大尝试次数", placeholder: "5", type: "number" },
  { key: "verification_code_ttl", label: "验证码有效期(分钟)", placeholder: "10", type: "number" },
  { key: "verification_code_interval", label: "发送间隔(秒)", placeholder: "60", type: "number" },
  { key: "registration_enabled", label: "允许注册", placeholder: "", type: "toggle" },
];

/** Form field configuration for logging tab. */
const LOGGING_FIELDS: { key: string; label: string; placeholder: string; type: "number" | "toggle" }[] = [
  { key: "operation_log_enabled", label: "操作日志", placeholder: "", type: "toggle" },
  { key: "login_log_enabled", label: "登录日志", placeholder: "", type: "toggle" },
  { key: "log_retention_days", label: "日志保留天数", placeholder: "30", type: "number" },
];

/**
 * Admin system settings page with 3 tabs.
 *
 * Tabs: basic / params / logging
 * URL hash syncs with the active tab for bookmarkability.
 */
export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL hash
  const hash = location.hash.replace("#", "") as SettingsTab;
  const initialTab: SettingsTab =
    hash === "params" || hash === "logging" ? hash : "basic";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const fetchSettings = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");
      const data = await apiClient.getSettings();
      const map: Record<string, string> = {};
      data.forEach((item: SettingItem) => {
        map[item.key] = item.value;
      });
      setSettings(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleTabChange = (tab: SettingsTab): void => {
    setActiveTab(tab);
    navigate(`${location.pathname}#${tab}`, { replace: true });
  };

  const handleFieldChange = (key: string, value: string): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSuccessMsg("");
  };

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      // Collect fields for the current tab
      const fieldsToSave: Record<string, string> = {};
      const currentFields =
        activeTab === "basic"
          ? BASIC_FIELDS
          : activeTab === "params"
            ? PARAMS_FIELDS
            : LOGGING_FIELDS;

      currentFields.forEach((field) => {
        fieldsToSave[field.key] = String(settings[field.key] ?? "");
      });

      await apiClient.updateSettings(fieldsToSave);
      setSuccessMsg("设置已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  /** Render a text/number input field. */
  const renderInputField = (
    field: { key: string; label: string; placeholder: string; type?: string }
  ): React.ReactNode => {
    const inputType = field.type === "email" ? "email" : "text";
    return (
      <div key={field.key}>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {field.label}
        </label>
        <input
          type={inputType}
          value={settings[field.key] ?? ""}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue"
        />
      </div>
    );
  };

  /** Render a number input field. */
  const renderNumberField = (
    field: { key: string; label: string; placeholder: string }
  ): React.ReactNode => {
    return (
      <div key={field.key}>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {field.label}
        </label>
        <input
          type="number"
          value={settings[field.key] ?? ""}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue"
        />
      </div>
    );
  };

  /** Render a toggle switch field. */
  const renderToggleField = (
    field: { key: string; label: string }
  ): React.ReactNode => {
    const enabled = settings[field.key] === "true";
    return (
      <div key={field.key} className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{field.label}</label>
        <button
          type="button"
          onClick={() => handleFieldChange(field.key, enabled ? "false" : "true")}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-neon-blue" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    );
  };

  /** Render fields for the current tab. */
  const renderTabFields = (): React.ReactNode => {
    if (activeTab === "basic") {
      return (
        <div className="space-y-4">
          {BASIC_FIELDS.map((field) => renderInputField(field))}
        </div>
      );
    }

    if (activeTab === "params") {
      return (
        <div className="space-y-4">
          {PARAMS_FIELDS.map((field) =>
            field.type === "toggle"
              ? renderToggleField(field)
              : renderNumberField(field)
          )}
        </div>
      );
    }

    // logging
    return (
      <div className="space-y-4">
        {LOGGING_FIELDS.map((field) =>
          field.type === "toggle"
            ? renderToggleField(field)
            : renderNumberField(field)
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-neon-blue" />
          <span className="text-sm text-slate-400">加载中…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">系统设置</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-neon-blue px-4 py-2 text-sm font-medium text-white hover:bg-neon-blue/80 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "保存中…" : "保存当前页设置"}
        </button>
      </div>

      {/* Error Banner */}
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

      {/* Success Banner */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg("")}
            className="ml-auto text-green-400 hover:text-green-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-neon-blue text-neon-blue"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-2xl">{renderTabFields()}</div>
      </div>
    </div>
  );
}
