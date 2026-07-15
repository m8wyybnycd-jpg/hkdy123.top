/**
 * GET  /api/admin/levels       — 列出所有等级定义
 * PUT  /api/admin/levels       — 批量更新等级定义
 * POST /api/admin/levels/reset — 重置为默认种子数据
 *
 * All require `level:manage` permission.
 *
 * 等级定义存储在 user_level_definitions 表中。
 * 修改等级定义不会影响已有用户的 level 字段，只影响该等级的配额和功能开关。
 */

import { requirePermission } from "../../lib/permission";
import {
  jsonResponse,
  badRequest,
  serverError,
  notFound,
} from "../../lib/response";
import { logOperation, getClientIP } from "../../lib/logger";
import {
  getAllLevelDefinitions,
  clearLevelDefinitionCache,
  MAX_LEVEL,
  MIN_LEVEL,
  type LevelDefinition,
} from "../../lib/user-level";

/** 验证 features JSON 字符串 */
function validateFeaturesJSON(features: string): string[] | null {
  try {
    const parsed = JSON.parse(features || "[]");
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((f) => typeof f === "string");
  } catch {
    return null;
  }
}

/** 将 D1 行映射为 camelCase DTO */
function mapDefRow(row: Record<string, unknown>): LevelDefinition {
  const features = validateFeaturesJSON(row.features as string) ?? [];
  return {
    level: row.level as number,
    name: row.name as string,
    description: (row.description as string) ?? "",
    quotaMultiplier: row.quota_multiplier as number,
    dailyLimitOverride: (row.daily_limit_override as number | null) ?? null,
    monthlyLimitOverride: (row.monthly_limit_override as number | null) ?? null,
    features,
    badgeColor: (row.badge_color as string) ?? "#6b7280",
    badgeIcon: (row.badge_icon as string) ?? null,
    sortOrder: (row.sort_order as number) ?? 0,
    isActive: (row.is_active as number) === 1,
  };
}

/**
 * GET /api/admin/levels — 列出所有等级定义
 *
 * Query: ?active_only=true (默认 true，只返回激活的)
 */
export const onRequestGet = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "level:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  const url = new URL(context.request.url);
  const activeOnly = url.searchParams.get("active_only") !== "false";

  try {
    const result = await DB.prepare(
      `SELECT * FROM user_level_definitions
       ${activeOnly ? "WHERE is_active = 1" : ""}
       ORDER BY level ASC`
    ).all<Record<string, unknown>>();

    const list = (result.results || []).map(mapDefRow);

    return jsonResponse({ list, total: list.length });
  } catch (err) {
    console.error("[admin/levels] 查询失败:", err);
    return serverError("等级定义查询失败");
  }
};

