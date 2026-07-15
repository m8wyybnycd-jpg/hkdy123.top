import { useEffect, useState, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Crown,
  Tag,
  X,
} from "lucide-react";
import { apiClient } from "../../services/api";
import { usePermission } from "../../contexts/PermissionContext";
import type { ApiResponse } from "../../types";
import type {
  LevelDefinition,
  LevelListResponse,
  UpdateLevelPayload,
  BatchUpdateLevelsPayload,
} from "../../types/userLevel";
import { ALL_FEATURES, BASE_DAILY_LIMIT, BASE_MONTHLY_LIMIT } from "../../types/userLevel";

export default function LevelsPage() {
  const { hasPermission } = usePermission();
  const canManage = hasPermission("level:manage");

  const [levels, setLevels] = useState<LevelDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [dirty, setDirty] = useState(false);

  // 编辑中的等级数据（本地副本）
  const [editLevels, setEditLevels] = useState<LevelDefinition[]>([]);

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.request<LevelListResponse>(
        "/api/admin/levels?active_only=false"
      );
      if (res.code !== 0) throw new Error(res.message);
      setLevels(res.data.list || []);
      setEditLevels(res.data.list || []);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载等级定义失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  // ── 编辑操作 ──

  function updateField(
    level: number,
    field: keyof LevelDefinition,
    value: unknown
  ) {
    setEditLevels((prev) =>
      prev.map((l) => (l.level === level ? { ...l, [field]: value } : l))
    );
    setDirty(true);
  }

  function toggleFeature(level: number, feature: string) {
    setEditLevels((prev) =>
      prev.map((l) => {
        if (l.level !== level) return l;
        const features = l.features.includes(feature)
          ? l.features.filter((f) => f !== feature)
          : [...l.features, feature];
        return { ...l, features };
      })
    );
    setDirty(true);
  }

  function moveLevel(level: number, direction: "up" | "down") {
    setEditLevels((prev) => {
      const sorted = [...prev].sort((a, b) => a.level - b.level);
      const idx = sorted.findIndex((l) => l.level === level);
      if (idx < 0) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === sorted.length - 1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      const current = sorted[idx];
      const target = sorted[swapIdx];
      // 交换 level 值
      sorted[idx] = { ...target, level: current.level };
      sorted[swapIdx] = { ...current, level: target.level };
      return sorted.sort((a, b) => a.level - b.level);
    });
    setDirty(true);
  }

  // ── 保存 ──

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      // 构建更新负载——只发送需要更新的字段
      const updates: UpdateLevelPayload[] = editLevels.map((l) => ({
        level: l.level,
        name: l.name,
        description: l.description,
        quota_multiplier: l.quotaMultiplier,
        daily_limit_override: l.dailyLimitOverride,
        monthly_limit_override: l.monthlyLimitOverride,
        features: l.features,
        badge_color: l.badgeColor,
        badge_icon: l.badgeIcon,
        is_active: l.isActive,
      }));

      const res = await apiClient.request<LevelListResponse>(
        "/api/admin/levels",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates } as BatchUpdateLevelsPayload),
        }
      );
      if (res.code !== 0) throw new Error(res.message);

      setLevels(res.data.list || []);
      setEditLevels(res.data.list || []);
      setDirty(false);
      setSuccessMsg(`成功更新 ${updates.length} 个等级定义`);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  // ── 重置 ──

  async function handleReset() {
    setResetting(true);
    setError("");
    try {
      const res = await apiClient.request<LevelDefinition[]>(
        "/api/admin/levels/reset",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        }
      );
      if (res.code !== 0) throw new Error(res.message);

      const list = res.data || [];
      setLevels(list);
      setEditLevels(list);
      setDirty(false);
      setShowResetConfirm(false);
      setSuccessMsg("等级定义已重置为默认值");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置失败");
    } finally {
      setResetting(false);
    }
  }

  // ── 渲染 ──

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
        <span className="ml-3 text-slate-400">加载等级定义...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="h-6 w-6 text-[#2EA7FF]" />
          <div>
            <h1 className="text-xl font-semibold text-slate-100">等级管理</h1>
            <p className="text-sm text-slate-500">
              定义用户等级（1-10）、配额倍率、功能开关和徽章样式
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLevels}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
          {canManage && (
            <>
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={saving || resetting}
                className="flex items-center gap-1.5 rounded-md border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                重置
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty || saving || resetting}
                className="flex items-center gap-1.5 rounded-md bg-[#2EA7FF] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#1d8fe6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "保存中..." : "保存全部"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 消息 */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* 等级卡片列表 */}
      <div className="space-y-3">
        {[...editLevels]
          .sort((a, b) => a.level - b.level)
          .map((level) => (
            <LevelCard
              key={level.level}
              level={level}
              canManage={canManage}
              onUpdateField={updateField}
              onToggleFeature={toggleFeature}
              onMove={moveLevel}
            />
          ))}
      </div>

      {/* 重置确认弹窗 */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  确认重置等级定义？
                </h3>
                <p className="text-sm text-slate-500">此操作不可逆</p>
              </div>
            </div>
            <p className="mb-5 text-sm text-slate-400">
              所有等级定义将被恢复为默认值（名称、倍率、功能开关、徽章颜色）。
              用户的等级字段不受影响，但配额和功能权限将按默认值重新计算。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-white/[0.06]"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {resetting ? "重置中..." : "确认重置"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Level Card — 单个等级的编辑卡片
// ══════════════════════════════════════════════════════════

interface LevelCardProps {
  level: LevelDefinition;
  canManage: boolean;
  onUpdateField: (level: number, field: keyof LevelDefinition, value: unknown) => void;
  onToggleFeature: (level: number, feature: string) => void;
  onMove: (level: number, direction: "up" | "down") => void;
}

function LevelCard({
  level,
  canManage,
  onUpdateField,
  onToggleFeature,
  onMove,
}: LevelCardProps) {
  const effectiveDaily =
    level.dailyLimitOverride !== null
      ? level.dailyLimitOverride
      : Math.round(BASE_DAILY_LIMIT * level.quotaMultiplier);
  const effectiveMonthly =
    level.monthlyLimitOverride !== null
      ? level.monthlyLimitOverride
      : Math.round(BASE_MONTHLY_LIMIT * level.quotaMultiplier);

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        level.isActive
          ? "border-white/10 bg-white/[0.03]"
          : "border-white/5 bg-white/[0.01] opacity-60"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* 左侧：等级标识 + 徽章 */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white shadow-lg"
            style={{
              backgroundColor: level.badgeColor,
              boxShadow: `0 4px 12px ${level.badgeColor}40`,
            }}
          >
            {level.level}
          </div>
          {canManage && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => onMove(level.level, "up")}
                className="rounded p-0.5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
                title="上移"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onMove(level.level, "down")}
                className="rounded p-0.5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
                title="下移"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 中间：编辑字段 */}
        <div className="flex-1 space-y-3">
          {/* 第一行：名称 + 描述 */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={level.name}
              onChange={(e) => onUpdateField(level.level, "name", e.target.value)}
              disabled={!canManage}
              className="w-24 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm font-medium text-slate-100 outline-none focus:border-[#2EA7FF]/50 disabled:opacity-60"
              placeholder="名称"
            />
            <input
              type="text"
              value={level.description}
              onChange={(e) =>
                onUpdateField(level.level, "description", e.target.value)
              }
              disabled={!canManage}
              className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-slate-300 outline-none focus:border-[#2EA7FF]/50 disabled:opacity-60"
              placeholder="等级描述"
            />
            {/* 激活开关 */}
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={level.isActive}
                onChange={(e) =>
                  onUpdateField(level.level, "isActive", e.target.checked)
                }
                disabled={!canManage}
                className="h-3.5 w-3.5 accent-[#2EA7FF]"
              />
              激活
            </label>
          </div>

          {/* 第二行：配额倍率 + 有效配额 */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">倍率</span>
              <input
                type="number"
                value={level.quotaMultiplier}
                onChange={(e) =>
                  onUpdateField(
                    level.level,
                    "quotaMultiplier",
                    parseFloat(e.target.value) || 1.0
                  )
                }
                disabled={!canManage}
                step="0.5"
                min="0.5"
                max="100"
                className="w-16 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-center text-sm text-slate-100 outline-none focus:border-[#2EA7FF]/50 disabled:opacity-60"
              />
              <span className="text-slate-600">x</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span>日配额</span>
              <span className="font-medium text-slate-300">
                {effectiveDaily.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span>月配额</span>
              <span className="font-medium text-slate-300">
                {effectiveMonthly.toLocaleString()}
              </span>
            </div>
            {/* 徽章颜色 */}
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-slate-600" />
              <input
                type="color"
                value={level.badgeColor}
                onChange={(e) =>
                  onUpdateField(level.level, "badgeColor", e.target.value)
                }
                disabled={!canManage}
                className="h-7 w-10 cursor-pointer rounded border border-white/10 bg-transparent disabled:cursor-default"
              />
            </div>
          </div>

          {/* 第三行：功能开关 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-600">功能</span>
            {ALL_FEATURES.map((feat) => {
              const active = level.features.includes(feat.key);
              return (
                <button
                  key={feat.key}
                  onClick={() => onToggleFeature(level.level, feat.key)}
                  disabled={!canManage}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition-colors disabled:cursor-default ${
                    active
                      ? "bg-[#2EA7FF]/20 text-[#2EA7FF] border border-[#2EA7FF]/30"
                      : "bg-white/[0.03] text-slate-600 border border-white/5"
                  } ${canManage && !active ? "hover:bg-white/[0.08] hover:text-slate-400" : ""}`}
                >
                  {feat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
