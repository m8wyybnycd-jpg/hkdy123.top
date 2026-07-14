-- ═══════════════════════════════════════════════════════════
-- 用户等级管理权限播种
-- 项目: cloudgame-hub 后台管理系统
-- 新增权限: user:manage_level（管理用户等级）
-- 授予: super_admin（系统最高角色，自动继承全部权限）
-- 幂等: 全部使用 INSERT OR IGNORE，可重复执行。
-- ═══════════════════════════════════════════════════════════

-- 1) 注册权限
INSERT OR IGNORE INTO permissions (code, name, module, action, sort_order) VALUES
  ('user:manage_level', '管理用户等级', 'user', 'manage_level', 16);

-- 2) 授权给超级管理员（CROSS JOIN 仅匹配一行，安全幂等）
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'super_admin'
  AND p.code = 'user:manage_level';
