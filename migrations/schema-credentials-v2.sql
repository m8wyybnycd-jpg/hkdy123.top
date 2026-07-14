-- ============================================
-- Migration: Add failure_count column to credentials table
-- Used by keepalive Worker to track consecutive health check failures
-- ============================================

ALTER TABLE credentials ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0;
