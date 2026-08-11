-- Instructions:
-- This migration drops the existing CHECK constraint on the students.category column
-- and adds a new CHECK constraint to allow an expanded set of categories.
-- PLEASE RUN THIS MANUALLY IN THE SUPABASE SQL EDITOR.

DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the name of the check constraint on the category column of the students table
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.students'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%category%';

    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.students DROP CONSTRAINT %I', constraint_name);
    END IF;

    -- Add the new expanded constraint
    ALTER TABLE public.students 
    ADD CONSTRAINT students_category_check 
    CHECK (category IN ('Open', 'OBC', 'SC', 'ST', 'VJ', 'NT', 'NT-B', 'NT-C', 'NT-D', 'SBC', 'EWS'));
END $$;
