-- ============================================
-- Seed: free_games (26) + sms_platforms (22)
-- Plus permission codes for free_game / sms_platform modules
-- ============================================

DELETE FROM free_games;
DELETE FROM sms_platforms;

-- ── free_games (26 entries) ─────────────────────

INSERT INTO free_games (id, name, type, platform, description, quark_link, emoji, sort_order) VALUES
('fg01', '浪人崛起', '动作RPG', '客户端', '幕末开放世界武士动作游戏', 'https://pan.quark.cn/s/26112bf80f46', '⚔️', 1),
('fg02', '堕落之主', '动作', '客户端', '暗黑奇幻魂Like动作游戏', 'https://pan.quark.cn/s/aabf69932ba3', '💀', 2),
('fg03', '暗黑破坏神3 终极版', '动作RPG', '客户端', '暴雪经典刷宝打怪ARPG', 'https://pan.quark.cn/s/ad7a940c1f7d', '🔥', 3),
('fg04', '上古卷轴5 周年纪念版', '角色扮演', '客户端', '天际省开放世界史诗冒险', 'https://pan.quark.cn/s/41d75b78bbaf', '🐉', 4),
('fg05', '森林之子', '生存冒险', '客户端', '孤岛生存对抗食人族变异怪', 'https://pan.quark.cn/s/040de1e2dc3d', '🌲', 5),
('fg06', '塞尔达传说 旷野之息', '动作冒险', '客户端', '海拉鲁开放世界自由探索', 'https://pan.quark.cn/s/97f1406ca254', '🗡️', 6),
('fg07', '塞尔达传说 王国之泪', '动作冒险', '客户端', '天空与地底的全新海拉鲁冒险', 'https://pan.quark.cn/s/1fe1c3fc3ac5', '🏰', 7),
('fg08', '宝可梦 朱紫', '角色扮演', '客户端', '帕底亚地区开放式宝可梦冒险', 'https://pan.quark.cn/s/3d60c968c5f5', '⚡', 8),
('fg09', '宝可梦 阿尔宙斯', '动作RPG', '客户端', '远古洗翠地区捕捉宝可梦', 'https://pan.quark.cn/s/1e91baefaec8', '🌟', 9),
('fg10', '宝可梦 肉鸽', '休闲', '客户端', '宝可梦题材 Roguelike 爬塔', 'https://pan.quark.cn/s/274ec2723b4e', '🎲', 10),
('fg11', '去吧皮卡丘/伊布', '角色扮演', '客户端', '关都地区经典宝可梦重制', 'https://pan.quark.cn/s/126dd2bb3720', '⚡', 11),
('fg12', '全面战争 三国', '策略', '客户端', '三国题材大规模即时战略', 'https://pan.quark.cn/s/fb60c31ada83', '🏯', 12),
('fg13', '文明6 全DLC', '策略', '客户端', '回合制4X策略建立伟大文明', 'https://pan.quark.cn/s/e6f17b29a0ec', '🏛️', 13),
('fg14', '缺氧 眼冒金星', '模拟策略', '客户端', '小行星殖民地生存管理模拟', 'https://pan.quark.cn/s/59fac7546da6', '🚀', 14),
('fg15', '中国式家长', '休闲', '客户端', '模拟中国家庭教育养成', 'https://pan.quark.cn/s/87a1d4cf1bb3', '📚', 15),
('fg16', '僵尸世界大战', '射击', '客户端', '丧尸末世四人合作射击', 'https://pan.quark.cn/s/8bd816767cd6', '🔫', 16),
('fg17', '无主之地3 全DLC', '射击', '客户端', '漫画风刷宝射击夺宝游戏', 'https://pan.quark.cn/s/c61f90b30686', '💥', 17),
('fg18', '杀手3 豪华版', '动作', '客户端', '47号特工全球暗杀沙盒', 'https://pan.quark.cn/s/4f3ab970e745', '🎯', 18),
('fg19', '无人深空', '冒险', '客户端', '无限宇宙探索生存建造', 'https://pan.quark.cn/s/cd6981faa776', '🪐', 19),
('fg20', '以撒的结合 全DLC', '动作', '客户端', '肉鸽地牢弹幕射击经典', 'https://pan.quark.cn/s/0e10a092bcb8', '💔', 20),
('fg21', '饥荒', '生存', '客户端', '蒂姆伯顿画风荒野求生', 'https://pan.quark.cn/s/ea46dbb76993', '🌑', 21),
('fg22', '小骨英雄杀手', '动作', '客户端', '换头小骨Roguelite横版动作', 'https://pan.quark.cn/s/79beaaae356c', '💀', 22),
('fg23', '九日', '动作', '客户端', '道家庞克手绘风格类银河城', 'https://pan.quark.cn/s/b68c4fbb7668', '☯️', 23),
('fg24', '王国保卫战5', '策略', '客户端', '经典塔防系列最新作', 'https://pan.quark.cn/s/eae998155c00', '🛡️', 24),
('fg25', '月圆之夜 全DLC', '策略', '客户端', '黑暗童话风卡牌Roguelike', 'https://pan.quark.cn/s/984747b6b6a0', '🃏', 25),
('fg26', '街头霸王5 冠军版', '格斗', '客户端', '卡普空经典格斗终极版', 'https://pan.quark.cn/s/16299a4e7341', '👊', 26);

