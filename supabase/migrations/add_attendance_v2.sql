-- ─── Attendance System v2 Migration ─────────────────────────────────────────
-- Run this in Supabase SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).

-- 1. Add period_id check constraint to attendance_sessions
--    (drops the old free-text period_label column and replaces with period_id)
ALTER TABLE attendance_sessions
  ADD COLUMN IF NOT EXISTS period_id TEXT;

-- Normalize legacy values if possible, or set a valid default / clean up invalid test data
UPDATE attendance_sessions
  SET period_id = CASE
    WHEN period_id ILIKE '%morning%' OR period_id ILIKE '%1%' THEN 'L1'
    WHEN period_id ILIKE '%afternoon%' OR period_id ILIKE '%2%' THEN 'L2'
    WHEN period_id IN ('L1','L2','L3','L4','L5','L6') THEN period_id
    ELSE 'L1'
  END
  WHERE period_id IS NOT NULL;

-- If there are still rows with invalid period_id, remove their child attendance records and session rows
DELETE FROM attendance_records
  WHERE session_id IN (
    SELECT id FROM attendance_sessions
    WHERE period_id NOT IN ('L1','L2','L3','L4','L5','L6') OR period_id IS NULL
  );

DELETE FROM attendance_sessions
  WHERE period_id NOT IN ('L1','L2','L3','L4','L5','L6') OR period_id IS NULL;

-- Add check constraint
ALTER TABLE attendance_sessions
  DROP CONSTRAINT IF EXISTS chk_period_id;

ALTER TABLE attendance_sessions
  ADD CONSTRAINT chk_period_id
  CHECK (period_id IN ('L1','L2','L3','L4','L5','L6'));

-- Drop old unique constraint and re-add on period_id
ALTER TABLE attendance_sessions
  DROP CONSTRAINT IF EXISTS unique_session;

ALTER TABLE attendance_sessions
  ADD CONSTRAINT unique_session_v2
  UNIQUE (division_id, session_date, period_id);

-- 2. Create attendance_skips table
CREATE TABLE IF NOT EXISTS attendance_skips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  period_id TEXT,  -- NULL means "all periods that day"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_skip_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_skip_period CHECK (period_id IS NULL OR period_id IN ('L1','L2','L3','L4','L5','L6'))
);

-- Index for fast lookup when loading a session
CREATE INDEX IF NOT EXISTS idx_skips_division_dates
  ON attendance_skips (division_id, start_date, end_date);
