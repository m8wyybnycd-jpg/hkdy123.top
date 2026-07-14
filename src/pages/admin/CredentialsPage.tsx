import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  KeyRound,
  Trash2,
  Pencil,
  X,
  Loader2,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";
import { apiClient } from "../../services/api";
import HasPermission from "../../components/HasPermission";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import type {
  CredentialItem,
  CredentialType,
  CredentialStatus,
  CreateCredentialPayload,
  UpdateCredentialPayload,
  CredentialTestResult,
} from "../../types";

// ── Constants ────────────────────────────────────────────

const TYPE_LABELS: Record<CredentialType, string> = {
  api_key: "API Key",
  token: "Token",
  oauth: "OAuth",
  certificate: "证书",
};

const TYPE_COLORS: Record<CredentialType, string> = {
  api_key: "text-cyan-400 bg-cyan-500/10",
  token: "text-blue-400 bg-blue-500/10",
  oauth: "text-purple-400 bg-purple-500/10",
  certificate: "text-amber-400 bg-amber-500/10",
};

const STATUS_LABELS: Record<CredentialStatus, string> = {
  active: "正常",
  expired: "已过期",
  revoked: "已吊销",
  error: "异常",
};

const STATUS_COLORS: Record<CredentialStatus, string> = {
  active: "text-green-400 bg-green-500/10",
  expired: "text-amber-400 bg-amber-500/10",
  revoked: "text-slate-400 bg-slate-500/10",
  error: "text-red-400 bg-red-500/10",
};

const HEALTH_LABELS: Record<string, string> = {
  healthy: "健康",
  unhealthy: "异常",
  unknown: "未知",
};

const HEALTH_COLORS: Record<string, string> = {
  healthy: "text-green-400",
  unhealthy: "text-red-400",
  unknown: "text-slate-400",
};

/** Format ISO date to local display. */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Main Component ───────────────────────────────────────

/**
 * 凭证管理页面。
 *
 * 功能：
 * - 凭证列表（支持类型/状态筛选）
 * - 创建/编辑/删除凭证
 * - 连接测试 / 健康检查（保活机制）
 * - 凭证值加密存储，前端仅显示掩码
 */