/** PUT 请求体类型 */
interface UpdateLevelBody {
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

/**
 * PUT /api/admin/levels — 批量更新等级定义
 *
 * Body: { updates: UpdateLevelBody[] }
 * 每条更新必须包含 level（指定要更新哪一等级）。
 */
export const onRequestPut = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "level:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  let body: { updates?: UpdateLevelBody[] };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("无效的请求体");
  }

  if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
    return badRequest("请求体必须包含 updates 数组且不能为空");
  }

  // 限制单次最多更新 10 条
  if (body.updates.length > MAX_LEVEL) {
    return badRequest(`单次最多更新 ${MAX_LEVEL} 条`);
  }

  // 逐条校验
  for (const update of body.updates) {
    if (
      typeof update.level !== "number" ||
      !Number.isInteger(update.level) ||
      update.level < MIN_LEVEL ||
      update.level > MAX_LEVEL
    ) {
      return badRequest(`等级值必须为 ${MIN_LEVEL}-${MAX_LEVEL} 的整数`);
    }

    if (update.quota_multiplier !== undefined) {
      if (
        typeof update.quota_multiplier !== "number" ||
        update.quota_multiplier <= 0 ||
        update.quota_multiplier > 100
      ) {
        return badRequest("配额倍率必须为 0-100 之间的正数");
      }
    }

    if (
      update.daily_limit_override !== undefined &&
      update.daily_limit_override !== null
    ) {
      if (
        typeof update.daily_limit_override !== "number" ||
        update.daily_limit_override < 0
      ) {
        return badRequest("日限额覆盖值必须为非负数或 null");
      }
    }

    if (
      update.monthly_limit_override !== undefined &&
      update.monthly_limit_override !== null
    ) {
      if (
        typeof update.monthly_limit_override !== "number" ||
        update.monthly_limit_override < 0
      ) {
        return badRequest("月限额覆盖值必须为非负数或 null");
      }
    }

    if (update.features !== undefined) {
      if (!Array.isArray(update.features)) {
        return badRequest("features 必须为字符串数组");
      }
      if (!update.features.every((f) => typeof f === "string")) {
        return badRequest("features 数组中每一项必须为字符串");
      }
    }
  }

  // 逐条更新
  const now = new Date().toISOString();
  const updatedLevels: number[] = [];

  try {
    for (const update of body.updates) {
      // 构建动态 SET 子句
      const setClauses: string[] = ["updated_at = ?"];
      const params: unknown[] = [now];

      if (update.name !== undefined) {
        setClauses.push("name = ?");
        params.push(update.name);
      }
      if (update.description !== undefined) {
        setClauses.push("description = ?");
        params.push(update.description);
      }
      if (update.quota_multiplier !== undefined) {
        setClauses.push("quota_multiplier = ?");
        params.push(update.quota_multiplier);
      }
      if (update.daily_limit_override !== undefined) {
        setClauses.push("daily_limit_override = ?");
        params.push(update.daily_limit_override);
      }
      if (update.monthly_limit_override !== undefined) {
        setClauses.push("monthly_limit_override = ?");
        params.push(update.monthly_limit_override);
      }
      if (update.features !== undefined) {
        setClauses.push("features = ?");
        params.push(JSON.stringify(update.features));
      }
      if (update.badge_color !== undefined) {
        setClauses.push("badge_color = ?");
        params.push(update.badge_color);
      }
      if (update.badge_icon !== undefined) {
        setClauses.push("badge_icon = ?");
        params.push(update.badge_icon);
      }
      if (update.is_active !== undefined) {
        setClauses.push("is_active = ?");
        params.push(update.is_active ? 1 : 0);
      }

      params.push(update.level);

      await DB.prepare(
        `UPDATE user_level_definitions SET ${setClauses.join(", ")} WHERE level = ?`
      )
        .bind(...params)
        .run();

      updatedLevels.push(update.level);
    }

    // 清除缓存
    clearLevelDefinitionCache();

    // 审计日志
    const operatorId = context.data.user?.userId ?? null;
    const operatorName = context.data.user?.username || context.data.user?.email || null;

    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: "update",
      module: "level_definition",
      target: `levels:${updatedLevels.join(",")}`,
      ip: getClientIP(context.request),
      detail: {
        action: "batch_update",
        updatedLevels,
        updateCount: updatedLevels.length,
        updates: body.updates,
      },
    });

    // 返回更新后的列表
    const result = await DB.prepare(
      "SELECT * FROM user_level_definitions ORDER BY level ASC"
    ).all<Record<string, unknown>>();

    const list = (result.results || []).map(mapDefRow);

    return jsonResponse(
      { list, total: list.length, updatedLevels },
      `成功更新 ${updatedLevels.length} 个等级定义`
    );
  } catch (err) {
    console.error("[admin/levels] 更新失败:", err);
    return serverError("等级定义更新失败");
  }
};

/**
 * POST /api/admin/levels/reset — 重置为默认种子数据
 *
 * 将所有等级定义恢复为迁移文件中的初始值。
 * 不可逆操作，需管理员确认。
 */
