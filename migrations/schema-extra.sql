-- ═══════════════════════════════════════════════════════════
-- 扩展模块 D1 迁移脚本：公告管理 + 站内信 + 日志查看 + 新权限
-- 项目: cloudgame-hub 后台管理系统
-- 日期: 2026-07-08
-- 说明: 4张新表 + 5个索引 + 5项新权限 + 角色权限关联更新
-- ═══════════════════════════════════════════════════════════

-- ═══ 公告表 ═══

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'notice',
  status INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);

-- ═══ 站内信表 ═══

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL DEFAULT 0,
  recipient_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);

-- ═══ 操作日志表 ═══

CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  target TEXT,
  ip TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_op_logs_user ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_op_logs_created ON operation_logs(created_at);

-- ═══ 登录日志表 ═══

CREATE TABLE IF NOT EXISTS login_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  ip TEXT,
  user_agent TEXT,
  status TEXT NOT NULL,
  method TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_created ON login_logs(created_at);

-- ═══ 新增权限(5项) ═══

INSERT OR IGNORE INTO permissions (code, name, module, action, sort_order) VALUES
  ('announcement:view','查看公告','announcement','view',14),
  ('announcement:manage','管理公告','announcement','manage',15),
  ('message:view','查看消息','message','view',16),
  ('message:manage','管理消息','message','manage',17),
  ('log:view','查看日志','log','view',18);

-- ═══ 角色权限关联更新 ═══

-- 超级管理员 = 全部权限（包括新增的5项）
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'super_admin' AND p.code IN (
    'announcement:view','announcement:manage',
    'message:view','message:manage',
    'log:view'
  );

-- 运营人员增加 announcement:view, message:view, log:view
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'operator' AND p.code IN (
    'announcement:view','message:view','log:view'
  );
