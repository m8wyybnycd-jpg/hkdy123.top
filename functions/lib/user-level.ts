/**
 * User Level System — 等级定义、配额计算、功能开关
 *
 * 本模块是等级系统的唯一工具库，所有需要读取等级定义的地方都应调用此模块。
 *
 * 核心职责：
 *   1. 从 D1 读取 user_level_definitions 表
 *   2. 根据用户 level 计算有效配额（倍率 × 基数，或覆盖值）
 *   3. 检查用户是否拥有某个功能开关
 *   4. 提供等级列表查询（管理后台用）
 *
 * 配额计算规则：
 *   - 如果 daily_limit_override 不为 NULL → 使用覆盖值
 *   - 否则 → DEFAULT_DAILY_LIMIT × quota_multiplier
 *   - 月限额同理
 */

// ── Constants ───────────────────────────────────────────

/** 配额基数（与 consumption-guard.ts 保持一致） */
export const BASE_DAILY_LIMIT = 10000;
export const BASE_MONTHLY_LIMIT = 100000;

/** 等级范围 */
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;

// ── Types ───────────────────────────────────────────────

/** D1 user_level_definitions 行结构 */
export interface LevelDefinitionRow {
  id: number;
  level: number;
  name: string;
  description: string | null;
  quota_multiplier: number;
  daily_limit_override: number | null;
  monthly_limit_override: number | null;
  features: string; // JSON 字符串
  badge_color: string;
  badge_icon: string | null;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/** 对外暴露的等级定义（已解析） */
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

/** 有效配额（经过等级倍率计算后的最终值） */
export interface EffectiveQuota {
  dailyLimit: number;
  monthlyLimit: number;
  quotaMultiplier: number;
  level: number;
  levelName: string;
}

// ── Internal cache ──────────────────────────────────────

/** 单次请求内的等级定义缓存（避免同一请求多次查 D1） */
const defCache = new Map<number, LevelDefinition>();
let allDefsCache: LevelDefinition[] | null = null;

// ── Functions ───────────────────────────────────────────

/**
 * 将 D1 行转换为对外暴露的 LevelDefinition（解析 features JSON）
 */
function parseRow(row: LevelDefinitionRow): LevelDefinition {
  let features: string[] = [];
  try {
    const parsed = JSON.parse(row.features || "[]");
    if (Array.isArray(parsed)) {
      features = parsed.filter((f) => typeof f === "string");
    }
  } catch {
    features = [];
  }

  return {
    level: row.level,
    name: row.name,
    description: row.description ?? "",
    quotaMultiplier: row.quota_multiplier,
    dailyLimitOverride: row.daily_limit_override,
    monthlyLimitOverride: row.monthly_limit_override,
    features,
    badgeColor: row.badge_color,
    badgeIcon: row.badge_icon,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
  };
}

/**
 * 获取指定等级的定义。
 * 带请求级缓存。
 *
 * @param db   - D1 数据库
 * @param level - 等级（1-10）
 * @returns 等级定义，如果等级不存在或未激活则返回 null
 */
export async function getLevelDefinition(
  db: D1Database,
  level: number
): Promise<LevelDefinition | null> {
  // 检查缓存
  if (defCache.has(level)) {
    return defCache.get(level)!;
  }

  try {
    const row = await db
      .prepare(
        `SELECT * FROM user_level_definitions
         WHERE level = ? AND is_active = 1`
      )
      .bind(level)
      .first<LevelDefinitionRow>();

    if (!row) {
      return null;
    }

    const def = parseRow(row);
    defCache.set(level, def);
    return def;
  } catch (err) {
    console.error("[user-level] Failed to query level definition:", err);
    return null;
  }
}

/**
 * 获取所有等级定义（按 level 升序）。
 * 带请求级缓存。
 *
 * @param db          - D1 数据库
 * @param activeOnly  - 是否只返回激活的等级，默认 true
 */
export async function getAllLevelDefinitions(
  db: D1Database,
  activeOnly = true
): Promise<LevelDefinition[]> {
  if (allDefsCache) {
    return activeOnly ? allDefsCache.filter((d) => d.isActive) : allDefsCache;
  }

  try {
    const result = await db
      .prepare(
        `SELECT * FROM user_level_definitions
         ${activeOnly ? "WHERE is_active = 1" : ""}
         ORDER BY level ASC`
      )
      .all<LevelDefinitionRow>();

    const defs = (result.results || []).map(parseRow);
    allDefsCache = defs;
    return defs;
  } catch (err) {
    console.error("[user-level] Failed to query all level definitions:", err);
    return [];
  }
}

/**
 * 根据用户等级计算有效配额。
 *
 * 计算规则：
 *   1. 查等级定义 → 有 override 用 override，否则用 base × multiplier
 *   2. 等级定义不存在（表未迁移）→ 降级为 base 配额
 *   3. 等级超出范围 → 钳制到 1-10
 *
 * @param db     - D1 数据库
 * @param level  - 用户等级
 * @returns 有效配额
 */
export async function getEffectiveQuota(
  db: D1Database,
  level: number
): Promise<EffectiveQuota> {
  // 钳制等级范围
  const clampedLevel = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level));

  const def = await getLevelDefinition(db, clampedLevel);

  if (!def) {
    // 降级：表未迁移或等级未定义，使用基数
    return {
      dailyLimit: BASE_DAILY_LIMIT,
      monthlyLimit: BASE_MONTHLY_LIMIT,
      quotaMultiplier: 1.0,
      level: clampedLevel,
      levelName: `Lv.${clampedLevel}`,
    };
  }

  const dailyLimit =
    def.dailyLimitOverride !== null
      ? def.dailyLimitOverride
      : Math.round(BASE_DAILY_LIMIT * def.quotaMultiplier);

  const monthlyLimit =
    def.monthlyLimitOverride !== null
      ? def.monthlyLimitOverride
      : Math.round(BASE_MONTHLY_LIMIT * def.quotaMultiplier);

  return {
    dailyLimit,
    monthlyLimit,
    quotaMultiplier: def.quotaMultiplier,
    level: clampedLevel,
    levelName: def.name,
  };
}