export const onRequestPost = async (
  context: PageContext
): Promise<Response> => {
  const denied = await requirePermission(context, "level:manage");
  if (denied) return denied;

  const { DB } = context.env;
  if (!DB) return serverError("数据库不可用");

  // 检查是否有确认参数
  let body: { confirm?: boolean };
  try {
    body = await context.request.json();
  } catch {
    body = {};
  }

  if (!body.confirm) {
    return badRequest("此操作不可逆，请在请求体中设置 confirm: true 以确认重置");
  }

  // 默认种子数据
  const seeds: Array<{
    level: number;
    name: string;
    description: string;
    quota_multiplier: number;
    features: string[];
    badge_color: string;
    badge_icon: string;
  }> = [
    { level: 1, name: "青铜", description: "初始等级，基础 AI 对话功能，每日 10,000 Token 配额", quota_multiplier: 1.0, features: ["pet_chat"], badge_color: "#8b5e3c", badge_icon: "shield" },
    { level: 2, name: "白银", description: "解锁长期记忆功能，配额提升 50%", quota_multiplier: 1.5, features: ["pet_chat", "pet_memory"], badge_color: "#9ca3af", badge_icon: "medal" },
    { level: 3, name: "黄金", description: "解锁自定义宠物人设，配额翻倍", quota_multiplier: 2.0, features: ["pet_chat", "pet_memory", "pet_custom_persona"], badge_color: "#f59e0b", badge_icon: "crown" },
    { level: 4, name: "铂金", description: "解锁优先支持通道，配额 3 倍", quota_multiplier: 3.0, features: ["pet_chat", "pet_memory", "pet_custom_persona", "priority_support"], badge_color: "#8b5cf6", badge_icon: "gem" },
    { level: 5, name: "钻石", description: "解锁高级数据分析，配额 5 倍", quota_multiplier: 5.0, features: ["pet_chat", "pet_memory", "pet_custom_persona", "priority_support", "advanced_analytics"], badge_color: "#06b6d4", badge_icon: "diamond" },
    { level: 6, name: "星耀", description: "解锁 API 接口访问，配额 8 倍", quota_multiplier: 8.0, features: ["pet_chat", "pet_memory", "pet_custom_persona", "priority_support", "advanced_analytics", "api_access"], badge_color: "#3b82f6", badge_icon: "star" },
    { level: 7, name: "王者", description: "解锁自定义模型选择，配额 12 倍", quota_multiplier: 12.0, features: ["pet_chat", "pet_memory", "pet_custom_persona", "priority_support", "advanced_analytics", "api_access", "custom_model"], badge_color: "#ef4444", badge_icon: "swords" },
    { level: 8, name: "传奇", description: "解锁无限历史记录，配额 16 倍", quota_multiplier: 16.0, features: ["pet_chat", "pet_memory", "pet_custom_persona", "priority_support", "advanced_analytics", "api_access", "custom_model", "unlimited_history"], badge_color: "#ec4899", badge_icon: "trophy" },
    { level: 9, name: "史诗", description: "高级会员，配额 20 倍，享有专属客服", quota_multiplier: 20.0, features: ["pet_chat", "pet_memory", "pet_custom_persona", "priority_support", "advanced_analytics", "api_access", "custom_model", "unlimited_history"], badge_color: "#f97316", badge_icon: "flame" },
    { level: 10, name: "神话", description: "最高等级，配额 30 倍，全部功能解锁", quota_multiplier: 30.0, features: ["pet_chat", "pet_memory", "pet_custom_persona", "priority_support", "advanced_analytics", "api_access", "custom_model", "unlimited_history"], badge_color: "#ffd700", badge_icon: "sparkles" },
  ];

  try {
    const now = new Date().toISOString();

    // 逐条更新（不删除不重建，保留 id）
    for (const seed of seeds) {
      await DB.prepare(
        `UPDATE user_level_definitions
         SET name = ?, description = ?, quota_multiplier = ?,
             daily_limit_override = NULL, monthly_limit_override = NULL,
             features = ?, badge_color = ?, badge_icon = ?,
             is_active = 1, updated_at = ?
         WHERE level = ?`
      )
        .bind(
          seed.name,
          seed.description,
          seed.quota_multiplier,
          JSON.stringify(seed.features),
          seed.badge_color,
          seed.badge_icon,
          now,
          seed.level
        )
        .run();
    }

    // 清除缓存
    clearLevelDefinitionCache();

    // 审计日志
    const operatorId = context.data.user?.userId ?? null;
    const operatorName = context.data.user?.username || context.data.user?.email || null;

    await logOperation(DB, {
      userId: operatorId,
      username: operatorName,
      action: "reset",
      module: "level_definition",
      target: "all_levels",
      ip: getClientIP(context.request),
      detail: {
        action: "factory_reset",
        levelsReset: seeds.length,
      },
    });

    // 返回重置后的列表
    const defs = await getAllLevelDefinitions(DB, false);

    return jsonResponse(defs, "等级定义已重置为默认值");
  } catch (err) {
    console.error("[admin/levels] 重置失败:", err);
    return serverError("等级定义重置失败");
  }
};
