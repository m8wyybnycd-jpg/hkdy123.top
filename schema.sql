-- ============================================
-- Cloudflare D1 Schema for cloudgame-hub
-- V2.0 base + V3.0 incremental (email auth, verification codes, admin)
-- ============================================

-- ============================================
-- V2.0 实际结构（修正）
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    UNIQUE NOT NULL,
  username      TEXT,
  password_hash TEXT    NOT NULL,
  salt          TEXT    NOT NULL,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);

-- ============================================
-- V3.0 新增：邮箱验证码表
-- ============================================

CREATE TABLE IF NOT EXISTS verification_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL,
  code        TEXT    NOT NULL,
  expires_at  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  used        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_vcodes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_vcodes_expires ON verification_codes(expires_at);

-- ============================================
-- V3.0 迁移：users 表加 is_admin
-- 注意：D1 中需手动执行此 ALTER TABLE
-- ============================================

ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- 云游戏平台表
-- ============================================

CREATE TABLE IF NOT EXISTS platforms (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  color       TEXT    NOT NULL,
  price       TEXT    NOT NULL,
  free_info   TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  description TEXT    NOT NULL,
  tags        TEXT    DEFAULT '[]',
  activity    TEXT    DEFAULT '',
  sort_order  INTEGER DEFAULT 0,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- 办公云电脑表
-- ============================================

CREATE TABLE IF NOT EXISTS cloud_desktops (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  description TEXT    NOT NULL,
  scenarios   TEXT    NOT NULL,
  price_range TEXT    NOT NULL,
  activity    TEXT    DEFAULT '',
  sort_order  INTEGER DEFAULT 0,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- 薅羊毛信息表
-- ============================================

CREATE TABLE IF NOT EXISTS deals (
  id          TEXT    PRIMARY KEY,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL,
  link        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  tags        TEXT    DEFAULT '[]',
  updated_at  TEXT    NOT NULL,
  expires_at  TEXT    DEFAULT '',
  sort_order  INTEGER DEFAULT 0
);

-- ============================================
-- 游戏表（本期保持静态，预建表为 P1 迁移准备）
-- ============================================

CREATE TABLE IF NOT EXISTS games (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL,
  rating      REAL    NOT NULL,
  config      TEXT    NOT NULL,
  platforms   TEXT    NOT NULL,
  description TEXT    NOT NULL,
  reason      TEXT    NOT NULL,
  tags        TEXT    DEFAULT '[]',
  emoji       TEXT    NOT NULL,
  sort_order  INTEGER DEFAULT 0
);

-- ============================================
-- 用户收藏表（P2）
-- ============================================

CREATE TABLE IF NOT EXISTS favorites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  item_type  TEXT    NOT NULL,
  item_id    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, item_type, item_id)
);

-- ============================================
-- 索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- 首页轮播图表
-- ============================================

CREATE TABLE IF NOT EXISTS banners (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL DEFAULT '',
  image_url    TEXT NOT NULL,
  link_url     TEXT DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  start_time   TEXT DEFAULT NULL,
  end_time     TEXT DEFAULT NULL,
  description  TEXT DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_banners_sort ON banners(sort_order, is_active);

-- ============================================
-- 页面配置表
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_page_configs_enabled ON page_configs(is_enabled, sort_order);

-- 预置数据
INSERT OR IGNORE INTO page_configs (page_key, page_name, title, subtitle, description, is_enabled, sort_order) VALUES
  ('cloud-games',    '云游戏',   '不用高配电脑，也能畅玩 3A 大作', '汇聚各大云游戏平台，按需选择最划算的方案', 1, 1),
  ('cloud-desktops', '云电脑',   '随时随地，高效办公',             '汇聚优质办公云电脑方案',                   1, 2),
  ('deals',          '薅羊毛',   '精选优惠，天天薅羊毛',           '最新游戏优惠信息一网打尽',                 1, 3),
  ('library',        '游戏库',   '探索你的下一款游戏',             '精选游戏推荐与评测',                       1, 4),
  ('free-games',     '免费资源', '免费也能玩得爽',                 '精选免费游戏资源',                         1, 5),
  ('sms-platforms',  '接码平台', '接码平台导航',                   '精选靠谱的接码平台',                       1, 6);
