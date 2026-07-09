-- ═══════════════════════════════════════════════════════════
-- RBAC + 系统设置 D1 迁移脚本
-- 项目: cloudgame-hub 后台管理系统
-- 日期: 2026-07-08
-- 说明: 5张表 + 4个索引 + 预置数据 + 现有管理员迁移
-- ═══════════════════════════════════════════════════════════

-- ═══ 建表 ═══

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  "group" TEXT NOT NULL DEFAULT 'basic',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══ 索引 ═══

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_settings_group ON settings("group");

-- ═══ 预置角色 ═══

INSERT OR IGNORE INTO roles (name, code, description, is_system, status) VALUES
  ('超级管理员', 'super_admin', '拥有系统全部权限，不可删除或禁用', 1, 1),
  ('运营人员', 'operator', '负责日常内容运营，可管理薅羊毛和查看所有数据', 1, 1);

-- ═══ 预置权限(13项) ═══

INSERT OR IGNORE INTO permissions (code, name, module, action, sort_order) VALUES
  ('dashboard:view','查看仪表盘','dashboard','view',1),
  ('user:view','查看用户','user','view',2),
  ('user:manage','管理用户','user','manage',3),
  ('platform:view','查看云游戏平台','platform','view',4),
  ('platform:manage','管理云游戏平台','platform','manage',5),
  ('desktop:view','查看办公云电脑','desktop','view',6),
  ('desktop:manage','管理办公云电脑','desktop','manage',7),
  ('deal:view','查看薅羊毛','deal','view',8),
  ('deal:manage','管理薅羊毛','deal','manage',9),
  ('game:view','查看游戏库','game','view',10),
  ('game:manage','管理游戏库','game','manage',11),
  ('role:manage','管理权限角色','role','manage',12),
  ('settings:manage','管理系统设置','settings','manage',13);

-- ═══ 预置角色权限关联 ═══

-- 超级管理员 = 全部权限
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = 'super_admin';

-- 运营人员 = 全部:view + deal:manage
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'operator' AND p.code IN (
    'dashboard:view','user:view','platform:view','desktop:view',
    'deal:view','deal:manage','game:view'
  );

-- ═══ 预置系统设置 ═══

INSERT OR IGNORE INTO settings (key, value, "group") VALUES
  ('site_name','云游戏中心','basic'),
  ('logo_url','','basic'),
  ('icp_number','','basic'),
  ('contact_email','','basic'),
  ('contact_qq','','basic'),
  ('contact_wechat','','basic'),
  ('site_description','云游戏/云电脑入口聚合平台','basic'),
  ('password_min_length','8','params'),
  ('password_max_attempts','5','params'),
  ('verification_code_ttl','10','params'),
  ('verification_code_interval','60','params'),
  ('registration_enabled','true','params'),
  ('operation_log_enabled','true','logging'),
  ('login_log_enabled','true','logging'),
  ('log_retention_days','30','logging');

-- ═══ 迁移：现有 is_admin=1 用户绑定 super_admin 角色 ═══

INSERT OR IGNORE INTO user_roles (user_id, role_id)
  SELECT u.id, r.id FROM users u, roles r
  WHERE u.is_admin = 1 AND r.code = 'super_admin';
