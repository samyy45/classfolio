-- Migration: Add Extended ERP Features (Daily Attendance, Dynamic Fees, Entrance Scores, CPRN)

-- 1. Add CPRN Number to students table
ALTER TABLE students 
ADD COLUMN cprn_number TEXT UNIQUE;

-- 2. Daily Attendance Records
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, date) -- One attendance record per student per date
);

CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

-- Fast lookup for attendance by date
CREATE INDEX idx_attendance_date ON attendance_records (date);

-- 3. Dynamic Fees Records
CREATE TABLE student_fees (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year TEXT,
    semester TEXT,
    base_fee NUMERIC(10,2) DEFAULT 0,
    scholarship_type TEXT,
    scholarship_percentage NUMERIC(5,2),
    scholarship_amount NUMERIC(10,2) DEFAULT 0,
    applicable_fee NUMERIC(10,2) DEFAULT 0,
    amount_paid NUMERIC(10,2) DEFAULT 0,
    remaining_amount NUMERIC(10,2) DEFAULT 0,
    payment_status TEXT CHECK (payment_status IN ('Paid', 'Partial', 'Unpaid', 'Overdue')),
    payment_date DATE,
    receipt_reference TEXT,
    remarks TEXT,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fees_updated_at
    BEFORE UPDATE ON student_fees
    FOR EACH ROW EXECUTE FUNCTION update_fees_updated_at();

-- 4. Entrance and Academic Scores
CREATE TABLE entrance_scores (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    pcm_physics NUMERIC(5,2),
    pcm_chemistry NUMERIC(5,2),
    pcm_maths NUMERIC(5,2),
    pcm_total NUMERIC(6,2),
    jee_score NUMERIC(6,2),
    jee_percentile NUMERIC(5,2),
    jee_rank INTEGER,
    cet_score NUMERIC(6,2),
    cet_percentile NUMERIC(5,2),
    cet_rank INTEGER,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scores_updated_at
    BEFORE UPDATE ON entrance_scores
    FOR EACH ROW EXECUTE FUNCTION update_scores_updated_at();

-- Disable RLS on new tables (API handles auth)
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_fees DISABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_scores DISABLE ROW LEVEL SECURITY;
