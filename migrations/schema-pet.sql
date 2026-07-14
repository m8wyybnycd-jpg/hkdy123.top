-- ============================================
-- AI Memory Pet Schema - cloudgame-hub
-- 5-level growth system + long-term memory + conversation history
-- ============================================

-- ============================================
-- 宠物表：每用户一只宠物
-- ============================================
CREATE TABLE IF NOT EXISTS pets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL UNIQUE,
  name            TEXT    NOT NULL DEFAULT '云玩精灵',
  level           INTEGER NOT NULL DEFAULT 1,          -- 1=蛋 2=幼崽 3=成长 4=伙伴 5=专家
  exp             INTEGER NOT NULL DEFAULT 0,          -- 当前经验值
  state           TEXT    NOT NULL DEFAULT 'idle',     -- idle/waving/jumping/running/failed/waiting/review
  mood            TEXT    NOT NULL DEFAULT 'happy',    -- happy/curious/excited/tired
  total_chats     INTEGER NOT NULL DEFAULT 0,          -- 累计对话次数
  total_browses   INTEGER NOT NULL DEFAULT 0,          -- 累计浏览页面数（去重）
  total_likes     INTEGER NOT NULL DEFAULT 0,          -- 累计点赞数
  hatched_at      TEXT,                                -- 孵化时间（从蛋→幼崽）
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_pets_user ON pets(user_id);

-- ============================================
-- 宠物记忆表：长期记忆（用户偏好、关键信息）
-- ============================================
CREATE TABLE IF NOT EXISTS pet_memories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id          INTEGER NOT NULL,
  memory_type     TEXT    NOT NULL,                    -- preference/fact/event/summary
  content         TEXT    NOT NULL,                    -- 记忆内容
  importance      INTEGER NOT NULL DEFAULT 5,          -- 1-10 重要程度
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);
CREATE INDEX IF NOT EXISTS idx_pet_memories_pet ON pet_memories(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_memories_type ON pet_memories(pet_id, memory_type);

-- ============================================
-- 对话历史表
-- ============================================
CREATE TABLE IF NOT EXISTS pet_conversations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id          INTEGER NOT NULL,
  role            TEXT    NOT NULL,                    -- user/assistant
  content         TEXT    NOT NULL,
  page_context    TEXT    DEFAULT '',                  -- 对话时的页面上下文标签
  page_url        TEXT    DEFAULT '',                  -- 对话时的页面URL
  exp_gained      INTEGER NOT NULL DEFAULT 0,          -- 本次对话获得的经验
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);
CREATE INDEX IF NOT EXISTS idx_pet_conversations_pet ON pet_conversations(pet_id, created_at DESC);

-- ============================================
-- 成长日志表：记录每次经验值变化
-- ============================================
CREATE TABLE IF NOT EXISTS pet_growth_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id          INTEGER NOT NULL,
  action          TEXT    NOT NULL,                    -- chat/browse/like/levelup
  exp_delta       INTEGER NOT NULL,                    -- 经验变化量
  exp_after       INTEGER NOT NULL,                    -- 变化后总经验
  detail          TEXT    DEFAULT '',                  -- 详情
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);
CREATE INDEX IF NOT EXISTS idx_pet_growth_logs_pet ON pet_growth_logs(pet_id, created_at DESC);

-- ============================================
-- 等级阈值（经验值需求）
-- Level 1 (蛋):     0-99
-- Level 2 (幼崽):   100-299
-- Level 3 (成长):   300-599
-- Level 4 (伙伴):   600-999
-- Level 5 (专家):   1000+
-- ============================================

-- 经验值规则：
-- 对话一次: +5 exp (每日上限 50)
-- 浏览新页面: +3 exp (每日上限 30)
-- 点赞回复: +2 exp (每日上限 20)
-- 升级到特定等级触发孵化动画

-- ============================================
-- 页面语义标签映射（用于上下文感知）
-- ============================================
CREATE TABLE IF NOT EXISTS pet_page_contexts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  route_path      TEXT    NOT NULL,                    -- 如 /cloud-games
  page_label      TEXT    NOT NULL,                    -- 如 "云游戏平台"
  page_icon       TEXT    NOT NULL DEFAULT '🏠',
  system_prompt   TEXT    NOT NULL DEFAULT '',         -- 该页面的AI system prompt补充
  tips            TEXT    DEFAULT '',                  -- 默认推荐语
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(route_path)
);

-- 预置页面上下文
INSERT OR IGNORE INTO pet_page_contexts (route_path, page_label, page_icon, system_prompt, tips) VALUES
  ('/',              '首页',       '🏠', '用户在云玩汇首页，这里有云游戏平台推荐、薅羊毛优惠、免费资源等。引导用户探索各板块。', '欢迎来到云玩汇！我可以帮你推荐云游戏平台、找免费资源、薅羊毛优惠，有什么想了解的？'),
  ('/cloud-games',   '云游戏平台', '🎮', '用户在云游戏平台页面。这里有网易云游戏、腾讯START、顺网云游戏等平台信息。重点关注各平台的免费时长、签到福利、价格对比。', '你在看云游戏平台~ 网易云游戏签到7天送130分钟免费时长，腾讯START新用户有免费体验，要了解哪个平台？'),
  ('/cloud-desktops','云电脑',     '💻', '用户在云电脑页面。这里有达龙云电脑、ToDesk、海马云电脑等办公云桌面方案。关注价格、性能、适用场景。', '在看云电脑？办公用推荐ToDesk，性价比高。游戏用达龙云电脑性能更强，需要我详细对比吗？'),
  ('/deals',         '薅羊毛',     '🐑', '用户在薅羊毛页面。这里有签到免费、限免监控、优惠码、新用户福利等优惠信息。帮助用户找到最新最划算的福利。', '薅羊毛时间到！这里有限免游戏、签到福利、优惠码，想看哪个类别的优惠？'),
  ('/library',       '游戏库',     '📚', '用户在游戏库页面。这里有精选游戏推荐和评测。根据用户偏好推荐适合的游戏。', '游戏库里有很多好游戏，你喜欢什么类型的？3A大作、MOBA还是休闲游戏？'),
  ('/free-games',    '免费资源',   '🆓', '用户在免费资源页面。这里有夸克网盘免费游戏资源分享。帮助用户找到想玩的免费游戏。', '免费资源区！这里有不花钱就能玩的游戏资源，想找什么类型的？'),
  ('/sms-platforms', '接码平台',   '📱', '用户在接码平台页面。这里有国内外接码平台导航。帮助用户选择靠谱的接码平台。', '在看接码平台？国内用可以用免费的，国外注册推荐付费的更稳定，需要我推荐吗？'),
  ('/net-disk-search','网盘搜索',  '🔍', '用户在网盘搜索页面。可以搜索夸克网盘、百度网盘等14种网盘资源。帮助用户找到想要的资源。', '网盘搜索神器！输入关键词就能搜全网网盘资源，想搜什么？'),
  ('/search',        '搜索',       '🔎', '用户在使用站内搜索功能。帮助用户优化搜索关键词或推荐相关内容。', '在找什么？告诉我关键词，我帮你找最相关的资源~'),
  ('/profile',       '个人中心',   '👤', '用户在个人中心页面。可以查看收藏、消息等。提醒用户关注宠物成长状态。', '欢迎回来！看看你的精灵宠物成长了多少~'),
  ('/messages',      '消息中心',   '✉️', '用户在消息中心。提醒用户查看系统通知和消息。', '有新消息记得看哦~ 有什么问题随时问我！');
