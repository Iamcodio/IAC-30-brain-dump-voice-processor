-- Migration 006: Add auto-fill tracking fields
-- Adds columns to track auto-fill usage statistics for each recording

ALTER TABLE recordings ADD COLUMN autoFillCount INTEGER DEFAULT 0;
ALTER TABLE recordings ADD COLUMN lastAutoFillTimestamp TEXT DEFAULT NULL;