-- ── sms_platforms (22 entries) ────────────────

INSERT INTO sms_platforms (id, name, url, category, countries, is_free, need_register, support_chinese, retention, description, features, sort_order) VALUES
('sms01', '清码网', 'https://clearcode.cn', '国内免费', '中国', 1, 0, 1, '实时', '国内手机号在线接码，无需注册直接使用', '["无需注册","支持中文","国内号码","实时更新"]', 1),
('sms02', '小牛接码', 'https://xnsms.com', '国内免费', '中国', 1, 0, 1, '实时', '提供多个国内手机号，支持各种验证码接收', '["无需注册","支持中文","国内号码","多号码"]', 2),
('sms03', '星海接码', 'https://xinghai.party', '国内免费', '中国', 1, 0, 1, '实时', '界面简洁的国内接码平台', '["无需注册","支持中文","界面简洁","国内号码"]', 3),
('sms05', '云机短信', 'https://yunjisms.xyz', '国内免费', '中国', 1, 0, 1, '实时', '提供虚拟手机号接收验证码', '["无需注册","支持中文","虚拟号码","实时更新"]', 4),
('sms06', '114接码', 'https://114sim.com', '国内免费', '中国', 1, 0, 1, '实时', '老牌国内免费接码平台', '["无需注册","支持中文","老牌平台","国内号码"]', 5),
('sms07', '免费短信', 'https://mianfeisms.xyz', '国内免费', '中国', 1, 0, 1, '实时', '专注国内手机号免费接码', '["无需注册","支持中文","国内号码","实时更新"]', 6),
('sms08', 'Lothelper', 'https://lothelper.com', '国内免费', '中国、印尼、美国、英国', 1, 0, 0, '7天', '支持中国、印尼、美国、英国等多国号码', '["无需注册","多国号码","7天保留","英文界面"]', 7),
('sms09', '接码号', 'https://jiemahao.com', '国内免费', '中国', 1, 0, 1, '实时', '国内手机号接码，更新频繁', '["无需注册","支持中文","国内号码","更新频繁"]', 8),
('sms10', '云短信', 'https://yunduanxin.net', '国内免费', '中国', 1, 0, 1, '实时', '提供多个国内虚拟号码', '["无需注册","支持中文","虚拟号码","多号码"]', 9),
('sms11', 'Temporary Phone Number', 'https://temporary-phone-number.com', '国外免费', '80+国家', 1, 0, 0, '7天', '支持80+国家号码，界面清爽', '["无需注册","80+国家","7天保留","界面清爽"]', 10),
('sms12', 'Quackr', 'https://quackr.io', '国外免费', '美国、英国、法国等', 1, 0, 0, '实时', '支持美国、英国、法国等，临时号码接码', '["无需注册","临时号码","多国支持","实时更新"]', 11),
('sms13', 'SMS24', 'https://sms24.me', '国外免费', '全球多个国家', 1, 0, 0, '实时', '全球多个国家免费接码', '["无需注册","全球覆盖","免费使用","Cloudflare防护"]', 12),
('sms14', 'Receive SMSS', 'https://receive-smss.com', '国外免费', '全球多个国家', 1, 0, 0, '实时', '提供多国临时号码', '["无需注册","临时号码","多国支持","Cloudflare防护"]', 13),
('sms15', 'SMS to Me', 'https://smstome.com', '国外免费', '美国为主，支持多国', 1, 0, 0, '实时', '美国为主，支持多国', '["无需注册","美国号码","多国支持","实时更新"]', 14),
('sms16', 'Temp Number', 'https://temp-number.com', '国外免费', '全球多个国家', 1, 0, 0, '实时', '临时号码接码平台', '["无需注册","临时号码","多国支持","Cloudflare防护"]', 15),
('sms17', 'Receive SMS Free', 'https://receive-sms-free.cc', '国外免费', '全球多个国家', 1, 0, 0, '实时', '免费接收全球短信', '["无需注册","全球覆盖","免费使用","Cloudflare防护"]', 16),
('sms19', 'OKSMS', 'https://oksms.org', '国外免费', '全球多个国家', 1, 0, 0, '实时', '简洁的临时号码接码', '["无需注册","临时号码","界面简洁","Cloudflare防护"]', 17),
('sms20', 'Receive SMS', 'https://receivesms.org', '国外免费', '全球多个国家', 1, 0, 0, '实时', '全球免费接码平台', '["无需注册","全球覆盖","免费使用","实时更新"]', 18),
('sms21', '5SIM', 'https://5sim.com', '付费服务', '180+国家', 0, 1, 1, '按次计费', '全球最大的付费接码平台，支持180+国家', '["需注册","支持中文","180+国家","全球最大"]', 19),
('sms22', 'Hero SMS', 'https://hero-sms.com', '付费服务', '全球', 0, 1, 0, '按次计费', '专业接码服务，支持各种平台验证', '["需注册","专业服务","全球覆盖","按次计费"]', 20),
('sms23', 'SMS Online', 'https://sms-ol.com', '付费服务', '多个国家', 0, 1, 0, '按次计费', '提供高质量接码服务', '["需注册","高质量","多国支持","按次计费"]', 21),
('sms24', 'Text Verification', 'https://text-verification.net', '付费服务', '多个国家', 0, 1, 0, '按次计费', '专业短信验证码接收服务', '["需注册","专业服务","多国支持","按次计费"]', 22);

