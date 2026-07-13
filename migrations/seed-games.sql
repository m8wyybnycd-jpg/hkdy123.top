-- ═══════════════════════════════════════════════════════════
-- P1-4: games 种子数据
-- 共 111 条游戏数据，从 src/data/games.ts 生成
-- ═══════════════════════════════════════════════════════════

DELETE FROM games;

INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'naraka-bladepoint',
  '永劫无间',
  '动作RPG',
  8.6,
  'high',
  '["netease","start"]',
  '高自由度武侠大逃杀，近战格斗手感极佳。多人对战为主，也支持单人闯关。具体支持以各平台官网为准。',
  '近战冷兵器吃鸡独一份，手机端/云电脑低延迟体验更佳',
  '["武侠","大逃杀","多人竞技"]',
  '⚔️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1540900/header.jpg',
  0,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'genshin-impact',
  '原神',
  '动作RPG',
  9.2,
  'mid',
  '["netease","start","haima"]',
  '开放世界冒险 RPG，画风精美，角色养成系统丰富。支持跨平台联机，持续更新新地图和新角色。具体支持以各平台官网为准。',
  '开放世界标杆，云电脑可解决手机端发热和帧率问题',
  '["开放世界","二次元","免费游玩"]',
  '🌟',
  'https://webstatic.mihoyo.com/bh3/upload/officialsites/201908/ys_1565764084_7084.png',
  1,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'dnf',
  '地下城与勇士 DNF',
  '动作RPG',
  8.4,
  'mid',
  '["netease","start","todesk","gelaiyun"]',
  '经典 2D 横版格斗网游，职业丰富，副本玩法多样。运营多年仍有大量活跃玩家。具体支持以各平台官网为准。',
  '老牌格斗网游常青树，云电脑摆脱配置限制轻松刷图',
  '["横版格斗","经典","多人在线"]',
  '🗡️',
  'https://ossweb-img.qq.com/upload/adw/image/23/20260610/1abef860d3a035654fcb940cf131f054.jpeg',
  2,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'wow',
  '魔兽世界',
  '动作RPG',
  8.9,
  'mid',
  '["start"]',
  '史诗级 MMORPG，庞大世界观和丰富副本玩法。团队副本、PvP、采集制造等玩法一应俱全。具体支持以各平台官网为准。',
  'MMORPG 巅峰之作，云电脑随时上线不用装客户端',
  '["MMORPG","经典","团队副本"]',
  '🐺',
  'https://wow.res.netease.com/pc/zt/20240520150521/keep_origin/assets/logo_677fec49.png',
  3,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'jx3',
  '剑网3',
  '动作RPG',
  8.2,
  'mid',
  '["netease"]',
  '国产武侠 MMORPG，轻功系统特色鲜明，社交氛围浓厚。门派众多，PVP/PVE 内容丰富。具体支持以各平台官网为准。',
  '国产武侠 MMORPG 代表，云电脑免安装即玩',
  '["武侠","MMORPG","国产"]',
  '🏯',
  'https://jx3.xoyo.com/assets/img/desc-yanzhi-7610ba24.png',
  4,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'nishuihan',
  '逆水寒',
  '动作RPG',
  8.3,
  'mid',
  '["netease"]',
  '网易旗舰武侠 MMO，画面精良，剧情丰富。会呼吸的江湖，沉浸感强。具体支持以各平台官网为准。',
  '画面顶尖的国产武侠 MMO，云电脑降低硬件门槛',
  '["武侠","MMORPG","高画质"]',
  '❄️',
  'https://n.res.netease.com/images/20250428/1745829616537_9eb9cd58b9.png',
  5,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'identity-v',
  '第五人格',
  '动作RPG',
  8.3,
  'low',
  '["netease"]',
  '非对称对抗竞技游戏，1v4 哥特风格追逐逃生。角色技能各异，地图随机机关丰富。具体支持以各平台官网为准。',
  '非对称竞技标杆，哥特画风紧张刺激',
  '["非对称竞技","哥特","逃生"]',
  '🕵️',
  'https://nie.res.netease.com/r/pic/20240618/5e5e6c6b-bd2f-4c5a-b93f-2c2f6ddb8a70.png',
  6,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'yimeng-jianghu',
  '一梦江湖',
  '动作RPG',
  8.1,
  'mid',
  '["netease"]',
  '网易高自由度武侠 MMORPG，开放江湖世界自由探索。捏脸系统细腻，命格系统影响剧情走向。具体支持以各平台官网为准。',
  '高自由度武侠手游天花板，云电脑画质全开',
  '["武侠","MMORPG","高自由度"]',
  '🏮',
  'https://nie.res.netease.com/r/pic/20240510/8a3d4d9d-3f30-4f8c-8d3e-c6ef9a88be73.png',
  7,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'qiannv-youhun',
  '倩女幽魂',
  '动作RPG',
  8,
  'low',
  '["netease"]',
  '网易经典 MMORPG，倩女幽魂 IP 改编，三界情缘玩法丰富。时装、家园、跨服战等社交玩法俱全。具体支持以各平台官网为准。',
  '经典仙侠 MMORPG，三界情缘社交玩法丰富',
  '["仙侠","MMORPG","社交"]',
  '🦋',
  'https://nie.res.netease.com/r/pic/20240510/qiannv_logo.png',
  8,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'diablo-immortal',
  '暗黑破坏神：不朽',
  '动作RPG',
  7.8,
  'mid',
  '["netease"]',
  '暴雪 × 网易联手打造的暗黑手游，经典地牢刷宝玩法。多人副本、PVP 战场、阵营对抗模式。具体支持以各平台官网为准。',
  '暗黑正统手游续作，刷刷刷的快感随时体验',
  '["暗黑","刷宝","MMORPG"]',
  '😈',
  'https://nie.res.netease.com/r/pic/20240618/diablo_immortal_header.png',
  9,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'moonlight-blade',
  '天涯明月刀',
  '动作RPG',
  8.4,
  'high',
  '["start"]',
  '腾讯旗舰武侠 MMO，电影级画质，天气昼夜系统。捏脸系统精细，身份玩法多样。具体支持以各平台官网为准。',
  '画面最美的国产武侠 MMO，START 高画质畅玩',
  '["武侠","MMORPG","高画质"]',
  '🌙',
  'https://game.gtimg.cn/images/tgame/act/a20250121tymy/game_logo.png',
  10,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'lost-ark',
  '命运方舟',
  '动作RPG',
  8.5,
  'high',
  '["start"]',
  'Smilegate 出品俯视角动作 MMO，爽快战斗 + 丰富副本。军团长副本极具挑战，航海生活玩法多样。具体支持以各平台官网为准。',
  '韩系动作 MMO 巅峰，爽快打击感与军团副本',
  '["MMORPG","俯视角","高画质"]',
  '🚢',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1599340/header.jpg',
  11,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'blade-soul',
  '剑灵',
  '动作RPG',
  8.3,
  'mid',
  '["start"]',
  'NCsoft 出品的东方幻想 MMORPG，动作战斗系统教科书级。捏脸系统精良，轻功跑图丝滑流畅。具体支持以各平台官网为准。',
  '动作 MMO 教科书，轻功飞檐走壁爽快无比',
  '["武侠","MMORPG","东方幻想"]',
  '🗡️',
  'https://game.gtimg.cn/images/bns/act/a20250101bns/bns_logo.png',
  12,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'path-of-exile',
  '流放之路',
  '动作RPG',
  8.8,
  'mid',
  '["start"]',
  'Grinding Gear Games 出品的暗黑类 ARPG，天赋树极其庞大。赛季更新频繁，Build 构筑自由度高。具体支持以各平台官网为准。',
  '暗黑类 ARPG 巅峰，1400+ 天赋点自由构筑',
  '["暗黑","刷宝","硬核"]',
  '💎',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/238960/header.jpg',
  13,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'metal-slug-awakening',
  '合金弹头：觉醒',
  '动作RPG',
  7.8,
  'low',
  '["start"]',
  'SNK 正版授权横版动作射击手游，经典合金弹头重制。多种武器切换、载具驾驶、世界 Boss 挑战。具体支持以各平台官网为准。',
  '童年经典合金弹头重制，横版射击情怀满分',
  '["横版射击","经典","情怀"]',
  '🔧',
  'https://game.gtimg.cn/images/hjdt/act/a20240101msawake/logo.png',
  14,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'monster-hunter-world',
  '怪物猎人：世界',
  '动作RPG',
  9.3,
  'high',
  '["shunwang"]',
  'Capcom 狩猎动作游戏巅峰，无缝大地图生态。14 种武器流派各异，冰原 DLC 内容翻倍。具体支持以各平台官网为准。',
  '共斗狩猎巅峰神作，云电脑高画质畅玩冰原',
  '["共斗","狩猎","开放世界"]',
  '🐉',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/582010/header.jpg',
  15,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'monster-hunter-rise',
  '怪物猎人：崛起',
  '动作RPG',
  8.8,
  'high',
  '["shunwang"]',
  'Capcom 狩猎动作新作，翔虫系统带来立体机动。和风主题，百龙夜行大型塔防玩法。具体支持以各平台官网为准。',
  '翔虫系统革新狩猎体验，高速立体战斗爽快感十足',
  '["共斗","狩猎","和风"]',
  '🦅',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1446780/header.jpg',
  16,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'diablo-4',
  '暗黑破坏神4',
  '动作RPG',
  8.7,
  'high',
  '["shunwang"]',
  '暴雪暗黑系列正统续作，开放世界庇护所探索。五大职业自由构筑，世界 Boss 大型团战。具体支持以各平台官网为准。',
  '暗黑系列涅槃重生，开放世界刷宝体验极佳',
  '["暗黑","开放世界","刷宝"]',
  '💀',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/2344520/header.jpg',
  17,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'diablo-3',
  '暗黑破坏神3',
  '动作RPG',
  8.6,
  'mid',
  '["gelaiyun"]',
  '暴雪经典地牢刷宝 ARPG，冒险模式 + 赛季旅程。七大职业，套装地下城，大秘境挑战。具体支持以各平台官网为准。',
  '暗黑经典刷宝体验，赛季制保持长期可玩性',
  '["暗黑","刷宝","赛季"]',
  '⚡',
  'https://blz-contentstack-images.akamaized.net/v3/assets/blta1f9f7a7b7e0453e/blt3fa2989d5bf1b6e1/64463e29c6f8f042e34d2f00/d3-social-card-enUS.jpg',
  18,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'warframe',
  '星际战甲',
  '动作RPG',
  8.5,
  'mid',
  '["dalong","shunwang"]',
  'Digital Extremes 出品的免费科幻动作射击，战甲系统丰富。跑酷 + 枪械 + 技能三位一体，持续更新。具体支持以各平台官网为准。',
  '免费科幻战甲刷宝，跑酷枪战爽快流畅',
  '["科幻","免费","刷宝"]',
  '🤖',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/230410/header.jpg',
  19,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'nioh-2',
  '仁王2',
  '动作RPG',
  8.7,
  'high',
  '["shunwang"]',
  'Team NINJA 出品的战国暗黑动作 RPG，妖怪化系统独特。残心、流转等核心机制深度十足。具体支持以各平台官网为准。',
  '战国暗黑动作精品，妖怪化 + 残心系统深度耐玩',
  '["战国","暗黑","硬核"]',
  '👹',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1325200/header.jpg',
  20,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'wo-long',
  '卧龙：苍天陨落',
  '动作RPG',
  8.2,
  'high',
  '["shunwang"]',
  'Team NINJA 三国题材暗黑动作游戏，化劲弹反核心战斗。妖魔三国世界观，著名武将登场。具体支持以各平台官网为准。',
  '三国暗黑动作，化劲弹反爽快感十足',
  '["三国","暗黑","硬核"]',
  '🐲',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1448440/header.jpg',
  21,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'dmc5',
  '鬼泣5',
  '动作RPG',
  9.1,
  'high',
  '["shunwang"]',
  'Capcom 王牌动作游戏，三主角切换华丽连招。RE 引擎画面细腻，SSS 评级爽快炸裂。具体支持以各平台官网为准。',
  '动作游戏天花板，华丽连招打出 SSS 爽快炸裂',
  '["动作","华丽","连招"]',
  '😎',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/601150/header.jpg',
  22,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'ghostrunner',
  '幽灵行者',
  '动作RPG',
  8.4,
  'high',
  '["shunwang"]',
  '赛博朋克第一人称跑酷斩杀，一击必杀高速度战斗。霓虹美学 + 电子音乐，跑酷手感极致。具体支持以各平台官网为准。',
  '一刀必杀赛博跑酷，高速斩杀肾上腺素飙升',
  '["赛博朋克","跑酷","硬核"]',
  '🏃',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1139900/header.jpg',
  23,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'honkai-star-rail',
  '崩坏：星穹铁道',
  '动作RPG',
  8.9,
  'mid',
  '["haima"]',
  'HoYoverse 出品的银河冒险回合制 RPG，箱庭探索 + 策略战斗。动画电影级演出，角色塑造精良。具体支持以各平台官网为准。',
  '米哈游银河冒险 RPG，电影级演出和角色魅力',
  '["回合制","银河冒险","二次元"]',
  '🚂',
  'https://webstatic.mihoyo.com/upload/op-public/2023/03/23/2b3d8b6a3d7a9f3c0b3c4e0a7c7e1c7e.png',
  24,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'zenless-zone-zero',
  '绝区零',
  '动作RPG',
  8.5,
  'mid',
  '["haima"]',
  'HoYoverse 都市幻想动作 RPG，潮酷美术风格。三人小队高速战斗，Roguelike 空洞探索。具体支持以各平台官网为准。',
  '潮酷都市动作 RPG，高速切换连招华丽流畅',
  '["动作","都市幻想","二次元"]',
  '🎵',
  'https://webstatic.mihoyo.com/upload/op-public/2024/06/28/zzz_banner_pc.png',
  25,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'wuthering-waves',
  '鸣潮',
  '动作RPG',
  8.2,
  'mid',
  '["haima"]',
  'Kuro Games 出品的开放世界动作 RPG，高速战斗 + 跑酷探索。声骸系统收集养成，末世幻想世界观。具体支持以各平台官网为准。',
  '开放世界高速动作，声骸收集乐趣十足',
  '["开放世界","动作","末世"]',
  '🌊',
  'https://cdn.wutheringwaves.com/official/pc/static/media/banner_pc.8dc9c9d4.png',
  26,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'tlbb-mobile',
  '天龙八部手游',
  '动作RPG',
  7.8,
  'low',
  '["hongshouzhi"]',
  '金庸正版授权 MMORPG，经典门派对战还原。帮会战、宋辽大战等多人玩法，社交氛围浓厚。具体支持以各平台官网为准。',
  '天龙八部正版手游，挂机升级轻松畅玩江湖',
  '["武侠","MMORPG","挂机"]',
  '📜',
  'https://game.gtimg.cn/images/tlbb/act/a20240101tlbb/logo.png',
  27,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'lol',
  '英雄联盟',
  'MOBA',
  9,
  'low',
  '["start","todesk","gelaiyun"]',
  '全球最火的 5v5 MOBA 竞技游戏，英雄超过 160 个。排位赛、大乱斗、云顶之弈等多种模式。具体支持以各平台官网为准。',
  'MOBA 霸主，START 上免费畅玩无需高配电脑',
  '["5v5","竞技","免费游玩"]',
  '🏆',
  'https://img.crawler.qq.com/lolwebschool/0/JAutoCMS_LOLWeb_eb131db7beeab9a7cc58d4d28d1e1a36/0',
  28,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'hok-pc',
  '王者荣耀 电脑版',
  'MOBA',
  8.8,
  'low',
  '["start","haima"]',
  '国民级 MOBA 手游的电脑版，5v5 实时对战。英雄丰富，节奏快，上手容易精通难。具体支持以各平台官网为准。',
  '国民手游上大屏，START 云端直接开玩',
  '["5v5","手游移植","免费游玩"]',
  '👑',
  'https://shp.qpic.cn/ishow/2735070316/1783066654_829394697_27156_sProdImgNo_3.jpg/0',
  29,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'onmyoji-arena',
  '决战！平安京',
  'MOBA',
  8.2,
  'low',
  '["netease"]',
  '网易阴阳师 IP 的 MOBA 手游，和风美术精良。无铭文系统公平竞技，式神技能设计独具特色。具体支持以各平台官网为准。',
  '和风公平 MOBA，无铭文系统纯靠技术',
  '["5v5","和风","公平竞技"]',
  '🎴',
  'https://nie.res.netease.com/r/pic/20240510/onmyoji_arena_logo.png',
  30,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'dota2',
  'DOTA2',
  'MOBA',
  9.2,
  'mid',
  '["shunwang","dalong"]',
  'Valve 出品 MOBA 鼻祖续作，英雄超过 120 个。深度策略博弈，反补、拉野、TP 机制丰富。具体支持以各平台官网为准。',
  'MOBA 深度标杆，策略博弈无与伦比',
  '["5v5","竞技","硬核"]',
  '🔥',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg',
  31,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'smite',
  '神之浩劫',
  'MOBA',
  8,
  'mid',
  '["gelaiyun"]',
  '第三人称视角 MOBA，神话众神大乱斗。WASD 移动 + 技能瞄准，TPS 视角代入感强。具体支持以各平台官网为准。',
  '第三人称 MOBA 独特体验，神话众神乱斗',
  '["5v5","神话","第三人称"]',
  '⚡',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/386360/header.jpg',
  32,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'peacekeeper-pc',
  '和平精英 电脑版',
  'FPS射击',
  8.5,
  'mid',
  '["start","haima"]',
  '战术竞技射击游戏电脑版，100 人跳伞吃鸡。载具、武器丰富，团队配合至关重要。具体支持以各平台官网为准。',
  '吃鸡手游上电脑大屏，操作更精准',
  '["吃鸡","战术竞技","多人"]',
  '🔫',
  'https://game.gtimg.cn/images/gp/web202411/new0626/g1.jpeg',
  33,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'cs2',
  'CS2 反恐精英2',
  'FPS射击',
  9.1,
  'mid',
  '["shunwang","dalong","todesk"]',
  'Valve 旗下经典竞技 FPS 的全新升级，Source 2 引擎重制。5v5 竞技、休闲、军备竞赛等模式。具体支持以各平台官网为准。',
  'FPS 竞技标杆，顺网/达龙低延迟体验最佳',
  '["5v5","竞技","经典"]',
  '🎯',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
  34,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'pubg',
  '绝地求生 PUBG',
  'FPS射击',
  8.3,
  'mid',
  '["shunwang","start"]',
  '战术竞技型射击游戏，100 人跳伞搜集物资生存到最后。大逃杀玩法的开创者之一。具体支持以各平台官网为准。',
  '大逃杀经典之作，云电脑免去百 G 安装包',
  '["大逃杀","吃鸡","多人"]',
  '🪂',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg',
  35,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'overwatch',
  '守望先锋',
  'FPS射击',
  8.2,
  'mid',
  '["start","todesk","gelaiyun"]',
  '暴雪团队英雄射击游戏，每个英雄有独特技能和定位。5v5 推车、占领等多种模式。具体支持以各平台官网为准。',
  '英雄射击团队配合，START 上免费畅玩',
  '["英雄射击","5v5","团队"]',
  '🛡️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg',
  36,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'knives-out',
  '荒野行动',
  'FPS射击',
  8,
  'low',
  '["netease"]',
  '网易战术竞技手游，100 人跳伞大逃杀。日服火爆，联动 IP 丰富，载具武器多样。具体支持以各平台官网为准。',
  '网易吃鸡手游代表，日服拥有超高人气',
  '["吃鸡","战术竞技","多人"]',
  '🏝️',
  'https://nie.res.netease.com/r/pic/20240510/knives_out_logo.png',
  37,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'crossfire',
  '穿越火线 CF',
  'FPS射击',
  8.1,
  'low',
  '["start","gelaiyun"]',
  '腾讯经典 FPS 网游，枪械手感流畅，模式多样。生化模式、团队竞技、爆破等经典玩法。具体支持以各平台官网为准。',
  '国民 FPS 经典之作，模式丰富上手简单',
  '["FPS","经典","多人在线"]',
  '💥',
  'https://game.gtimg.cn/images/cf/cp/a20241030cfoverview/logo.png',
  38,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'valorant',
  '无畏契约',
  'FPS射击',
  8.9,
  'mid',
  '["start","shunwang"]',
  'Riot Games 出品 5v5 战术射击，英雄技能 + 枪法结合。精准弹道、经济系统、排名竞技。具体支持以各平台官网为准。',
  '战术射击新标杆，英雄技能 + 枪法双重博弈',
  '["5v5","战术射击","竞技"]',
  '🎮',
  'https://img-cdn.riotgames.com/images/valorant/valorant-offwhitelaunch-keyart.jpg',
  39,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'delta-force',
  '三角洲行动',
  'FPS射击',
  8,
  'mid',
  '["start"]',
  '腾讯天美出品战术射击，经典三角洲 IP 重启。撤离 + 大型战场双模式，武器改造系统丰富。具体支持以各平台官网为准。',
  '三角洲经典重启，撤离玩法紧张刺激',
  '["战术射击","撤离","军事"]',
  '🎖️',
  'https://game.gtimg.cn/images/dfm/act/a20240901dfm/logo.png',
  40,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'apex-legends',
  'APEX英雄',
  'FPS射击',
  8.8,
  'mid',
  '["shunwang","dalong"]',
  'Respawn 出品免费战术竞技 FPS，英雄技能 + 快节奏枪战。标记系统革新团队沟通，枪感一流。具体支持以各平台官网为准。',
  '快节奏英雄吃鸡，枪感顶级沟通系统行业标杆',
  '["吃鸡","英雄射击","免费"]',
  '🦾',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg',
  41,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'helldivers-2',
  '地狱潜者2',
  'FPS射击',
  8.6,
  'high',
  '["shunwang"]',
  'Arrowhead 出品第三人称合作射击，银河保卫战。空袭呼叫 + 友军伤害，四人小队欢乐混乱。具体支持以各平台官网为准。',
  '合作射击现象级爆款，呼叫空袭队友互坑欢乐',
  '["合作","第三人称","科幻"]',
  '🪖',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/553850/header.jpg',
  42,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'destiny-2',
  '命运2',
  'FPS射击',
  8.5,
  'high',
  '["shunwang"]',
  'Bungie 出品的科幻 MMOFPS，枪械手感行业顶尖。突袭副本、熔炉竞技场、智谋多种玩法。具体支持以各平台官网为准。',
  '科幻枪战 MMO 标杆，枪感无敌突袭副本震撼',
  '["MMOFPS","科幻","刷宝"]',
  '🛸',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1085660/header.jpg',
  43,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'rainbow-six-siege',
  '彩虹六号：围攻',
  'FPS射击',
  8.7,
  'mid',
  '["dalong","shunwang"]',
  'Ubisoft 出品 5v5 战术室内 CQB 射击，破坏系统独树一帜。干员技能丰富多样，战术配合至上。具体支持以各平台官网为准。',
  '战术 CQB 巅峰，拆迁墙体破坏系统独此一家',
  '["5v5","战术射击","破坏"]',
  '🏚️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/359550/header.jpg',
  44,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'escape-from-tarkov',
  '逃离塔科夫',
  'FPS射击',
  8.6,
  'high',
  '["dalong"]',
  'Battlestate 出品硬核军事撤离 FPS，高度拟真枪械改装。捡垃圾撤离模式，死了全没的刺激感。具体支持以各平台官网为准。',
  '最硬核军事FPS，枪械改装系统无人能及',
  '["撤离","硬核","军事"]',
  '🎒',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1731530/header.jpg',
  45,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'left-4-dead-2',
  '求生之路2',
  'FPS射击',
  9,
  'low',
  '["shunwang","dalong"]',
  'Valve 经典四人合作打僵尸 FPS，AI 导演系统动态调整。Mod 社区活跃，地图和玩法无限扩展。具体支持以各平台官网为准。',
  '合作打僵尸鼻祖，Mod 社区让乐趣无限延伸',
  '["合作","僵尸","经典"]',
  '🧟',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/550/header.jpg',
  46,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'war-thunder',
  '战争雷霆',
  'FPS射击',
  8.2,
  'mid',
  '["shunwang"]',
  'Gaijin 出品海陆空三栖军事载具射击，真实物理损伤模型。飞机、坦克、舰船全收录，技术树庞大。具体支持以各平台官网为准。',
  '海陆空全方位军事载具，真实损伤模型沉浸感强',
  '["载具","军事","海陆空"]',
  '✈️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/236390/header.jpg',
  47,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'remnant-2',
  '遗迹2',
  'FPS射击',
  8.3,
  'high',
  '["shunwang"]',
  'Gunfire Games 出品第三人称射击 + 魂系，随机生成关卡。多职业搭配，Boss 设计精妙，可重复游玩性高。具体支持以各平台官网为准。',
  '枪版黑魂，随机生成关卡每次都有新体验',
  '["魂系","第三人称","随机"]',
  '🔮',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1282100/header.jpg',
  48,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'cyberpunk-2077',
  '赛博朋克2077',
  '3A大作',
  8.7,
  'high',
  '["shunwang","dalong"]',
  'CD Projekt RED 出品的开放世界动作 RPG，夜之城赛博朋克设定。画面惊艳，剧情丰富，自由度极高。具体支持以各平台官网为准。',
  '画面炸裂的 3A 开放世界，云电脑免高配显卡',
  '["开放世界","赛博朋克","剧情"]',
  '🌃',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
  49,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'elden-ring',
  '艾尔登法环',
  '3A大作',
  9.5,
  'high',
  '["shunwang"]',
  '宫崎英高 × 乔治·R·R·马丁联手打造，开放世界魂系动作 RPG。交界地探索、Boss 战、多结局。具体支持以各平台官网为准。',
  '年度最佳，魂系开放世界巅峰，云电脑畅玩高画质',
  '["开放世界","魂系","高难度"]',
  '🗡️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
  50,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'rdr2',
  '荒野大镖客2',
  '3A大作',
  9.4,
  'high',
  '["shunwang"]',
  'Rockstar 出品的开放世界西部冒险，画面极致写实。亚瑟·摩根的传奇故事，沉浸感无与伦比。具体支持以各平台官网为准。',
  'Rockvar 开放世界巅峰，画面顶级体验感拉满',
  '["开放世界","西部","剧情"]',
  '🤠',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
  51,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'gta5',
  'GTA5 侠盗猎车手5',
  '3A大作',
  9.3,
  'high',
  '["shunwang"]',
  'Rockstar 经典开放世界犯罪游戏，洛圣都三主角切换。主线剧情 + GTA Online 持续更新。具体支持以各平台官网为准。',
  '经久不衰的开放世界神作，云电脑随时上线洛圣都',
  '["开放世界","犯罪","多人在线"]',
  '🚗',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
  52,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'black-myth-wukong',
  '黑神话：悟空',
  '3A大作',
  9,
  'high',
  '["shunwang","dalong"]',
  '国产首个 3A 级动作 RPG，以西游记为背景。画面顶级，Boss 战设计精妙，法术变身系统丰富。具体支持以各平台官网为准。',
  '国产 3A 之光，云电脑免去高配显卡门槛',
  '["国产3A","动作","西游记"]',
  '🐒',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/2358720/header.jpg',
  53,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'baldurs-gate-3',
  '博德之门3',
  '3A大作',
  9.4,
  'high',
  '["shunwang"]',
  'Larian Studios 出品的 CRPG 巅峰之作，D&D 规则，超高自由度。分支剧情极其丰富，多人合作支持。具体支持以各平台官网为准。',
  'CRPG 年度最佳，超高自由度选择，云电脑畅玩',
  '["CRPG","D&D","剧情"]',
  '🐉',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg',
  54,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'nfs-unbound',
  '极品飞车：不羁',
  '3A大作',
  8,
  'high',
  '["shunwang"]',
  'Need for Speed 系列新作，涂鸦风格 + 真实赛车。街头竞速、警匪追逐，改装系统丰富。具体支持以各平台官网为准。',
  '经典赛车系列新作，涂鸦风 + 极速漂移',
  '["竞速","改装","街头"]',
  '🏎️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1846380/header.jpg',
  55,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'sekiro',
  '只狼：影逝二度',
  '3A大作',
  9.2,
  'high',
  '["shunwang"]',
  'FromSoftware 出品的忍者动作游戏，架刀弹反系统独树一帜。战国背景，Boss 战极具挑战性。具体支持以各平台官网为准。',
  '弹反爽快感拉满，硬核动作巅峰之作',
  '["动作","忍者","高难度"]',
  '🥷',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/814380/header.jpg',
  56,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'witcher-3',
  '巫师3：狂猎',
  '3A大作',
  9.4,
  'high',
  '["shunwang"]',
  'CD Projekt RED 奇幻 RPG 巅峰，猎魔人杰洛特的传奇终章。支线任务质量极高，两个 DLC 体量如正作。具体支持以各平台官网为准。',
  '奇幻 RPG 巅峰，支线质量无人能及',
  '["奇幻","RPG","剧情"]',
  '🐺',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg',
  57,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'ac-valhalla',
  '刺客信条：英灵殿',
  '3A大作',
  8.3,
  'high',
  '["shunwang"]',
  'Ubisoft 维京题材开放世界动作 RPG，劫掠 + 定居点建设。挪威到英格兰史诗旅程，双持武器自由搭配。具体支持以各平台官网为准。',
  '维京史诗开放世界，劫掠战斗爽快恢弘',
  '["开放世界","维京","历史"]',
  '🪓',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/2208920/header.jpg',
  58,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'death-stranding',
  '死亡搁浅',
  '3A大作',
  8.8,
  'high',
  '["shunwang"]',
  '小岛秀夫出品，末日快递模拟 + 社会链接理念。弩哥主演，画面艺术感强，异步联机系统独特。具体支持以各平台官网为准。',
  '小岛秀夫艺术之作，送快递也能如此感动',
  '["末世","剧情","独特"]',
  '📦',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1850570/header.jpg',
  59,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  're4-remake',
  '生化危机4 重制版',
  '3A大作',
  9.1,
  'high',
  '["shunwang"]',
  'Capcom 经典生存恐怖重制，RE 引擎画面飞跃。越肩视角 + 体术 combo，关卡设计教科书级。具体支持以各平台官网为准。',
  '生存恐怖标杆重制，体术回旋踢爽到飞起',
  '["生存恐怖","重制","动作"]',
  '🧟',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/2050650/header.jpg',
  60,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'hogwarts-legacy',
  '霍格沃茨之遗',
  '3A大作',
  8.8,
  'high',
  '["shunwang"]',
  '哈利波特魔法世界开放世界 RPG，霍格沃茨城堡自由探索。咒语战斗、神奇动物、飞天扫帚翱翔。具体支持以各平台官网为准。',
  '哈利波特粉丝圆梦之作，漫步霍格沃茨沉浸感满分',
  '["魔法","开放世界","哈利波特"]',
  '🧙',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg',
  61,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'ff7-remake',
  '最终幻想7 重制版',
  '3A大作',
  9,
  'high',
  '["shunwang"]',
  'Square Enix 经典 JRPG 全面重制，米德加故事重新演绎。ATB + 动作混合战斗，角色塑造深入人心。具体支持以各平台官网为准。',
  'JRPG 经典重制巅峰，蒂法克劳德情怀拉满',
  '["JRPG","重制","剧情"]',
  '⚔️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1462040/header.jpg',
  62,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'ghost-of-tsushima',
  '对马岛之魂',
  '3A大作',
  9.1,
  'high',
  '["shunwang"]',
  'Sucker Punch 出品武士开放世界，黑泽明模式致敬经典。风引导航、对峙斩杀，战斗美学极致。具体支持以各平台官网为准。',
  '武士美学巅峰，风引导航对峙斩杀意境拉满',
  '["武士","开放世界","美学"]',
  '🎋',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/2215430/header.jpg',
  63,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'god-of-war',
  '战神',
  '3A大作',
  9.4,
  'high',
  '["shunwang"]',
  'Santa Monica 北欧重启之作，一镜到底电影化叙事。利维坦之斧手感厚重，父子羁绊感人至深。具体支持以各平台官网为准。',
  '一镜到底神话史诗，利维坦之斧手感拉满',
  '["神话","动作","剧情"]',
  '🪓',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1593500/header.jpg',
  64,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'lies-of-p',
  '匹诺曹的谎言',
  '3A大作',
  8.5,
  'high',
  '["shunwang"]',
  '韩国 Neowiz 出品魂系动作 RPG，暗黑匹诺曹改编。武器组合系统独特，维多利亚风格美学惊艳。具体支持以各平台官网为准。',
  '最强类魂新秀，武器刃柄自由组合创意十足',
  '["魂系","暗黑童话","动作"]',
  '🤥',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1627720/header.jpg',
  65,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'armored-core-6',
  '装甲核心6',
  '3A大作',
  8.4,
  'high',
  '["shunwang"]',
  'FromSoftware 机甲动作回归，高速立体机甲战斗。自定义机甲组装深度极高，Boss 战规模宏大。具体支持以各平台官网为准。',
  '机甲定制深度无敌，高速立体战爽快炸裂',
  '["机甲","动作","定制"]',
  '🤖',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1888160/header.jpg',
  66,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'dying-light-2',
  '消逝的光芒2',
  '3A大作',
  8.2,
  'high',
  '["shunwang"]',
  'Techland 出品开放世界跑酷僵尸生存，夜间追逐紧张刺激。跑酷系统流畅，选择影响城市命运。具体支持以各平台官网为准。',
  '跑酷打僵尸爽快流畅，昼夜交替机制紧张刺激',
  '["跑酷","僵尸","开放世界"]',
  '🧗',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/534380/header.jpg',
  67,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'civ6',
  '文明6',
  '策略',
  8.8,
  'mid',
  '["shunwang"]',
  '经典 4X 回合制策略游戏，从远古到信息时代发展文明。科技树、文化树、外交、军事全面发展。具体支持以各平台官网为准。',
  '再来一回合！4X 策略经典，云电脑随时开局',
  '["4X","回合制","文明"]',
  '🏛️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/289070/header.jpg',
  68,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'aoe4',
  '帝国时代4',
  '策略',
  8.2,
  'mid',
  '["shunwang"]',
  '经典 RTS 系列新作，8 个文明各具特色。剧情战役 + 多人对战，实时策略玩法经典。具体支持以各平台官网为准。',
  'RTS 经典回归，云电脑对局不卡顿',
  '["RTS","即时战略","历史"]',
  '🏰',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1466860/header.jpg',
  69,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'three-kingdoms',
  '全面战争：三国',
  '策略',
  8.7,
  'mid',
  '["shunwang"]',
  'Creative Assembly 出品，三国题材全面战争。内政外交 + 即时战场，演绎三国争霸。具体支持以各平台官网为准。',
  '三国迷必玩，大场面即时战场策略',
  '["三国","全面战争","即时战术"]',
  '⚔️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/779340/header.jpg',
  70,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'ratet-earth',
  '率土之滨',
  '策略',
  8.3,
  'low',
  '["netease","hongshouzhi"]',
  '网易三国 SLG 策略手游，真实地形 + 万人同图。赛季制同盟对抗，谋略博弈深度高。具体支持以各平台官网为准。',
  '三国 SLG 标杆，万人地图策略博弈酣畅淋漓',
  '["三国","SLG","赛季制"]',
  '🗺️',
  'https://nie.res.netease.com/r/pic/20240510/ratet_earth_logo.png',
  71,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'ash-echoes',
  '白荆回廊',
  '策略',
  8.1,
  'mid',
  '["start"]',
  '腾讯烛龙出品多维度策略 RPG，天地同调战斗系统。异世交汇世界观，角色养成深度丰富。具体支持以各平台官网为准。',
  '多维策略 RPG 创新之作，天地同调战斗独具特色',
  '["RPG","策略","二次元"]',
  '🔮',
  'https://game.gtimg.cn/images/bjhx/act/a20240101bjhx/logo.png',
  72,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'starcraft-2',
  '星际争霸2',
  '策略',
  9.2,
  'low',
  '["gelaiyun"]',
  '暴雪传奇 RTS，三大种族平衡性极佳。天梯竞技 + 合作任务指挥官模式，运营深度业界顶尖。具体支持以各平台官网为准。',
  'RTS 竞技巅峰，三大种族运营博弈无与伦比',
  '["RTS","科幻","竞技"]',
  '👾',
  'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c8ec/blt4c30faa9e72f1f1c/64463e1c5f1b4950c6e3c9a5/sc2-social-card.jpg',
  73,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'frostpunk-2',
  '冰汽时代2',
  '策略',
  8.5,
  'mid',
  '["shunwang"]',
  '11 bit studios 出品末世城市生存策略，议会政治系统加入。冰汽末世中平衡生存与人性，抉择令人深思。具体支持以各平台官网为准。',
  '末世生存策略续作，议会政治让人性抉择更深刻',
  '["末世","城市建设","生存"]',
  '❄️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1601580/header.jpg',
  74,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'xcom2',
  '幽浮2',
  '策略',
  8.8,
  'mid',
  '["shunwang"]',
  'Firaxis 出品回合制战术策略，反抗外星人统治。士兵永久死亡机制，掩体战术博弈紧张刺激。具体支持以各平台官网为准。',
  '回合制战术标杆，士兵阵亡永久损失考验决策',
  '["回合制","战术","科幻"]',
  '👽',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/268500/header.jpg',
  75,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'stellaris',
  '群星',
  '策略',
  8.9,
  'mid',
  '["shunwang"]',
  'Paradox 出品太空 4X 大战略，探索银河系无限可能。文明定制深度极高，事件链叙述精彩。具体支持以各平台官网为准。',
  '太空 4X 大战略巅峰，文明定制创造无限可能',
  '["4X","太空","大战略"]',
  '🌌',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/281990/header.jpg',
  76,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'fantasy-westward',
  '梦幻西游',
  '休闲',
  8,
  'low',
  '["netease"]',
  '网易经典回合制 MMORPG，Q 版画风，社交玩法丰富。跑商、抓鬼、比武等多种休闲玩法。具体支持以各平台官网为准。',
  '国民级回合制网游，云电脑低配也能流畅运行',
  '["回合制","Q版","经典"]',
  '🐱',
  'https://nie.res.netease.com/r/pic/20260603/fb299637-9a04-443b-9782-a900734e4083.png',
  77,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'minecraft',
  '我的世界',
  '休闲',
  9,
  'low',
  '["netease","shunwang","dalong","todesk"]',
  '全球销量最高的沙盒游戏，无限创造与生存。红石电路、模组、多人服务器，玩法无限。具体支持以各平台官网为准。',
  '沙盒之王，低配友好，多平台云端可玩',
  '["沙盒","创造","生存"]',
  '⛏️',
  'https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/logos/Homepage_Gameplay-Trailer_MC-OV-logo_300x300.png',
  78,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'overcooked2',
  '胡闹厨房2',
  '休闲',
  8.4,
  'low',
  '["shunwang","dalong"]',
  '多人合作烹饪模拟游戏，混乱又欢乐。支持本地/在线联机，考验团队默契。具体支持以各平台官网为准。',
  '聚会神器，欢乐合作烹饪，朋友一起玩最开心',
  '["合作","聚会","欢乐"]',
  '🍳',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/724810/header.jpg',
  79,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'egg-party',
  '蛋仔派对',
  '休闲',
  8.4,
  'low',
  '["netease","haima"]',
  '网易潮玩派对手游，Q 萌蛋仔闯关竞技。UGC 编辑器自创关卡，派对模式欢乐无限。具体支持以各平台官网为准。',
  '派对游戏现象级爆款，蛋仔闯关老少皆宜',
  '["派对","闯关","UGC"]',
  '🥚',
  'https://nie.res.netease.com/r/pic/20240618/egg_party_header.png',
  80,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'minecraft-cn',
  '我的世界 中国版',
  '休闲',
  8.5,
  'low',
  '["netease"]',
  '我的世界中国版，国内服务器低延迟联机。组件中心海量模组地图，花雨庭等小游戏丰富。具体支持以各平台官网为准。',
  '我的世界国服版，组件中心海量模组一键安装',
  '["沙盒","创造","国服"]',
  '🧱',
  'https://nie.res.netease.com/r/pic/20240510/minecraft_cn_logo.png',
  81,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'fantasy-westward-mobile',
  '梦幻西游手游',
  '休闲',
  8.1,
  'low',
  '["hongshouzhi","netease"]',
  '梦幻西游官方手游版，经典回合制社交玩法。帮派、结婚、养育系统完善，情怀与玩法兼得。具体支持以各平台官网为准。',
  '梦幻情怀手游，挂机升经验自动跑环更轻松',
  '["回合制","挂机","情怀"]',
  '🐒',
  'https://nie.res.netease.com/r/pic/20240510/fantasy_westward_mobile_logo.png',
  82,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'westward-journey-mobile',
  '大话西游手游',
  '休闲',
  7.9,
  'low',
  '["hongshouzhi","netease"]',
  '大话西游经典 IP 手游版，回合制 + 社交。转生系统、召唤兽培养、帮战玩法丰富。具体支持以各平台官网为准。',
  '大话西游情怀手游，自动挂机任务解放双手',
  '["回合制","挂机","情怀"]',
  '🐵',
  'https://nie.res.netease.com/r/pic/20240510/westward_journey_mobile_logo.png',
  83,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'wendao-mobile',
  '问道手游',
  '休闲',
  7.8,
  'low',
  '["hongshouzhi"]',
  '经典问道回合制手游，五行门派各具特色。宠物捕捉、装备打造、道行修炼等玩法经典。具体支持以各平台官网为准。',
  '问道经典手游化，五行门派挂机修炼道行',
  '["回合制","仙侠","挂机"]',
  '☯️',
  'https://wd.leiting.com/favicon.ico',
  84,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'yinian-xiaoyao',
  '一念逍遥',
  '休闲',
  7.7,
  'low',
  '["hongshouzhi"]',
  '雷霆游戏出品修仙放置手游，水墨国风美术。自动修炼 + 渡劫飞升，挂机也能不断提升境界。具体支持以各平台官网为准。',
  '修仙放置精品，水墨国风挂机飞升轻松愉悦',
  '["修仙","放置","水墨"]',
  '🧘',
  'https://web.gulugame.cn/official/logo.png',
  85,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'dont-starve',
  '饥荒',
  '独立',
  8.6,
  'low',
  '["shunwang","dalong"]',
  'Klei 出品的生存冒险游戏，哥特画风，硬核生存。搜集资源、建造基地、对抗暗影生物。具体支持以各平台官网为准。',
  '硬核生存 + 哥特美学，低配可玩体验极佳',
  '["生存","哥特","硬核"]',
  '🔥',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/219740/header.jpg',
  86,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'terraria',
  '泰拉瑞亚',
  '独立',
  9,
  'low',
  '["caiji","shunwang"]',
  'Re-Logic 出品 2D 沙盒冒险，像素版我的世界 + 恶魔城。Boss 数量惊人，装备体系庞大，探索趣味无穷。具体支持以各平台官网为准。',
  '2D 沙盒神作，Boss 战 + 探索 + 建造三位一体',
  '["沙盒","像素","冒险"]',
  '⛏️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/105600/header.jpg',
  87,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'hollow-knight',
  '空洞骑士',
  '独立',
  9.2,
  'low',
  '["caiji","shunwang"]',
  'Team Cherry 出品手绘风银河城，庞大地下王国探索。Boss 战设计精妙，氛围音乐一流。具体支持以各平台官网为准。',
  '银河城独立神作，手绘美术 + 精妙 Boss 战',
  '["银河城","手绘","硬核"]',
  '🪲',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/367520/header.jpg',
  88,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'dead-cells',
  '死亡细胞',
  '独立',
  8.8,
  'low',
  '["caiji","shunwang"]',
  'Motion Twin 出品 RogueVania 动作游戏，像素风高速战斗。随机生成 + 永久升级，每次死亡都更强。具体支持以各平台官网为准。',
  'RogueVania 动作标杆，高速战斗爽快感拉满',
  '["Roguelike","像素","动作"]',
  '💀',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/588650/header.jpg',
  89,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'binding-of-isaac',
  '以撒的结合',
  '独立',
  8.9,
  'low',
  '["caiji","shunwang"]',
  'Edmund McMillen 出品 Roguelike 双摇杆射击，道具组合千变万化。暗黑宗教主题，重玩性极高。具体支持以各平台官网为准。',
  'Roguelike 经典之作，道具组合千变万化重玩性极高',
  '["Roguelike","双摇杆","暗黑"]',
  '😢',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/250900/header.jpg',
  90,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'hades',
  '哈迪斯',
  '独立',
  9.3,
  'low',
  '["shunwang"]',
  'Supergiant 出品 Roguelike 动作，希腊神话冥界逃亡。叙事与死亡循环完美结合，配音和美术顶级。具体支持以各平台官网为准。',
  'Roguelike 叙事巅峰，每次死亡都有新对话',
  '["Roguelike","希腊神话","动作"]',
  '🔥',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1145350/header.jpg',
  91,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'phasmophobia',
  '恐鬼症',
  '独立',
  8.5,
  'low',
  '["shunwang","dalong"]',
  'Kinetic Games 出品四人合作捉鬼，语音识别 + 真实恐怖。使用专业设备鉴定鬼魂类型，氛围感极强。具体支持以各平台官网为准。',
  '合作捉鬼沉浸感满分，语音识别让鬼能听到你',
  '["恐怖","合作","语音识别"]',
  '👻',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/739630/header.jpg',
  92,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'stardew-valley',
  '星露谷物语',
  '模拟经营',
  9.1,
  'low',
  '["shunwang","dalong"]',
  '像素风农场模拟经营 RPG，种地、钓鱼、挖矿、社交。四季变换，节日丰富，多人联机。具体支持以各平台官网为准。',
  '种田游戏天花板，低配畅玩，治愈减压',
  '["种田","像素","治愈"]',
  '🌾',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/413150/header.jpg',
  93,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'fifa-online-4',
  'FIFA Online 4',
  '模拟经营',
  7.8,
  'mid',
  '["start"]',
  'EA Sports 足球网游，真实球员数据和联赛授权。UT 模式组建梦之队，排位赛季竞争激烈。具体支持以各平台官网为准。',
  '真实足球模拟，UT 模式组建梦之队竞技',
  '["体育","足球","竞技"]',
  '⚽',
  'https://game.gtimg.cn/images/fo4/act/a20240101fo4/logo.png',
  94,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'street-fighter-6',
  '街头霸王6',
  '格斗',
  8.5,
  'mid',
  '["shunwang","dalong"]',
  'Capcom 经典格斗游戏新作，Drive 系统革新。现代操控模式降低门槛，World Tour 单人模式丰富。具体支持以各平台官网为准。',
  '格斗游戏鼻祖新作，云电脑低延迟对战更爽',
  '["格斗","对战","经典"]',
  '🥊',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1364780/header.jpg',
  95,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'naruto-mobile',
  '火影忍者手游',
  '格斗',
  8,
  'low',
  '["start"]',
  '腾讯正版火影格斗手游，原作角色和忍术完美还原。忍术对战 + 剧情关卡，打击感流畅。具体支持以各平台官网为准。',
  '火影正版格斗，忍术对决还原度高',
  '["格斗","火影","二次元"]',
  '🍥',
  'https://game.gtimg.cn/images/hyrz/act/a20240101hyrz/logo.png',
  96,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'tekken-8',
  '铁拳8',
  '格斗',
  8.6,
  'high',
  '["shunwang"]',
  'Bandai Namco 出品 3D 格斗新作，Heat 系统革新进攻。Unreal Engine 5 高画质，角色多达 32+位。具体支持以各平台官网为准。',
  '3D 格斗王者新作，Heat 系统让进攻更凶猛',
  '["格斗","3D","竞技"]',
  '👊',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1778820/header.jpg',
  97,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'dragon-ball-sparking-zero',
  '龙珠 电光炸裂！ZERO',
  '格斗',
  8.7,
  'high',
  '["shunwang"]',
  '龙珠电光系列正统续作，高速空中 3D 格斗。经典角色海量收录，破坏场景自由飞行对战。具体支持以各平台官网为准。',
  '龙珠格斗系列回归，高速空战对波燃爆情怀',
  '["格斗","龙珠","动漫"]',
  '🐉',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/2721670/header.jpg',
  98,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'lifeafter',
  '明日之后',
  '生存',
  7.9,
  'mid',
  '["netease"]',
  '网易末日生存手游，丧尸世界中的营地建设与对抗。采集、建造、战斗三位一体，社交合作或对抗。具体支持以各平台官网为准。',
  '末日生存手游代表，营地建设对抗沉浸感强',
  '["末世","生存","营地"]',
  '🧟',
  'https://nie.res.netease.com/r/pic/20240510/lifeafter_logo.png',
  99,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'palworld',
  '幻兽帕鲁',
  '生存',
  8.5,
  'mid',
  '["shunwang"]',
  'Pocketpair 出品开放世界生存 + 宠物收集，帕鲁打工自动化。建造基地、抓捕帕鲁、探索世界无缝结合。具体支持以各平台官网为准。',
  '缝合怪神作，帕鲁帮你打工建基地乐趣无穷',
  '["生存","宠物收集","建造"]',
  '🦙',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1623730/header.jpg',
  100,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'ark-survival',
  '方舟：生存进化',
  '生存',
  8.2,
  'high',
  '["dalong","shunwang"]',
  'Studio Wildcard 出品恐龙生存沙盒，驯服恐龙建造基地。原始科技 + 科幻结合，恐龙驯服养成系统丰富。具体支持以各平台官网为准。',
  '骑恐龙建基地！恐龙驯服养成乐趣无与伦比',
  '["恐龙","生存","建造"]',
  '🦖',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/346110/header.jpg',
  101,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'rust',
  '腐蚀 RUST',
  '生存',
  8.3,
  'high',
  '["dalong","shunwang"]',
  'Facepunch 出品硬核 PvP 生存沙盒，裸男开局白手起家。建造、掠夺、结盟，人心比环境更危险。具体支持以各平台官网为准。',
  '最硬核 PvP 生存，人心叵测的废土社会模拟器',
  '["PvP","生存","硬核"]',
  '🪨',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/252490/header.jpg',
  102,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  '7-days-to-die',
  '七日杀',
  '生存',
  8,
  'mid',
  '["dalong","shunwang"]',
  'The Fun Pimps 出品僵尸生存沙盒，每 7 天血月尸潮。建造防御工事 + 资源搜集 + 技能升级。具体支持以各平台官网为准。',
  '七日血月尸潮紧张刺激，建造防御塔防玩法经典',
  '["僵尸","生存","建造"]',
  '🏚️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/251570/header.jpg',
  103,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'dont-starve-together',
  '饥荒：联机版',
  '生存',
  8.8,
  'low',
  '["caiji","shunwang","dalong"]',
  'Klei 出品饥荒多人联机版，哥特画风合作生存。多人分工合作建造基地对抗四季和 Boss。具体支持以各平台官网为准。',
  '合作生存最佳选择，多人分工对抗四季更有趣',
  '["合作","生存","哥特"]',
  '🌑',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/322330/header.jpg',
  104,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'qq-speed',
  'QQ飞车',
  '竞速',
  8.1,
  'low',
  '["start"]',
  '腾讯经典竞速网游，Q 版角色 + 漂移竞速。道具赛 + 竞速赛双模式，赛道设计丰富多样。具体支持以各平台官网为准。',
  '国民级休闲竞速，漂移手感流畅欢乐竞技',
  '["竞速","漂移","道具"]',
  '🏁',
  'https://game.gtimg.cn/images/qqkart/act/a20240101qqkart/logo.png',
  105,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'forza-horizon-5',
  '极限竞速：地平线5',
  '竞速',
  9.1,
  'high',
  '["shunwang"]',
  'Playground Games 出品墨西哥开放世界赛车，画面顶级。500+ 车辆收集，季节变换 + 嘉年华赛事。具体支持以各平台官网为准。',
  '赛车游戏天花板，墨西哥风光 + 500+ 车辆爽飙',
  '["竞速","开放世界","赛车"]',
  '🏎️',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg',
  106,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'rocket-league',
  '火箭联盟',
  '竞速',
  8.6,
  'low',
  '["shunwang"]',
  'Psyonix 出品赛车 + 足球跨界竞技，火箭车踢球创意满分。空中特技 + 团队配合，易上手难精通。具体支持以各平台官网为准。',
  '赛车踢足球创意满分，空中特技进球爽快炸裂',
  '["竞速","竞技","足球"]',
  '🚀',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg',
  107,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'harry-potter-ma',
  '哈利波特：魔法觉醒',
  '卡牌',
  8.2,
  'mid',
  '["netease"]',
  '网易正版哈利波特卡牌 RPG，霍格沃茨校园自由探索。即时卡牌对战 + 舞会社交 + 魁地奇。具体支持以各平台官网为准。',
  '哈利波特卡牌对战，霍格沃茨校园沉浸感一流',
  '["卡牌","哈利波特","魔法"]',
  '⚡',
  'https://nie.res.netease.com/r/pic/20240510/harry_potter_ma_logo.png',
  108,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'onmyoji',
  '阴阳师',
  '卡牌',
  8.3,
  'low',
  '["netease","hongshouzhi"]',
  '网易和风回合制卡牌 RPG，式神养成 + 策略阵容。美术顶级，声优阵容豪华，剧情沉浸感强。具体支持以各平台官网为准。',
  '和风卡牌 RPG 标杆，美术声优阵容顶级',
  '["卡牌","和风","养成"]',
  '🎭',
  'https://nie.res.netease.com/r/pic/20240510/onmyoji_logo.png',
  109,
  1
);
INSERT INTO games (id, name, type, rating, config, platforms, description, reason, tags, emoji, cover, sort_order, is_enabled) VALUES (
  'hearthstone',
  '炉石传说',
  '卡牌',
  8.7,
  'low',
  '["gelaiyun"]',
  '暴雪经典集换式卡牌，魔兽世界观衍生。标准/狂野/酒馆战棋多种模式，策略深度高。具体支持以各平台官网为准。',
  '集换式卡牌巅峰，酒馆战棋模式策略无穷',
  '["卡牌","魔兽","策略"]',
  '🃏',
  'https://blz-contentstack-images.akamaized.net/v3/assets/blt3213171c2294031d/blt6e96d8e3e4f6a2a5/64463def7f7f8a4e8d1e3c9a/hs-social-card-enUS.jpg',
  110,
  1
);