/**
 * 检查指定等级是否拥有某个功能开关。
 *
 * 功能开关定义在 user_level_definitions.features JSON 数组中。
 * 常见值：pet_chat, pet_memory, pet_custom_persona, priority_support,
 *         advanced_analytics, api_access, custom_model, unlimited_history
 *
 * @param db      - D1 数据库
 * @param level   - 用户等级
 * @param feature - 功能标识
 * @returns true 如果该等级拥有此功能
 */
export async function checkLevelFeature(
  db: D1Database,
  level: number,
  feature: string
): Promise<boolean> {
  const clampedLevel = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level));
  const def = await getLevelDefinition(db, clampedLevel);

  if (!def) {
    // 降级：只有 pet_chat 默认可用
    return feature === "pet_chat";
  }

  return def.features.includes(feature);
}

/**
 * 批量检查功能开关。
 *
 * @param db       - D1 数据库
 * @param level    - 用户等级
 * @param features - 功能标识列表
 * @returns 每个功能的开关状态 Map
 */
export async function checkLevelFeatures(
  db: D1Database,
  level: number,
  features: string[]
): Promise<Record<string, boolean>> {
  const clampedLevel = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level));
  const def = await getLevelDefinition(db, clampedLevel);

  if (!def) {
    // 降级
    const result: Record<string, boolean> = {};
    for (const f of features) {
      result[f] = f === "pet_chat";
    }
    return result;
  }

  const result: Record<string, boolean> = {};
  for (const f of features) {
    result[f] = def.features.includes(f);
  }
  return result;
}

/**
 * 清除请求级缓存。
 * 在修改等级定义后调用。
 */
export function clearLevelDefinitionCache(): void {
  defCache.clear();
  allDefsCache = null;
}
