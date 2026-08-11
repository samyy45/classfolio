-- ============================================================
-- CLASSFOLIO — PART 1: MAIN SCHEMA
-- Paste this FIRST in Supabase SQL Editor and click Run
-- ============================================================

-- Step 1: Enable the trigram extension (needed for name search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: profiles table (one row per HOD / teacher)
CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL CHECK (role IN ('hod', 'faculty')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: divisions table (Div A, Div B, etc.)
CREATE TABLE divisions (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    branch      TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 4: students table (the main table)
CREATE TABLE students (
    id                  SERIAL PRIMARY KEY,
    full_name           TEXT NOT NULL,
    gender              TEXT NOT NULL CHECK (gender IN ('Boy', 'Girl')),
    category            TEXT NOT NULL CHECK (category IN ('Open', 'OBC', 'SC')),
    prn_number          TEXT NOT NULL UNIQUE,
    apaar_id            TEXT UNIQUE,
    division_id         INTEGER NOT NULL REFERENCES divisions(id),
    roll_number         INTEGER NOT NULL,
    student_mobile      TEXT NOT NULL,
    father_mobile       TEXT NOT NULL,
    mother_mobile       TEXT NOT NULL,
    address             TEXT,
    fees_status         TEXT NOT NULL DEFAULT 'Unpaid'
                            CHECK (fees_status IN ('Paid', 'Unpaid', 'Partial')),
    scholarship_status  TEXT NOT NULL DEFAULT 'Not Availed'
                            CHECK (scholarship_status IN ('Availed', 'Not Availed')),
    hostel_status       TEXT NOT NULL DEFAULT 'Day Scholar'
                            CHECK (hostel_status IN ('Hosteller', 'Day Scholar')),
    hostel_fees         NUMERIC(10,2) DEFAULT 0,
    sem1_attendance     NUMERIC(5,2) CHECK (sem1_attendance >= 0 AND sem1_attendance <= 100),
    sem2_attendance     NUMERIC(5,2) CHECK (sem2_attendance >= 0 AND sem2_attendance <= 100),
    sgpa                TEXT,
    status              TEXT NOT NULL DEFAULT 'Active'
                            CHECK (status IN ('Active', 'Withdrawn')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by          UUID REFERENCES profiles(id)
);

-- Step 5: uploaded_files table (audit log for Excel uploads)
CREATE TABLE uploaded_files (
    id              SERIAL PRIMARY KEY,
    uploaded_by     UUID NOT NULL REFERENCES profiles(id),
    file_name       TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    row_count       INTEGER NOT NULL,
    success_count   INTEGER NOT NULL,
    failed_count    INTEGER NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('committed', 'rejected')),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 6: Indexes for fast search and filtering
ALTER TABLE students
    ADD CONSTRAINT unique_roll_per_division UNIQUE (division_id, roll_number);

CREATE INDEX idx_students_name     ON students USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_students_prn      ON students (prn_number);
CREATE INDEX idx_students_division ON students (division_id);
CREATE INDEX idx_students_status   ON students (status);

-- Step 7: Auto-update updated_at when a student row is edited
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Step 8: Disable Row Level Security (our API routes handle access control)
ALTER TABLE profiles        DISABLE ROW LEVEL SECURITY;
ALTER TABLE divisions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE students        DISABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files  DISABLE ROW LEVEL SECURITY;

-- Step 9: Seed the 3 default divisions
INSERT INTO divisions (name, branch) VALUES
    ('Division A', 'Computer Engineering'),
    ('Division B', 'Computer Engineering'),
    ('Division C', 'Computer Engineering');

-- ============================================================
-- DONE! If you see "Success. No rows returned" — it worked.
-- Now go to PART 2 (after creating the HOD in Auth first).
-- ============================================================

