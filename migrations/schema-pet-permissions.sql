-- ============================================
-- 宠物管理权限种子数据
-- ============================================
INSERT OR IGNORE INTO permissions (code, name, module, action, sort_order) VALUES
  ('pet:view',   '查看宠物',   'pet', 'view',   14),
  ('pet:manage', '管理宠物',   'pet', 'manage', 15);

-- 给 super_admin 角色分配宠物权限（如果角色存在）
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'super_admin'
  AND p.code IN ('pet:view', 'pet:manage');
