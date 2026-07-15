-- ============================================
-- Migration: User Level Definitions
-- Project: cloudgame-hub
-- Date: 2026-07-15
-- Description:
--   1. user_level_definitions 表（1-10 级定义：名称/描述/配额倍率/功能开关/徽章色）
--   2. 种子数据：10 个等级完整定义
--   3. RBAC 新增权限码 level:manage
-- ============================================

-- ═══ 1. user_level_definitions 表 ═══

CREATE TABLE IF NOT EXISTS user_level_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level INTEGER NOT NULL UNIQUE,              -- 1-10
  name TEXT NOT NULL,                          -- 等级名称：青铜/白银/黄金...
  description TEXT,                            -- 等级描述
  quota_multiplier REAL NOT NULL DEFAULT 1.0,  -- 配额倍率（base × multiplier）
  daily_limit_override INTEGER,                -- 覆盖日限额（NULL = 用倍率计算）
  monthly_limit_override INTEGER,              -- 覆盖月限额（NULL = 用倍率计算）
  features TEXT DEFAULT '[]',                  -- JSON 数组：功能开关列表
  badge_color TEXT NOT NULL DEFAULT '#6b7280', -- 徽章颜色（hex）
  badge_icon TEXT,                             -- 徽章图标标识（lucide icon name）
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_level_def_level ON user_level_definitions(level);
CREATE INDEX IF NOT EXISTS idx_level_def_active ON user_level_definitions(is_active);

-- ═══ 2. 种子数据：10 级完整定义 ═══
-- 配额基数：日 10000 / 月 100000
-- features 可选值：pet_chat, pet_memory, pet_custom_persona, priority_support,
--                  advanced_analytics, api_access, custom_model, unlimited_history

INSERT OR IGNORE INTO user_level_definitions
  (level, name, description, quota_multiplier, daily_limit_override, monthly_limit_override,
   features, badge_color, badge_icon, sort_order, is_active)
VALUES
  (1, '青铜',
   '初始等级，基础 AI 对话功能，每日 10,000 Token 配额',
   1.0, NULL, NULL,
   '["pet_chat"]',
   '#8b5e3c', 'shield', 1, 1),

  (2, '白银',
   '解锁长期记忆功能，配额提升 50%',
   1.5, NULL, NULL,
   '["pet_chat","pet_memory"]',
   '#9ca3af', 'medal', 2, 1),

  (3, '黄金',
   '解锁自定义宠物人设，配额翻倍',
   2.0, NULL, NULL,
   '["pet_chat","pet_memory","pet_custom_persona"]',
   '#f59e0b', 'crown', 3, 1),

  (4, '铂金',
   '解锁优先支持通道，配额 3 倍',
   3.0, NULL, NULL,
   '["pet_chat","pet_memory","pet_custom_persona","priority_support"]',
   '#8b5cf6', 'gem', 4, 1),

  (5, '钻石',
   '解锁高级数据分析，配额 5 倍',
   5.0, NULL, NULL,
   '["pet_chat","pet_memory","pet_custom_persona","priority_support","advanced_analytics"]',
   '#06b6d4', 'diamond', 5, 1),

  (6, '星耀',
   '解锁 API 接口访问，配额 8 倍',
   8.0, NULL, NULL,
   '["pet_chat","pet_memory","pet_custom_persona","priority_support","advanced_analytics","api_access"]',
   '#3b82f6', 'star', 6, 1),

  (7, '王者',
   '解锁自定义模型选择，配额 12 倍',
   12.0, NULL, NULL,
   '["pet_chat","pet_memory","pet_custom_persona","priority_support","advanced_analytics","api_access","custom_model"]',
   '#ef4444', 'swords', 7, 1),

  (8, '传奇',
   '解锁无限历史记录，配额 16 倍',
   16.0, NULL, NULL,
   '["pet_chat","pet_memory","pet_custom_persona","priority_support","advanced_analytics","api_access","custom_model","unlimited_history"]',
   '#ec4899', 'trophy', 8, 1),

  (9, '史诗',
   '高级会员，配额 20 倍，享有专属客服',
   20.0, NULL, NULL,
   '["pet_chat","pet_memory","pet_custom_persona","priority_support","advanced_analytics","api_access","custom_model","unlimited_history"]',
   '#f97316', 'flame', 9, 1),

  (10, '神话',
   '最高等级，配额 30 倍，全部功能解锁',
   30.0, NULL, NULL,
   '["pet_chat","pet_memory","pet_custom_persona","priority_support","advanced_analytics","api_access","custom_model","unlimited_history"]',
   '#ffd700', 'sparkles', 10, 1);

-- ═══ 3. RBAC 新增权限码 ═══

INSERT OR IGNORE INTO permissions (code, name, module, action, sort_order) VALUES
  ('level:manage', '管理等级定义', 'user', 'manage_level_def', 37);

-- 将新权限分配给超级管理员
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'super_admin'
    AND p.code = 'level:manage'
    AND p.id NOT IN (
      SELECT permission_id FROM role_permissions WHERE role_id = r.id
    );
