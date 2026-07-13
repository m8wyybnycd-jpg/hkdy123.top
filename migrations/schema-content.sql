-- ============================================
-- P1-1 / P1-2: free_games + sms_platforms tables
-- Backend-ize the two content types that were 100% static.
-- ============================================

-- 免费单机游戏资源表（原 src/data/freeGames.ts 静态数据）
CREATE TABLE IF NOT EXISTS free_games (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL,
  platform    TEXT    NOT NULL,
  description TEXT    NOT NULL,
  quark_link  TEXT    NOT NULL,
  emoji       TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER DEFAULT 0,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 接码平台导航表（原 src/data/smsPlatforms.ts 静态数据）
CREATE TABLE IF NOT EXISTS sms_platforms (
  id                TEXT    PRIMARY KEY,
  name              TEXT    NOT NULL,
  url               TEXT    NOT NULL,
  category          TEXT    NOT NULL,
  countries         TEXT    NOT NULL DEFAULT '',
  is_free           INTEGER NOT NULL DEFAULT 1,
  need_register     INTEGER NOT NULL DEFAULT 0,
  support_chinese   INTEGER NOT NULL DEFAULT 0,
  retention         TEXT    NOT NULL DEFAULT '',
  description       TEXT    NOT NULL DEFAULT '',
  features          TEXT    DEFAULT '[]',
  sort_order        INTEGER DEFAULT 0,
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_free_games_type ON free_games(type);
CREATE INDEX IF NOT EXISTS idx_sms_platforms_category ON sms_platforms(category);
