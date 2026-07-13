-- ═══════════════════════════════════════════════════════════
-- P0-1: 新增 home 页面配置，使根落地页(/)内容可由后台管理
-- 落地页 hero 文案走友好字段 title/subtitle；各 section 文案走 params JSON
-- 幂等: INSERT OR IGNORE，可重复执行
-- ═══════════════════════════════════════════════════════════

INSERT OR IGNORE INTO page_configs
  (page_key, page_name, title, subtitle, description, is_enabled, params, sort_order, updated_at, updated_by)
VALUES (
  'home',
  '首页',
  '一个入口，玩转所有云端世界',
  '3000+ 云游戏、100+ 云电脑、每日更新的羊毛优惠——一个账号极速开玩，告别卡顿与昂贵硬件。',
  '',
  1,
  '{"kickerHero":"CLOUD GAMING · CLOUD PC · DEALS HUB","secTrioKicker":"WHY 云玩汇","secTrioTitle":"三块核心，覆盖你的全部云端需求","secGamesKicker":"CLOUD GAMES","secGamesTitle":"热门云游戏，即点即玩","secPcKicker":"CLOUD PC · 云端办公","secPcTitle":"云端办公，高性能云电脑随开随用","secDealsKicker":"DEALS HUB · 优惠聚合","secDealsTitle":"羊毛优惠聚合，省钱才是硬道理","secResKicker":"FREE RESOURCES · 免费资源","secResTitle":"免费游戏资源，一键转存即玩","secProofKicker":"TRUSTED BY USERS · 用户口碑","secProofTitle":"被万千玩家信赖的云端入口","secCtaKicker":"GET STARTED · 立即开始","secCtaTitle":"现在加入云玩汇，开启你的云端世界","secCtaSub":"免费注册，秒级开通，海量游戏与云电脑等你体验"}',
  0,
  NULL,
  NULL
);
