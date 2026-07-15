-- ============================================
-- Migration: Encryption Key Enhancement V4
-- Project: cloudgame-hub
-- Date: 2026-07-15
-- Description:
--   1. Add `iv` column to encryption_keys (stores wrapped key's IV)
--   2. Add `status` column to encryption_keys (active/deprecated/revoked)
--   3. Create `credential_decrypt_logs` table for decryption audit trail
--   4. Indexes for audit query performance
-- ============================================

-- ═══ 1. encryption_keys: add iv column for wrapped key IV ═══

ALTER TABLE encryption_keys ADD COLUMN iv TEXT;

-- ═══ 2. encryption_keys: add status column for key lifecycle ═══

ALTER TABLE encryption_keys ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
-- Valid values: 'active', 'deprecated', 'revoked'

-- ═══ 3. credential_decrypt_logs: decryption audit trail ═══

CREATE TABLE IF NOT EXISTS credential_decrypt_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_id INTEGER NOT NULL,
  credential_name TEXT NOT NULL DEFAULT '',
  key_version INTEGER,
  success INTEGER NOT NULL DEFAULT 1,        -- 1 = success, 0 = failure
  caller_ip TEXT DEFAULT '',                  -- IP that triggered the decryption
  caller_user_id INTEGER,                     -- authenticated user who triggered it
  caller_service TEXT DEFAULT '',             -- internal service name (e.g. 'pet/chat', 'keepalive')
  error_message TEXT DEFAULT '',              -- decryption failure reason
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_decrypt_logs_credential ON credential_decrypt_logs(credential_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decrypt_logs_key_version ON credential_decrypt_logs(key_version);
CREATE INDEX IF NOT EXISTS idx_decrypt_logs_created_at ON credential_decrypt_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_decrypt_logs_success ON credential_decrypt_logs(success, created_at DESC);

-- ═══ 4. Backfill: set iv for existing encryption_keys rows ═══
-- If any rows have encrypted_key but null iv, set a placeholder
-- (rows without real encrypted_key material will be skipped)
-- UPDATE encryption_keys SET iv = '' WHERE encrypted_key IS NOT NULL AND iv IS NULL;
