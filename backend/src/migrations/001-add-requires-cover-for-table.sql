-- 2026-04-13: Add explicit cover requirement for table reservations.
-- This migration is idempotent and safe to run multiple times.

ALTER TABLE events
ADD COLUMN IF NOT EXISTS "requiresCoverForTable" BOOLEAN NOT NULL DEFAULT FALSE;
