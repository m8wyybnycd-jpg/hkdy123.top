-- ═══════════════════════════════════════════════════════════
-- 用户等级字段迁移
-- 项目: cloudgame-hub 后台管理系统
-- 说明: users 表新增 level 列（账号等级 / 会员等级，1-10，默认 1）
--       由 POST /api/admin/users/:id/level 接口读写
-- 注意: D1 的 ALTER TABLE ADD COLUMN 不支持 IF NOT EXISTS，
--       本文件仅执行一次；重复执行会因 "duplicate column" 报错。
-- ═══════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 1;
