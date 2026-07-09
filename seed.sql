-- ============================================
-- Seed Data for cloudgame-hub D1 database
-- ============================================
-- Run with: npx wrangler d1 execute cloudgame-hub-db --local --file=seed.sql
-- ============================================

-- Clear existing data (optional, for clean re-seed)
DELETE FROM platforms;
DELETE FROM cloud_desktops;
DELETE FROM deals;

-- ── Platforms (10 entries) ───────────────────────────────

INSERT INTO platforms (id, name, color, price, free_info, url, description, tags, activity, sort_order) VALUES
('netease', '网易云游戏', '#e60012', '端游 0.4~8 元/时', '新用户送 2 小时电脑 + 3 天手机；每日签到连签 7 天 130 分钟；看广告每次 +10 分钟', 'https://cg.163.com/', '网页版直接开玩，覆盖端游手游，签到看广告可攒免费时长', '["网页版","签到攒时长","端游手游"]', '连签 7 天送 130 分钟，看广告额外领时长', 1),
('start', '腾讯START', '#00a4ff', '白金会员 38 元/月（约 0.16 元/时）', '部分游戏免费畅玩', 'https://start.qq.com/', '腾讯官方云游戏，白金月费制性价比高，主打腾讯系游戏', '["腾讯官方","月费制","性价比高"]', '新用户首月半价，部分游戏限时免费', 2),
('shunwang', '顺网云电脑', '#ff6b00', '约 0.18 元/分钟起', '每天可领免费体验时长', 'https://cpc.icloud.cn/', '网吧云鼻祖，能跑 Steam 3A 大作，按分钟计费灵活', '["按分钟计费","3A大作","Steam"]', '每日签到领免费时长，充值满赠活动', 3),
('dalong', '达龙云电脑', '#00b894', '按 15 分钟粒度计费', '新用户免费体验；签到/暗号领时长（7 天过期）', 'https://www.dalongyun.com/', '15 分钟计费粒度最灵活，适合短时间体验', '["15分钟粒度","签到暗号","灵活计费"]', '每日签到领时长，暗号兑换额外时长', 4),
('todesk', 'ToDesk云电脑', '#6c5ce7', '按时长计费', 'Web + 移动端新用户免费试用 1 小时', 'https://www.todesk.com/', '远程桌面起家，支持 Web 和移动端，新用户可免费试玩', '["远程桌面","多端支持","新用户免费"]', '新用户免费试用 1 小时', 5),
('haima', '海马云电脑', '#fd79a8', '约 1~2 元/时', '常送时长/折扣', 'https://www.haimawan.com/', '覆盖手游端游，价格亲民，活动多', '["价格亲民","手游端游","活动多"]', '不定期赠送时长和折扣券', 6),
('gelaiyun', '格来云游戏', '#2d3436', '约 0.2~0.5 元/时', '新用户免费体验 30 分钟；每日签到领时长', 'https://www.gleayun.com/', '老牌云游戏平台，支持 PC 和手机端，游戏库丰富', '["老牌平台","PC手机端","签到领时长"]', '新用户免费 30 分钟，每日签到攒时长', 7),
('caiji', '菜鸡云游戏', '#00cec9', '约 0.15~0.3 元/时', '新用户送 1 小时；每日签到领 10 分钟', 'https://www.caijiyun.com/', '主打低价云游戏，按小时计费便宜，适合轻度玩家', '["低价","按小时计费","轻度玩家"]', '新用户送 1 小时，每日签到领 10 分钟', 8),
('hongshouzhi', '红手指云手机', '#d63031', '约 15~60 元/月', '新用户免费试用 24 小时', 'https://www.redfinger.com/', '专注云手机服务，可 24 小时挂机手游，适合挂机类游戏', '["云手机","24小时挂机","手游专用"]', '新用户免费试用 24 小时', 9),
('moguyun', '蘑菇云游戏', '#6c5ce7', '约 0.1~0.4 元/时', '新用户送 2 小时；每日签到领时长', 'https://www.moguyun.com/', '新兴云游戏平台，价格低廉，支持端游和手游云化', '["价格低廉","端游手游","新兴平台"]', '新用户送 2 小时，每日签到领时长', 10);

-- ── Cloud Desktops (5 entries) ───────────────────────────

