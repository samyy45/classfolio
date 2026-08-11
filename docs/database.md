# Database Schema Document
# College Student Information Management System
# Version: 1.0
# Database: Supabase (PostgreSQL)

---

## Why This File Exists

This is the most important file in the project. If the database schema is unclear, the AI will invent columns mid-build and the app will develop data inconsistencies that are very hard to fix later. Every table, every column, every constraint, and every relationship is defined here exactly once. No improvisation allowed.

---

## 1. Tables Overview

| Table | Purpose |
|---|---|
| `profiles` | One row per registered user (HOD or faculty) |
| `divisions` | The class divisions (Div A, Div B, etc.) |
| `students` | One row per student — the core table |
| `uploaded_files` | Audit log of every Excel file uploaded |

That's it — 4 tables. Simple and complete.

---

## 2. Table: `profiles`

Stores one row per registered user (linked to Supabase Auth's `auth.users` table).

```sql
CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL CHECK (role IN ('hod', 'faculty')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `id` — matches the `id` in Supabase's `auth.users` table exactly (same UUID)
- `role` — either `'hod'` or `'faculty'` — enforced by the CHECK constraint, not application logic
- `email` — stored here for easy display; the authoritative email lives in `auth.users`

**HOD Seed (run once before launch in Supabase SQL Editor):**
```sql
-- Step 1: Create HOD in Supabase Auth dashboard manually (Authentication → Users → Add User)
-- Step 2: Get the UUID that Supabase assigned, then run:
INSERT INTO profiles (id, full_name, email, role)
VALUES (
    'paste-hod-uuid-here',
    'HOD Name',
    'hod@college.edu',
    'hod'
);
```

---

## 3. Table: `divisions`

Stores the class divisions. HOD can add new ones from the dashboard.

```sql
CREATE TABLE divisions (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,   -- e.g., 'Division A', 'Division B'
    branch      TEXT NOT NULL,          -- e.g., 'Computer Engineering'
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Column notes:**
- `name` — unique, so "Division A" cannot be added twice
- `is_active` — HOD can deactivate a division without deleting it (soft deactivation)
- `branch` — stored on the division since all students in that division share a branch

**Seed data (run once to create initial divisions):**
```sql
INSERT INTO divisions (name, branch) VALUES
    ('Division A', 'Computer Engineering'),
    ('Division B', 'Computer Engineering'),
    ('Division C', 'Computer Engineering');
```

---

## 4. Table: `students`

The core table. One row per student.

```sql
CREATE TABLE students (
    -- Primary Key
    id                  SERIAL PRIMARY KEY,

    -- Identity
    full_name           TEXT NOT NULL,
    gender              TEXT NOT NULL CHECK (gender IN ('Boy', 'Girl')),
    category            TEXT NOT NULL CHECK (category IN ('Open', 'OBC', 'SC')),

    -- Official IDs
    prn_number          TEXT NOT NULL UNIQUE,
    apaar_id            TEXT UNIQUE,           -- optional at entry, but unique when provided

    -- Enrollment
    division_id         INTEGER NOT NULL REFERENCES divisions(id),
    roll_number         INTEGER NOT NULL,

    -- Contact
    student_mobile      TEXT NOT NULL,
    father_mobile       TEXT NOT NULL,
    mother_mobile       TEXT NOT NULL,
    address             TEXT,

    -- Financial / Administrative
    fees_status         TEXT NOT NULL DEFAULT 'Unpaid'
                            CHECK (fees_status IN ('Paid', 'Unpaid', 'Partial')),
    scholarship_status  TEXT NOT NULL DEFAULT 'Not Availed'
                            CHECK (scholarship_status IN ('Availed', 'Not Availed')),
    hostel_status       TEXT NOT NULL DEFAULT 'Day Scholar'
                            CHECK (hostel_status IN ('Hosteller', 'Day Scholar')),
    hostel_fees         NUMERIC(10,2) DEFAULT 0,

    -- Attendance (simple: two fields only)
    sem1_attendance     NUMERIC(5,2) CHECK (sem1_attendance >= 0 AND sem1_attendance <= 100),
    sem2_attendance     NUMERIC(5,2) CHECK (sem2_attendance >= 0 AND sem2_attendance <= 100),
    -- yearly_attendance is NOT stored — always computed as (sem1 + sem2) / 2 in the app

    -- Results (split into two semesters; both optional free text)
    sgpa_sem1           TEXT,   -- e.g. '7.8', 'Detained', 'ATKT' — null if not yet entered
    sgpa_sem2           TEXT,   -- e.g. '8.0', 'ATKT' — null if not yet entered

    -- Soft Delete
    status              TEXT NOT NULL DEFAULT 'Active'
                            CHECK (status IN ('Active', 'Withdrawn')),

    -- Metadata
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by          UUID REFERENCES profiles(id)   -- who last edited this record
);
```

**Constraints and Indexes:**

```sql
-- Roll number must be unique within a division (not globally)
ALTER TABLE students
    ADD CONSTRAINT unique_roll_per_division UNIQUE (division_id, roll_number);

-- Fast search by name (case-insensitive partial match)
CREATE INDEX idx_students_name ON students USING gin (full_name gin_trgm_ops);

-- Fast lookup by PRN
CREATE INDEX idx_students_prn ON students (prn_number);

-- Fast filter by division
CREATE INDEX idx_students_division ON students (division_id);

-- Fast filter by status (active vs withdrawn)
CREATE INDEX idx_students_status ON students (status);

-- Enable trigram extension (required for the name search index)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Column notes:**
- `prn_number` — globally unique across all students; this is the deduplication key for Excel re-uploads
- `apaar_id` — unique when provided, but `NULL` is allowed if not yet available
- `roll_number` — an integer (not "A-37" — the division prefix is derived from the division name when displayed)
- `hostel_fees` — only meaningful when `hostel_status = 'Hosteller'`; zero for day scholars
- `sgpa_sem1` / `sgpa_sem2` — stored as text because results sometimes include non-numeric values like "ATKT" or "Pass"; both are nullable — blank means not yet recorded
- `updated_by` — tracks which teacher last edited the record (required for basic accountability)
- `status` — `'Withdrawn'` hides the student from default views but keeps the record

**Auto-update `updated_at` trigger:**
```sql
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
```

---

## 5. Table: `uploaded_files`

Audit log of every Excel upload. The original file is stored in Supabase Storage; this table tracks the metadata.

```sql
CREATE TABLE uploaded_files (
    id              SERIAL PRIMARY KEY,
    uploaded_by     UUID NOT NULL REFERENCES profiles(id),
    file_name       TEXT NOT NULL,
    storage_path    TEXT NOT NULL,      -- path in Supabase Storage bucket
    row_count       INTEGER NOT NULL,   -- how many rows were processed
    success_count   INTEGER NOT NULL,
    failed_count    INTEGER NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('committed', 'rejected')),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. Row Level Security (RLS)

Supabase uses Row Level Security to control who can read/write data. Since all reads and writes in this app go through our own API routes (using the service role key), we disable RLS on all tables. The API routes do all permission checks in code.

```sql
-- Disable RLS on all tables (API routes handle access control)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE divisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files DISABLE ROW LEVEL SECURITY;
```

---

## 7. Relationships Diagram (Text)

```
auth.users (Supabase managed)
    |
    └── profiles (one per user)
            |
            └── uploaded_files.uploaded_by (who uploaded)
            └── students.updated_by (who last edited)

divisions
    |
    └── students.division_id (many students per division)
```

---

## 8. Excel Column Mapping

When an Excel file is uploaded, these are the expected column headers. The parser accepts any casing and ignores extra spaces.

| Expected Column Header | Maps to DB Column | Required? |
|---|---|---|
| PRN / PRN Number / prn_number | `prn_number` | YES |
| Full Name / Name / full_name | `full_name` | YES |
| Gender / gender | `gender` | YES |
| Division / division | looked up in `divisions.name` | YES |
| Roll No / Roll Number / roll_no | `roll_number` | YES |
| Category / category | `category` | YES |
| Student Mobile / student_mobile | `student_mobile` | YES |
| Father Mobile / Father's Mobile | `father_mobile` | YES |
| Mother Mobile / Mother's Mobile | `mother_mobile` | YES |
| Address / address | `address` | NO |
| Fees Status / fees_status | `fees_status` | NO (default: Unpaid) |
| Scholarship / Scholarship Status | `scholarship_status` | NO (default: Not Availed) |
| Hostel Status / hostel_status | `hostel_status` | NO (default: Day Scholar) |
| Hostel Fees / hostel_fees | `hostel_fees` | NO (default: 0) |
| APAAR ID / apaar_id | `apaar_id` | NO |
| Sem1 Attendance / sem1_attendance | `sem1_attendance` | NO |
| Sem2 Attendance / sem2_attendance | `sem2_attendance` | NO |
| Sem1 SGPA / sem1_sgpa | `sgpa_sem1` | NO |
| Sem2 SGPA / sem2_sgpa | `sgpa_sem2` | NO |

---

## 9. Validation Rules Per Field

These rules are enforced in `excelParser.ts` and also in the API route for manual student creation.

| Field | Rule |
|---|---|
| `full_name` | Non-empty after trimming |
| `prn_number` | Non-empty after trimming; must be unique |
| `gender` | Must be "Boy" or "Girl" (case-insensitive) |
| `category` | Must be "Open", "OBC", or "SC" (case-insensitive) |
| `roll_number` | Must be a positive integer; unique within division |
| `division` | Must match an existing active division name (case-insensitive) |
| `student_mobile` | After stripping spaces, dashes, +91: exactly 10 digits |
| `father_mobile` | Same as above |
| `mother_mobile` | Same as above |
| `fees_status` | If provided: "Paid", "Unpaid", or "Partial" (case-insensitive) |
| `scholarship_status` | If provided: "Availed" or "Not Availed" (case-insensitive) |
| `hostel_status` | If provided: "Hosteller" or "Day Scholar" (case-insensitive) |
| `hostel_fees` | If provided: must be a non-negative number |
| `sem1_attendance` | If provided: 0–100 |
| `sem2_attendance` | If provided: 0–100 |
| `apaar_id` | If provided: must be unique |
