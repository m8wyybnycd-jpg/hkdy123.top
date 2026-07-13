-- Migration: add `ip` column to verification_codes for real per-IP rate limiting.
-- Without this, the send-code / send-sms IP throttle incorrectly counted
-- login_logs (which don't capture code-send events), so it never fired.
ALTER TABLE verification_codes ADD COLUMN ip TEXT;

CREATE INDEX IF NOT EXISTS idx_verification_codes_ip ON verification_codes(ip, created_at);
