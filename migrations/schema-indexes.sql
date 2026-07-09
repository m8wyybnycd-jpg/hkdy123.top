-- Migration: Add missing indexes for performance optimization
-- Date: 2026-07-10
-- Issue: SC-01 from comprehensive audit — critical query patterns lacked indexes

-- Speed up unread message count query (polled every 60s per user)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON messages(recipient_id, is_read);

-- Speed up verification code lookup during register/login
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_used_expires ON verification_codes(email, used, expires_at);

-- Speed up announcement list query (loaded on every page)
CREATE INDEX IF NOT EXISTS idx_announcements_status_sort ON announcements(status, sort_order);

-- Speed up operation log filtering by module in admin
CREATE INDEX IF NOT EXISTS idx_operation_logs_module ON operation_logs(module);

-- Speed up reverse permission-to-role lookup in RBAC
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