-- ── Permission codes: free_game + sms_platform ──
-- Determine next id to avoid clashes
INSERT OR IGNORE INTO permissions (id, code, name, module, action, sort_order)
SELECT (SELECT COALESCE(MAX(id), 100) FROM permissions) + 1, 'free_game:view', '查看免费资源', 'free_game', 'view', (SELECT COALESCE(MAX(sort_order), 100) FROM permissions) + 1
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'free_game:view');
INSERT OR IGNORE INTO permissions (id, code, name, module, action, sort_order)
SELECT (SELECT COALESCE(MAX(id), 100) FROM permissions) + 2, 'free_game:manage', '管理免费资源', 'free_game', 'manage', (SELECT COALESCE(MAX(sort_order), 100) FROM permissions) + 2
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'free_game:manage');
INSERT OR IGNORE INTO permissions (id, code, name, module, action, sort_order)
SELECT (SELECT COALESCE(MAX(id), 100) FROM permissions) + 3, 'sms_platform:view', '查看接码平台', 'sms_platform', 'view', (SELECT COALESCE(MAX(sort_order), 100) FROM permissions) + 3
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'sms_platform:view');
INSERT OR IGNORE INTO permissions (id, code, name, module, action, sort_order)
SELECT (SELECT COALESCE(MAX(id), 100) FROM permissions) + 4, 'sms_platform:manage', '管理接码平台', 'sms_platform', 'manage', (SELECT COALESCE(MAX(sort_order), 100) FROM permissions) + 4
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'sms_platform:manage');

-- ── Grant all four to super_admin ──
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'super_admin' AND p.code IN ('free_game:view', 'free_game:manage', 'sms_platform:view', 'sms_platform:manage');
