-- Migration: Allow deleting faculty accounts by setting dependent records' user refs to NULL
-- Run this manually in the Supabase SQL Editor

BEGIN;

-- 1. Update the 'students' table (updated_by column)
ALTER TABLE public.students 
  DROP CONSTRAINT IF EXISTS students_updated_by_fkey,
  ADD CONSTRAINT students_updated_by_fkey 
    FOREIGN KEY (updated_by) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- 2. Update the 'uploaded_files' table (uploaded_by column)
ALTER TABLE public.uploaded_files 
  DROP CONSTRAINT IF EXISTS uploaded_files_uploaded_by_fkey,
  ADD CONSTRAINT uploaded_files_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- 3. The profiles table is linked to auth.users. 
-- When an auth.user is deleted via the admin API, Supabase's default behavior 
-- deletes the linked row in public.profiles (because profiles has an ON DELETE CASCADE 
-- to auth.users in its definition). We just need to make sure our own tables 
-- don't block the profiles row deletion.

COMMIT;
