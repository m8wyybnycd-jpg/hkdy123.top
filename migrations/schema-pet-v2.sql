-- Migration: pet-v2
-- Purpose: Expand 5-level → 7-level system, add checkin support
-- Date: 2026-07-15

-- ============================================
-- 1. Add streak + checkin columns to pets table
-- ============================================
ALTER TABLE pets ADD COLUMN streak_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pets ADD COLUMN last_checkin_date TEXT;

-- ============================================
-- 2. Checkin logs for audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS pet_checkin_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id          INTEGER NOT NULL,
  checkin_date    TEXT    NOT NULL,                    -- 'YYYY-MM-DD'
  streak_days     INTEGER NOT NULL DEFAULT 0,
  exp_gained      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id)
);
CREATE INDEX IF NOT EXISTS idx_checkin_pet ON pet_checkin_logs(pet_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_date ON pet_checkin_logs(checkin_date);

-- ============================================
-- 3. Update page context for pet (no structural change)
-- ============================================
-- Existing page contexts are preserved; new entries can be added via admin backend.
-- The pet/context.ts endpoint handles insertion.
