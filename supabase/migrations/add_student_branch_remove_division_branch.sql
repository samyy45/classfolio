-- Migration: Move branch from divisions to students
-- Instructions: Run this manually in the Supabase SQL Editor. 
-- IMPORTANT: Existing students will temporarily receive 'Computer Science' as their branch placeholder.
-- Please review and manually correct any existing student records if their true branch is different.

-- Step 1: Add the branch column to students (nullable at first to allow for backfilling)
ALTER TABLE students ADD COLUMN branch TEXT;

-- Step 2: Backfill existing rows with a placeholder value
-- This is required so we can apply the NOT NULL constraint below.
-- Since the old branch data was on divisions, and this is a structural change for a cross-branch division setup,
-- we'll use a placeholder that matches the new enum options.
UPDATE students SET branch = 'Computer Science' WHERE branch IS NULL;

-- Step 3: Apply the constraints to make branch a required enum-like field
ALTER TABLE students ALTER COLUMN branch SET NOT NULL;
ALTER TABLE students ADD CONSTRAINT students_branch_check CHECK (branch IN ('Computer Science', 'Mechanical', 'Civil', 'E&TC', 'Electrical'));

-- Step 4: Drop the branch column from divisions, as division no longer implies branch
ALTER TABLE divisions DROP COLUMN branch;
