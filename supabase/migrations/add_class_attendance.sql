-- Migration: Add Attendance Sessions & Records

-- Drop the old table (as requested, replacing old schema)
DROP TABLE IF EXISTS attendance_records;

-- Create attendance_sessions table
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    period_label TEXT NOT NULL,
    marked_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint so we don't have multiple sessions for the exact same division, date, and period
ALTER TABLE attendance_sessions ADD CONSTRAINT unique_session UNIQUE (division_id, session_date, period_label);

-- Create new attendance_records table
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')) DEFAULT 'Absent'
);

-- Unique constraint so a student can only have one record per session
ALTER TABLE attendance_records ADD CONSTRAINT unique_record_per_session UNIQUE (session_id, student_id);
