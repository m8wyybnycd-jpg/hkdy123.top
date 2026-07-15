-- ============================================
-- Migration: Admin Backend Enhancement V2
-- Project: cloudgame-hub
-- Date: 2026-07-15
-- Description:
--   1. users 表扩展（封禁字段）
--   2. user_status_logs（用户状态审计）
--   3. token_usage_logs（Token 用量追踪）
--   4. user_quotas（用户配额）
--   5. rate_limits（速率限制规则）
--   6. encryption_keys（加密密钥版本管理）
--   7. 预置速率限制规则 + 初始密钥版本
--   8. RBAC 新增权限码
-- ============================================

-- ═══ 1. users 表扩展：封禁支持 ═══

ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN banned_reason TEXT;
ALTER TABLE users ADD COLUMN banned_at TEXT;

-- ═══ 2. user_status_logs：用户状态变更审计 ═══

CREATE TABLE IF NOT EXISTS user_status_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,           -- 'ban', 'unban', 'level_change', 'role_change'
  old_value TEXT,
  new_value TEXT,
  operator_id INTEGER,
  operator_name TEXT,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_status_logs_user_id ON user_status_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_logs_created_at ON user_status_logs(created_at);

-- ═══ 3. token_usage_logs：Token 消费追踪 ═══

CREATE TABLE IF NOT EXISTS token_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  credential_id INTEGER,
  model TEXT,
  endpoint TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost REAL DEFAULT 0.0,
  ip TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'success', -- 'success', 'blocked', 'error'
  block_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_credential_id ON token_usage_logs(credential_id);

-- ═══ 4. user_quotas：用户配额 ═══

CREATE TABLE IF NOT EXISTS user_quotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  daily_limit INTEGER DEFAULT 10000,
  monthly_limit INTEGER DEFAULT 100000,
  current_daily_usage INTEGER DEFAULT 0,
  current_monthly_usage INTEGER DEFAULT 0,
  last_reset_date TEXT,
  last_reset_month TEXT,
  is_unlimited INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══ 5. rate_limits：速率限制规则 ═══

CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  endpoint_pattern TEXT NOT NULL,
  method TEXT DEFAULT 'ALL',
  max_requests INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL,
  per_user INTEGER DEFAULT 1,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══ 6. encryption_keys：密钥版本管理 ═══

CREATE TABLE IF NOT EXISTS encryption_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_version INTEGER NOT NULL UNIQUE,
  key_hash TEXT NOT NULL,
  algorithm TEXT DEFAULT 'AES-256-GCM',
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  rotated_at TEXT
);

-- ═══ 7. 预置数据 ═══

-- 7.1 默认速率限制规则
INSERT OR IGNORE INTO rate_limits (name, endpoint_pattern, method, max_requests, window_seconds, per_user) VALUES
  ('API全局限制', '/api/*', 'ALL', 300, 60, 1),
  ('Token消费限制', '/api/ai/*', 'POST', 30, 60, 1),
  ('管理操作限制', '/api/admin/*', 'ALL', 120, 60, 1);

-- 7.2 初始加密密钥版本（哈希占位，生产环境需替换）
INSERT OR IGNORE INTO encryption_keys (key_version, key_hash, algorithm, is_active) VALUES
  (1, 'PLACEHOLDER_REPLACE_ON_DEPLOY', 'AES-256-GCM', 1);

-- ═══ 8. RBAC 种子数据：新增权限码 ═══

-- 8.1 扩展 permissions 表结构（兼容旧 migration 中未包含的列）
-- D1 的 ALTER TABLE ADD COLUMN 不会检查列是否已存在，需应用层控制

INSERT OR IGNORE INTO permissions (code, name, module, action, sort_order) VALUES
  ('credential:manage', '管理凭证', 'credential', 'manage', 14),
  ('user:manage_level', '管理用户等级', 'user', 'manage_level', 15),
  ('banner:read', '查看轮播图', 'banner', 'read', 16),
  ('banner:write', '管理轮播图', 'banner', 'write', 17),
  ('page:manage', '管理页面配置', 'page', 'manage', 18),
  ('pet:view', '查看AI宠物', 'pet', 'view', 19),
  ('pet:manage', '管理AI宠物', 'pet', 'manage', 20),
  ('image:view', '查看图片', 'image', 'view', 21),
  ('image:manage', '管理图片', 'image', 'manage', 22),
  ('sms:view', '查看接码平台', 'sms', 'view', 23),
  ('sms:manage', '管理接码平台', 'sms', 'manage', 24),
  ('free_game:view', '查看免费游戏', 'free_game', 'view', 25),
  ('free_game:manage', '管理免费游戏', 'free_game', 'manage', 26),
  ('announcement:view', '查看公告', 'announcement', 'view', 27),
  ('announcement:manage', '管理公告', 'announcement', 'manage', 28),
  ('message:view', '查看消息', 'message', 'view', 29),
  ('message:manage', '管理消息', 'message', 'manage', 30),
  ('token:view', '查看Token使用', 'token', 'view', 31),
  ('token:manage', '管理Token', 'token', 'manage', 32),
  ('quota:view', '查看配额', 'quota', 'view', 33),
  ('quota:manage', '管理配额', 'quota', 'manage', 34),
  ('audit:view', '查看审计日志', 'audit', 'view', 35),
  ('encryption:manage', '管理加密密钥', 'security', 'manage', 36);

-- 8.2 将新权限分配给超级管理员角色
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'super_admin'
    AND p.id NOT IN (
      SELECT permission_id FROM role_permissions WHERE role_id = r.id
    );
