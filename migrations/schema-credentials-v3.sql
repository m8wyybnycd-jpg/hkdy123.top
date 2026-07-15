-- ============================================
-- Migration: Credential encryption key versioning V3
-- Project: cloudgame-hub
-- Date: 2026-07-15
-- Description:
--   1. Add key_version column to credentials (for multi-key decryption)
--   2. Add encrypted_key column to encryption_keys (for key material storage)
-- ============================================

-- 1. credentials: track which key version encrypted this credential
ALTER TABLE credentials ADD COLUMN key_version INTEGER DEFAULT NULL;

-- 2. encryption_keys: store the version-specific key material (encrypted by master key)
ALTER TABLE encryption_keys ADD COLUMN encrypted_key TEXT;
