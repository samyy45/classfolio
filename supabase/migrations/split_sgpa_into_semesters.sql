-- =============================================================
-- Migration: split_sgpa_into_semesters
-- Description: Replaces the single `sgpa` TEXT column on the
--              `students` table with two separate nullable TEXT
--              columns: `sgpa_sem1` and `sgpa_sem2`.
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard → SQL Editor.
--   2. Paste the entire contents of this file and click "Run".
--   3. Do NOT auto-execute via CI — run manually and verify the
--      result with:  SELECT id, sgpa_sem1, sgpa_sem2 FROM students LIMIT 10;
--
-- IMPORTANT NOTE ON DATA MIGRATION:
--   Any existing students who had a value in the old `sgpa` column
--   will have that value copied into `sgpa_sem1`. `sgpa_sem2` will
--   be left NULL for all existing rows.
--   This is a best-effort migration — since the original single `sgpa`
--   field did not distinguish which semester the grade referred to,
--   we place it in Sem 1 as a reasonable default. Existing test data
--   MAY NEED MANUAL REVIEW to confirm or correct which semester a
--   historical SGPA value actually belongs to.
-- =============================================================

-- Step 1: Add the two new nullable TEXT columns.
-- Both default to NULL — blank is intentional, never substitute 0.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS sgpa_sem1 TEXT,
  ADD COLUMN IF NOT EXISTS sgpa_sem2 TEXT;

-- Step 2: Migrate existing data.
-- Copy any non-null value from the old `sgpa` column into `sgpa_sem1`.
-- `sgpa_sem2` remains NULL for all existing rows (best-effort default).
UPDATE students
SET sgpa_sem1 = sgpa
WHERE sgpa IS NOT NULL;

-- Step 3: Drop the old single `sgpa` column.
-- Only do this AFTER confirming Step 2 succeeded (check with a SELECT above).
ALTER TABLE students
  DROP COLUMN IF EXISTS sgpa;

-- Verification query (run after the migration to confirm):
-- SELECT id, full_name, sgpa_sem1, sgpa_sem2 FROM students LIMIT 20;