export default function CredentialsPage() {
  // ── State ──
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [filterType, setFilterType] = useState<CredentialType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<CredentialStatus | "all">("all");

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CredentialItem | null>(null);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, modalOpen, () => !saving && setModalOpen(false));

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<CredentialItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(deleteModalRef, !!deleteTarget, () => !deleting && setDeleteTarget(null));

  // Test result feedback
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, CredentialTestResult>>({});

  // ── Data loading ──
  const loadCredentials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getCredentials();
      setCredentials(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  // ── Filtered list ──
  const filtered = credentials.filter((c) => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  // ── Handlers ──
  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (item: CredentialItem) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.deleteCredential(deleteTarget.id);
      setCredentials((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const result = await apiClient.testCredential(id);
      setTestResults((prev) => ({ ...prev, [id]: result }));
      // Update credential status in the list
      setCredentials((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: result.status as CredentialStatus,
                lastHealthCheck: new Date().toISOString(),
                lastHealthStatus: result.healthy ? "healthy" : "unhealthy",
              }
            : c
        )
      );
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          healthy: false,
          responseCode: null,
          latencyMs: null,
          message: err instanceof Error ? err.message : "测试失败",
          status: "error" as CredentialStatus,
          type: "",
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  // ── Render ──
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <KeyRound className="h-5 w-5 text-aurora-cyan" />
            凭证管理
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            集中管理所有外部服务的 API Key、Token、OAuth 等凭证，加密存储 + 健康检查
          </p>
        </div>
        <HasPermission code="credential:manage">
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-medium text-game-darker transition-colors hover:bg-aurora-cyan/90"
          >
            <Plus className="h-4 w-4" />
            添加凭证
          </button>
        </HasPermission>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">类型</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as CredentialType | "all")}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 focus:border-aurora-cyan/50 focus:outline-none"
          >
            <option value="all">全部</option>
            <option value="api_key">API Key</option>
            <option value="token">Token</option>
            <option value="oauth">OAuth</option>
            <option value="certificate">证书</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">状态</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as CredentialStatus | "all")}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 focus:border-aurora-cyan/50 focus:outline-none"
          >
            <option value="all">全部</option>
            <option value="active">正常</option>
            <option value="expired">已过期</option>
            <option value="revoked">已吊销</option>
            <option value="error">异常</option>
          </select>
        </div>
        <span className="ml-auto text-xs text-slate-500">
          共 {filtered.length} 条
        </span>
      </div>

      {/* Credential list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
          <KeyRound className="mx-auto mb-3 h-12 w-12 text-slate-600" />
          <p className="text-sm text-slate-500">
            {credentials.length === 0 ? "暂无凭证，点击「添加凭证」开始管理" : "当前筛选条件下无匹配凭证"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((cred) => (
            <CredentialCard
              key={cred.id}
              credential={cred}
              onEdit={() => handleEdit(cred)}
              onDelete={() => setDeleteTarget(cred)}
              onTest={() => handleTest(cred.id)}
              testing={testingId === cred.id}
              testResult={testResults[cred.id]}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <CredentialModal
          ref={modalRef}
          editing={editing}
          saving={saving}
          onSave={async (payload) => {
            setSaving(true);
            try {
              if (editing) {
                const updated = await apiClient.updateCredential(editing.id, payload);
                setCredentials((prev) =>
                  prev.map((c) => (c.id === editing.id ? updated : c))
                );
              } else {
                const created = await apiClient.createCredential(
                  payload as CreateCredentialPayload
                );
                setCredentials((prev) => [created, ...prev]);
              }
              setModalOpen(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "保存失败");
            } finally {
              setSaving(false);
            }
          }}
          onClose={() => !saving && setModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            ref={deleteModalRef}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-game-darker p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">删除凭证</h3>
            </div>
            <p className="mb-6 text-sm text-slate-400">
              确定要删除凭证 <span className="font-medium text-slate-200">"{deleteTarget.name}"</span> 吗？
              删除后该凭证将无法恢复，使用此凭证的服务将自动回退到环境变量。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Credential Card Component ────────────────────────────

interface CredentialCardProps {
  credential: CredentialItem;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  testing: boolean;
  testResult?: CredentialTestResult;
}

function CredentialCard({
  credential,
  onEdit,
  onDelete,
  onTest,
  testing,
  testResult,
}: CredentialCardProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-colors hover:border-white/10">
      {/* Row 1: Name + badges */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg px-2 py-1 text-xs font-medium ${TYPE_COLORS[credential.type]}`}>
            {TYPE_LABELS[credential.type]}
          </div>
          <h3 className="text-base font-medium text-white">{credential.name}</h3>
          <div className={`rounded px-2 py-0.5 text-xs ${STATUS_COLORS[credential.status]}`}>
            {STATUS_LABELS[credential.status]}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HasPermission code="credential:manage">
            <button
              onClick={onTest}
              disabled={testing}
              title="连接测试 / 健康检查"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-aurora-cyan"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onEdit}
              title="编辑"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-blue-400"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              title="删除"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </HasPermission>
        </div>
      </div>

      {/* Row 2: Details grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
        <div>
          <span className="text-xs text-slate-500">服务商</span>
          <p className="text-slate-300">{credential.provider || "—"}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">凭证值</span>
          <p className="font-mono text-slate-400">{credential.maskedValue || "—"}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500">健康状态</span>
          <p className={`flex items-center gap-1 ${HEALTH_COLORS[credential.lastHealthStatus]}`}>
            {credential.lastHealthStatus === "healthy" && <CheckCircle2 className="h-3.5 w-3.5" />}
            {credential.lastHealthStatus === "unhealthy" && <AlertCircle className="h-3.5 w-3.5" />}
            {credential.lastHealthStatus === "unknown" && <Clock className="h-3.5 w-3.5" />}
            {HEALTH_LABELS[credential.lastHealthStatus]}
          </p>
        </div>
        <div>
          <span className="text-xs text-slate-500">最近检查</span>
          <p className="text-slate-400">{formatDate(credential.lastHealthCheck)}</p>
        </div>
      </div>

      {/* Row 3: Endpoint + expiry */}
      {(credential.endpointUrl || credential.expiresAt) && (
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-white/5 pt-3 text-xs text-slate-500">
          {credential.endpointUrl && (
            <span>
              端点:{" "}
              <span className="font-mono text-slate-400">{credential.endpointUrl}</span>
            </span>
          )}
          {credential.expiresAt && (
            <span>
              过期时间: <span className="text-slate-400">{formatDate(credential.expiresAt)}</span>
            </span>
          )}
          {credential.autoRenew && (
            <span className="flex items-center gap-1 text-cyan-400">
              <RefreshCw className="h-3 w-3" />
              自动续期
            </span>
          )}
        </div>
      )}

      {/* Test result feedback */}
      {testResult && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
            testResult.healthy
              ? "border border-green-500/20 bg-green-500/5 text-green-400"
              : "border border-red-500/20 bg-red-500/5 text-red-400"
          }`}
        >
          {testResult.healthy ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          <span>{testResult.message}</span>
          {testResult.responseCode && (
            <span className="ml-auto font-mono text-slate-500">HTTP {testResult.responseCode}</span>
          )}
          {testResult.latencyMs !== null && testResult.latencyMs > 0 && (
            <span className="font-mono text-slate-500">{testResult.latencyMs}ms</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Create/Edit Modal Component ──────────────────────────

interface CredentialModalProps {
  editing: CredentialItem | null;
  saving: boolean;
  onSave: (payload: UpdateCredentialPayload) => void;
  onClose: () => void;
}

const CredentialModal = ({
  ref: modalRef,
  editing,
  saving,
  onSave,
  onClose,
}: CredentialModalProps & { ref: React.RefObject<HTMLDivElement> }) => {
  const [name, setName] = useState(editing?.name || "");
  const [type, setType] = useState<CredentialType>(editing?.type || "api_key");
  const [provider, setProvider] = useState(editing?.provider || "");
  const [endpointUrl, setEndpointUrl] = useState(editing?.endpointUrl || "");
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [status, setStatus] = useState<CredentialStatus>(editing?.status || "active");
  const [autoRenew, setAutoRenew] = useState(editing?.autoRenew || false);
  const [expiresAt, setExpiresAt] = useState(editing?.expiresAt?.slice(0, 16) || "");
  const [metadataModel, setMetadataModel] = useState(
    (editing?.metadata?.model_id as string) || ""
  );
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("凭证名称不能为空");
      return;
    }
    if (!editing && !value.trim()) {
      setFormError("凭证值不能为空");
      return;
    }

    const payload: UpdateCredentialPayload = {
      name: name.trim(),
      type,
      provider: provider.trim(),
      endpointUrl: endpointUrl.trim(),
      status,
      autoRenew,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    if (!editing || value.trim()) {
      payload.value = value.trim();
    }

    // Add model_id to metadata if provided
    if (metadataModel.trim()) {
      payload.metadata = { model_id: metadataModel.trim() };
    }

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={modalRef}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-game-darker p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Shield className="h-5 w-5 text-aurora-cyan" />
            {editing ? "编辑凭证" : "添加凭证"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">凭证名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：讯飞MaaS APIKey"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-aurora-cyan/50 focus:outline-none"
            />
          </div>

          {/* Type + Provider */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">类型 *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CredentialType)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-aurora-cyan/50 focus:outline-none"
              >
                <option value="api_key">API Key</option>
                <option value="token">Token</option>
                <option value="oauth">OAuth</option>
                <option value="certificate">证书</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">服务商</label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="如：xfyun"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-aurora-cyan/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Endpoint URL */}
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">API 端点地址</label>
            <input
              type="text"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="如：https://maas-api.cn-huabei-1.xf-yun.com/v2"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-aurora-cyan/50 focus:outline-none"
            />
          </div>

          {/* Value */}
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">
              凭证值 {editing ? "（留空不修改）" : "*"}
            </label>
            <div className="relative">
              <input
                type={showValue ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={editing ? "输入新值可替换" : "输入凭证密钥"}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:border-aurora-cyan/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              凭证值使用 AES-256-GCM 加密存储，前端永远不会显示明文
            </p>
          </div>

          {/* Model ID (metadata) */}
          {type === "api_key" && (
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">模型 ID (可选)</label>
              <input
                type="text"
                value={metadataModel}
                onChange={(e) => setMetadataModel(e.target.value)}
                placeholder="如：xophunyuan7bmt"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-aurora-cyan/50 focus:outline-none"
              />
            </div>
          )}

          {/* Status + Auto-renew */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">状态</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CredentialStatus)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-aurora-cyan/50 focus:outline-none"
              >
                <option value="active">正常</option>
                <option value="expired">已过期</option>
                <option value="revoked">已吊销</option>
                <option value="error">异常</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">过期时间</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-aurora-cyan/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Auto-renew toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-aurora-cyan focus:ring-aurora-cyan/30"
            />
            <RefreshCw className="h-3.5 w-3.5" />
            启用自动续期（到期前自动刷新凭证）
          </label>

          {/* Form error */}
          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-aurora-cyan px-4 py-2 text-sm font-medium text-game-darker transition-colors hover:bg-aurora-cyan/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {editing ? "保存修改" : "创建凭证"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
