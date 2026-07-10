-- Migration: Add failed_attempts and phone columns to verification_codes
-- Purpose: Track verification code brute-force attempts + SMS phone support
-- Date: 2026-07-10

-- Add phone column for SMS verification codes (nullable, email used for email codes)
ALTER TABLE verification_codes ADD COLUMN phone TEXT;

-- Add failed_attempts column for brute-force protection
ALTER TABLE verification_codes ADD COLUMN failed_attempts INTEGER DEFAULT 0;

-- Index for efficient IP-based rate limiting on login logs
CREATE INDEX IF NOT EXISTS idx_login_logs_ip_status_created ON login_logs(ip, status, created_at);

-- Index for phone-based verification code lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone, created_at);

-- Unique index on username to prevent duplicates at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username);
