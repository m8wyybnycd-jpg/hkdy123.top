-- ═══════════════════════════════════════════════════════════
-- 页面配置管理 D1 迁移脚本
-- 项目: cloudgame-hub 后台管理系统
-- 说明: page_configs 表 + 索引 + 预置6个页面 + page:manage权限 + 超管授权
-- 幂等: 所有语句使用 IF NOT EXISTS / OR IGNORE，可重复执行
-- ═══════════════════════════════════════════════════════════

-- ═══ 建表 ═══

CREATE TABLE IF NOT EXISTS page_configs (
  page_key    TEXT    PRIMARY KEY,
  page_name   TEXT    NOT NULL,
  title       TEXT    NOT NULL DEFAULT '',
  subtitle    TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  is_enabled  INTEGER NOT NULL DEFAULT 1,
  params      TEXT    NOT NULL DEFAULT '{}',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_by  INTEGER
);

-- ═══ 索引 ═══

CREATE INDEX IF NOT EXISTS idx_page_configs_enabled
  ON page_configs(is_enabled, sort_order);

-- ═══ 预置6个页面 ═══

INSERT OR IGNORE INTO page_configs (page_key, page_name, title, subtitle, is_enabled, sort_order) VALUES
  ('cloud-games',    '云游戏',   '不用高配电脑，也能畅玩 3A 大作', '汇聚各大云游戏平台，按需选择最划算的方案', 1, 1),
  ('cloud-desktops', '云电脑',   '随时随地，高效办公',             '汇聚优质办公云电脑方案',                   1, 2),
  ('deals',          '薅羊毛',   '精选优惠，天天薅羊毛',           '最新游戏优惠信息一网打尽',                 1, 3),
  ('library',        '游戏库',   '探索你的下一款游戏',             '精选游戏推荐与评测',                       1, 4),
  ('free-games',     '免费资源', '免费也能玩得爽',                 '精选免费游戏资源',                         1, 5),
  ('sms-platforms',  '接码平台', '接码平台导航',                   '精选靠谱的接码平台',                       1, 6);

-- 根落地页（后台可配 hero + 各 section 文案）
INSERT OR IGNORE INTO page_configs (page_key, page_name, title, subtitle, is_enabled, params, sort_order) VALUES
  ('home', '首页', '一个入口，玩转所有云端世界', '3000+ 云游戏、100+ 云电脑、每日更新的羊毛优惠——一个账号极速开玩，告别卡顿与昂贵硬件。', 1,
   '{"kickerHero":"CLOUD GAMING · CLOUD PC · DEALS HUB","secTrioKicker":"WHY 云玩汇","secTrioTitle":"三块核心，覆盖你的全部云端需求","secGamesKicker":"CLOUD GAMES","secGamesTitle":"热门云游戏，即点即玩","secPcKicker":"CLOUD PC · 云端办公","secPcTitle":"云端办公，高性能云电脑随开随用","secDealsKicker":"DEALS HUB · 优惠聚合","secDealsTitle":"羊毛优惠聚合，省钱才是硬道理","secResKicker":"FREE RESOURCES · 免费资源","secResTitle":"免费游戏资源，一键转存即玩","secProofKicker":"TRUSTED BY USERS · 用户口碑","secProofTitle":"被万千玩家信赖的云端入口","secCtaKicker":"GET STARTED · 立即开始","secCtaTitle":"现在加入云玩汇，开启你的云端世界","secCtaSub":"免费注册，秒级开通，海量游戏与云电脑等你体验"}', 0);

-- ═══ 新增 page:manage 权限 ═══

INSERT OR IGNORE INTO permissions (code, name, module, action, sort_order) VALUES
  ('page:manage', '管理页面配置', 'page', 'manage', 19);

-- ═══ 超级管理员自动获得 page:manage 权限 ═══

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'super_admin' AND p.code = 'page:manage';