INSERT INTO cloud_desktops (id, name, url, description, scenarios, price_range, activity, sort_order) VALUES
('aliyun-wuying', '阿里云无影', 'https://www.aliyun.com/product/wuying', '阿里云旗下云桌面服务，支持多端接入，企业级安全与性能，适合设计、开发、办公场景', '["企业办公","设计渲染","软件开发","数据分析"]', '约 50~200 元/月（按配置）', '新用户免费试用 7 天', 1),
('qingjiao', '青椒云电脑', 'https://www.qingjiaocloud.com/', '主打高性价比办公云电脑，支持 PS/CAD/3D 建模等设计软件，按月或按需计费', '["设计制图","CAD绘图","视频剪辑","日常办公"]', '约 30~150 元/月', '新用户首月 5 折', 2),
('zanqi', '赞奇云桌面', 'https://www.zanqicloud.com/', '专注设计行业云桌面解决方案，支持专业级 3D 渲染和影视后期，GPU 加速性能强', '["3D渲染","影视后期","动画制作","建筑设计"]', '约 80~300 元/月', '企业用户可申请免费测试', 3),
('tianyi', '天翼云电脑', 'https://cloud.189.cn/', '中国电信旗下云电脑服务，网络稳定延迟低，适合政企办公和个人远程办公', '["政企办公","远程办公","教育培训","呼叫中心"]', '约 20~100 元/月', '新用户免费体验 3 天', 4),
('yidong', '移动云桌面', 'https://cloud.10086.cn/', '中国移动旗下云桌面服务，依托移动 5G 网络，支持多终端接入，适合移动办公场景', '["移动办公","5G远程桌面","政企办公","教育"]', '约 25~120 元/月', '新用户首月免费试用', 5);

-- ── Deals (19 entries) ───────────────────────────────────

