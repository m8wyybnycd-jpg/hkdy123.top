/**
 * User Level System — Frontend type definitions
 *
 * 与后端 functions/lib/user-level.ts 的 LevelDefinition 对齐。
 */

/** 等级定义（前端 DTO，camelCase） */
export interface LevelDefinition {
  level: number;
  name: string;
  description: string;
  quotaMultiplier: number;
  dailyLimitOverride: number | null;
  monthlyLimitOverride: number | null;
  features: string[];
  badgeColor: string;
  badgeIcon: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** GET /api/admin/levels 返回结构 */
export interface LevelListResponse {
  list: LevelDefinition[];
  total: number;
}

/** PUT /api/admin/levels 请求体中的单条更新 */
export interface UpdateLevelPayload {
  level: number;
  name?: string;
  description?: string;
  quota_multiplier?: number;
  daily_limit_override?: number | null;
  monthly_limit_override?: number | null;
  features?: string[];
  badge_color?: string;
  badge_icon?: string | null;
  is_active?: boolean;
}

/** PUT /api/admin/levels 请求体 */
export interface BatchUpdateLevelsPayload {
  updates: UpdateLevelPayload[];
}

/** 所有可用功能开关 */
export const ALL_FEATURES = [
  { key: "pet_chat", label: "AI 对话" },
  { key: "pet_memory", label: "长期记忆" },
  { key: "pet_custom_persona", label: "自定义人设" },
  { key: "priority_support", label: "优先支持" },
  { key: "advanced_analytics", label: "高级分析" },
  { key: "api_access", label: "API 访问" },
  { key: "custom_model", label: "自定义模型" },
  { key: "unlimited_history", label: "无限历史" },
] as const;

/** 基础配额（与后端保持一致） */
export const BASE_DAILY_LIMIT = 10000;
export const BASE_MONTHLY_LIMIT = 100000;
