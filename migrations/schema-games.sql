-- ═══════════════════════════════════════════════════════════
-- P1-4: games 表 — 游戏库数据入库
-- 说明: 将 src/data/games.ts 的 111 条静态游戏数据迁移到 D1
-- 幂等: DROP IF EXISTS + CREATE，可重复执行
-- ═══════════════════════════════════════════════════════════

-- 旧表缺少 is_enabled/sort_order/description 等列，直接重建
DROP TABLE IF EXISTS games;

CREATE TABLE games (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL,
  rating      REAL    NOT NULL DEFAULT 0,
  config      TEXT    NOT NULL DEFAULT 'mid',
  platforms   TEXT    NOT NULL DEFAULT '[]',
  description TEXT    NOT NULL DEFAULT '',
  reason      TEXT    NOT NULL DEFAULT '',
  tags        TEXT    NOT NULL DEFAULT '[]',
  emoji       TEXT    NOT NULL DEFAULT '',
  cover       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_enabled  INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_games_type ON games(type);
CREATE INDEX IF NOT EXISTS idx_games_enabled ON games(is_enabled, sort_order);

-- 权限码
INSERT OR IGNORE INTO permissions (code, name, module, action, sort_order) VALUES
  ('game:view',   '查看游戏库', 'game', 'view',   20),
  ('game:manage', '管理游戏库', 'game', 'manage', 21);

-- 超管授权
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.code = 'super_admin' AND p.code IN ('game:view', 'game:manage');