INSERT INTO deals (id, title, description, link, category, tags, updated_at, expires_at, sort_order) VALUES
-- checkin (4)
('checkin-netease', '网易云游戏每日签到', '连签 7 天送 130 分钟电脑时长，看广告每次额外 +10 分钟。网页版直接签到，零成本攒时长。', 'https://cg.163.com/', 'checkin', '["网易云游戏","每日签到","免费时长"]', '2025-07-01', '', 1),
('checkin-shunwang', '顺网云电脑每日领时长', '每天可领免费体验时长，连续签到天数越多奖励越高。适合每天短时间体验云游戏。', 'https://cpc.icloud.cn/', 'checkin', '["顺网云","每日领取","免费体验"]', '2025-07-01', '', 2),
('checkin-dalong', '达龙云电脑签到+暗号领时长', '每日签到领时长，关注官方公众号获取暗号可额外兑换时长（7 天内有效）。双重渠道白嫖。', 'https://www.dalongyun.com/', 'checkin', '["达龙云","暗号兑换","双重渠道"]', '2025-07-01', '', 3),
('checkin-gelaiyun', '格来云游戏每日签到', '每日签到领免费时长，连续签到可获额外奖励。新用户首次签到送 30 分钟。', 'https://www.gleayun.com/', 'checkin', '["格来云","每日签到","新用户福利"]', '2025-07-01', '', 4),
-- limited_free (3)
('limited-epic', 'EPIC Games 每周免费游戏', 'EPIC 商店每周四发放 1-2 款免费游戏，永久入库。关注 EPIC 商店页面或订阅提醒，不错过任何限免。', 'https://store.epicgames.com/zh-CN/free-games', 'limited_free', '["EPIC","每周免费","永久入库"]', '2025-07-04', '', 5),
('limited-steam', 'Steam 限免/周末试玩', 'Steam 不定期提供周末免费试玩游戏，部分游戏限时免费领取。关注 Steam 商店首页和社区动态获取最新限免信息。', 'https://store.steampowered.com/', 'limited_free', '["Steam","周末试玩","限时免费"]', '2025-07-03', '', 6),
('limited-gog', 'GOG 限免活动', 'GOG 平台不定期推出经典游戏限时免费领取活动，关注 GOG 首页或社区通知及时领取。', 'https://www.gog.com/', 'limited_free', '["GOG","经典游戏","限时免费"]', '2025-06-28', '', 7),
-- coupon (4)
('coupon-start', '腾讯START 新用户首月半价', '新用户注册 START 白金会员首月半价，仅需 19 元即可畅玩 240 小时。适合想体验腾讯系云游戏的用户。', 'https://start.qq.com/', 'coupon', '["腾讯START","首月半价","新用户"]', '2025-07-01', '2025-12-31', 8),
('coupon-shunwang', '顺网云电脑 8 折优惠码', '限时 8 折优惠码：SHUNWANG80（不定期更新）。充值时长可叠加使用，按分钟计费更划算。', 'https://cpc.icloud.cn/', 'coupon', '["顺网云","8折优惠","充值折扣"]', '2025-07-02', '2025-08-31', 9),
('coupon-dalong', '达龙云电脑充值满赠活动', '充值满 50 元送 10 元时长，满 100 元送 30 元时长。限时活动，适合长期使用达龙云的用户囤时长。', 'https://www.dalongyun.com/', 'coupon', '["达龙云","充值满赠","限时活动"]', '2025-07-01', '2025-07-31', 10),
('coupon-moguyun', '蘑菇云游戏新用户 5 折券', '新注册用户可领取 5 折体验券，首充任意金额享半价。价格本就低廉，叠加折扣更划算。', 'https://www.moguyun.com/', 'coupon', '["蘑菇云","5折券","新用户"]', '2025-06-25', '2025-09-30', 11),
-- new_user (4)
('newuser-netease', '网易云游戏新用户送 2 小时', '新注册网易云游戏用户免费送 2 小时电脑时长 + 3 天手机云游戏。无需充值即可体验端游和手游云化。', 'https://cg.163.com/', 'new_user', '["网易云游戏","免费2小时","手机端"]', '2025-07-01', '', 12),
('newuser-todesk', 'ToDesk 新用户免费试用 1 小时', '新用户注册 ToDesk 云电脑可免费试用 1 小时，支持 Web 端和移动端。远程桌面起家，体验流畅。', 'https://www.todesk.com/', 'new_user', '["ToDesk","免费1小时","多端支持"]', '2025-07-01', '', 13),
('newuser-caiji', '菜鸡云游戏新用户送 1 小时', '新用户注册即送 1 小时免费时长，价格低廉的平台试水首选。按小时计费最低约 0.15 元/时。', 'https://www.caijiyun.com/', 'new_user', '["菜鸡云","免费1小时","低价"]', '2025-07-01', '', 14),
('newuser-hongshouzhi', '红手指云手机免费试用 24 小时', '新用户可免费试用云手机 24 小时，适合挂机类手游 24 小时不间断运行。专注云手机服务。', 'https://www.redfinger.com/', 'new_user', '["红手指","云手机","24小时试用"]', '2025-07-01', '', 15),
-- wildcard (3)
('wildcard-ad-watching', '看广告攒时长攻略', '网易云游戏、格来云等平台支持看广告获取免费时长。每天看几段短视频广告即可攒够当日游戏时长，适合零氪玩家。', 'https://cg.163.com/', 'wildcard', '["看广告","免费时长","零氪"]', '2025-07-01', '', 16),
('wildcard-multi-register', '多平台新用户注册白嫖法', '同时注册多个云游戏平台（网易、START、顺网、达龙、格来、菜鸡等），每个平台都有新用户免费时长，加起来可白嫖 10+ 小时。', 'https://cg.163.com/', 'wildcard', '["多平台","新用户","白嫖攻略"]', '2025-07-01', '', 17),
('wildcard-student', '学生认证额外福利', '部分平台（如腾讯START、网易云游戏）支持学生认证，认证后可享专属折扣或额外免费时长。用教育邮箱或学生证即可认证。', 'https://start.qq.com/', 'wildcard', '["学生认证","专属折扣","教育优惠"]', '2025-06-20', '', 18);

-- ── Banners (2 entries) ───────────────────────────────────

INSERT INTO banners (title, image_url, link_url, sort_order, is_active, description) VALUES
('云游戏畅玩季', 'https://placehold.co/1920x500/0f172a/38bdf8?text=Cloud+Gaming+2025', '/cloud-games', 0, 1, '首页主推轮播图'),
('薅羊毛专区', 'https://placehold.co/1920x500/1e1b4b/c084fc?text=Deals+and+Offers', '/deals', 1, 1, '优惠活动入口');

-- ── Banner Permissions (2 entries, id=19,20) ──────────────

INSERT OR IGNORE INTO permissions (id, code, name, module, action, sort_order) VALUES
  (19, 'banner:read', '查看轮播图', 'banner', 'read', 19),
  (20, 'banner:write', '管理轮播图', 'banner', 'write', 20);

-- ── Role Permissions: super_admin gets banner permissions ──

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'super_admin' AND p.code IN ('banner:read', 'banner:write');

-- ── Role Permissions: operator gets banner:read ───────────

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'operator' AND p.code = 'banner:read';
