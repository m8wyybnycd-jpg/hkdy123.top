-- Migration: pet-desktop-v1
-- Purpose: Add tables for desktop app device auth + refresh token one-time-use tracking
-- Date: 2026-07-15

-- Track device bindings for desktop app authentication
CREATE TABLE IF NOT EXISTS pet_device_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  device_fingerprint TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, device_fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_device_bindings_user ON pet_device_bindings(user_id);

-- Track used refresh token JTIs for one-time-use enforcement
CREATE TABLE IF NOT EXISTS pet_refresh_used (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jti TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  used_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_refresh_used_jti ON pet_refresh_used(jti);
CREATE INDEX IF NOT EXISTS idx_refresh_used_user ON pet_refresh_used(user_id);
