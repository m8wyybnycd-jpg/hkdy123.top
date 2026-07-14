-- ============================================
-- Credential Management Schema - cloudgame-hub
-- Centralized credential storage with AES-GCM encryption at rest
-- Supports: API Key, Token, OAuth, Certificate
-- Includes: health monitoring + audit trail
-- ============================================

-- ============================================
-- 凭证主表：统一管理所有外部服务凭证
-- ============================================
CREATE TABLE IF NOT EXISTS credentials (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT    NOT NULL,                          -- 凭证名称（如"讯飞MaaS APIKey"）
  type              TEXT    NOT NULL DEFAULT 'api_key',        -- api_key / token / oauth / certificate
  provider          TEXT    NOT NULL DEFAULT '',               -- 服务商标识（如 xfyun / brevo / smsbao）
  endpoint_url      TEXT    DEFAULT '',                         -- 关联的 API 端点地址
  encrypted_value   TEXT    NOT NULL,                           -- AES-GCM 加密后的密文（base64）
  encryption_iv     TEXT    NOT NULL,                           -- 加密 IV（base64，每条独立）
  metadata          TEXT    DEFAULT '{}',                       -- JSON 扩展字段（model_id, extra_headers 等）
  status            TEXT    NOT NULL DEFAULT 'active',          -- active / expired / revoked / error
  last_health_check TEXT,                                       -- 最近健康检查时间（ISO 8601）
  last_health_status TEXT   DEFAULT 'unknown',                  -- healthy / unhealthy / unknown
  auto_renew        INTEGER NOT NULL DEFAULT 0,                 -- 是否自动续期（0=否 1=是）
  renew_endpoint    TEXT    DEFAULT '',                         -- 续期接口地址（auto_renew=1 时使用）
  expires_at        TEXT,                                        -- 凭证过期时间（ISO 8601，可空=永不过期）
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials(type);
CREATE INDEX IF NOT EXISTS idx_credentials_provider ON credentials(provider);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);

-- ============================================
-- 健康检查日志表：记录每次凭证健康检查结果
-- ============================================
CREATE TABLE IF NOT EXISTS credential_health_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_id     INTEGER NOT NULL,
  check_type        TEXT    NOT NULL DEFAULT 'ping',            -- ping / auth_test / renew
  status            TEXT    NOT NULL,                           -- healthy / unhealthy
  response_code     INTEGER,                                    -- HTTP 响应码
  latency_ms        INTEGER,                                    -- 响应耗时（毫秒）
  error_message     TEXT    DEFAULT '',
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cred_health_logs_credential ON credential_health_logs(credential_id, created_at DESC);

-- ============================================
-- 审计日志表：记录凭证的所有操作（创建/查看/更新/删除/测试）
-- ============================================
CREATE TABLE IF NOT EXISTS credential_audit_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_id     INTEGER NOT NULL,
  action            TEXT    NOT NULL,                           -- create / view / update / delete / test / renew
  operator_id       INTEGER,                                    -- 操作者用户 ID
  operator_name     TEXT    DEFAULT '',                         -- 操作者用户名
  ip                TEXT    DEFAULT '',                         -- 操作者 IP
  detail            TEXT    DEFAULT '{}',                       -- JSON 详情
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cred_audit_logs_credential ON credential_audit_logs(credential_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cred_audit_logs_action ON credential_audit_logs(action, created_at DESC);

-- ============================================
-- 权限种子数据：插入凭证管理相关权限
-- ============================================
INSERT OR IGNORE INTO permissions (code, name, module) VALUES
  ('credential:view',   '查看凭证',   'credential'),
  ('credential:manage', '管理凭证',   'credential');
