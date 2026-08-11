/**
 * TypeScript Type Definitions
 * College Student Information Management System — ClassFolio
 *
 * All types derived from database.md schema.
 * This is the single source of truth for all TypeScript types in the app.
 */

// ============================================================
// Enum Types (from database.md constraints + constants.ts)
// ============================================================

import { CATEGORY_OPTIONS, BRANCH_OPTIONS } from '@/lib/constants';

/** User role — enforced by CHECK constraint on profiles.role */
export type UserRole = 'hod' | 'faculty';

/** Student gender — enforced by CHECK constraint on students.gender */
export type Gender = 'Boy' | 'Girl';

/** Student category — enforced by CHECK constraint on students.category */
export type Category = typeof CATEGORY_OPTIONS[number];

/** Student branch — enforced by CHECK constraint on students.branch */
export type Branch = typeof BRANCH_OPTIONS[number];

/** Fees payment status — enforced by CHECK constraint on students.fees_status */
export type FeesStatus = 'Paid' | 'Unpaid' | 'Partial';

/** Scholarship status — enforced by CHECK constraint on students.scholarship_status */
export type ScholarshipStatus = 'Availed' | 'Not Availed';

/** Hostel status — enforced by CHECK constraint on students.hostel_status */
export type HostelStatus = 'Hosteller' | 'Day Scholar';

/** Student active/withdrawn status — enforced by CHECK constraint on students.status */
export type StudentStatus = 'Active' | 'Withdrawn';

/** Upload file outcome — enforced by CHECK constraint on uploaded_files.status */
export type UploadFileStatus = 'committed' | 'rejected';

/** Attendance status — enforced by CHECK constraint on attendance_records.status */
export type AttendanceStatus = 'Present' | 'Absent';

/** Dynamic fees payment status — enforced by CHECK constraint on student_fees.payment_status */
export type DynamicFeesStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';

// ============================================================
// Database Row Types (match exactly to database.md schemas)
// ============================================================

/**
 * Profile — one row per registered user (database.md §2)
 * Linked to Supabase Auth's auth.users table via id (UUID).
 */
export interface Profile {
  id: string;                // UUID, references auth.users(id)
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;        // ISO 8601 timestamp
}

/**
 * Division — class divisions (database.md §3)
 * HOD can add, rename, or deactivate divisions.
 */
export interface Division {
  id: number;                // SERIAL PRIMARY KEY
  name: string;              // e.g., 'Division A' — unique
  is_active: boolean;
  created_at: string;        // ISO 8601 timestamp
}

/**
 * Student — one row per student (database.md §4)
 * The core table of the application.
 *
 * Note: yearly_attendance is NOT stored — it is always computed as
 * (sem1_attendance + sem2_attendance) / 2 in the application (Rule 11).
 */
export interface Student {
  // Primary key
  id: number;                  // SERIAL PRIMARY KEY

  // Identity
  full_name: string;
  gender: Gender;
  category: Category;
  branch: Branch;

  // Official IDs
  prn_number: string;          // globally unique
  cprn_number: string | null;  // unique when provided
  apaar_id: string | null;     // unique when provided, NULL if not available

  // Enrollment
  division_id: number;         // references divisions(id)
  roll_number: number;         // unique within division (not globally)

  // Contact
  student_mobile: string;      // 10 digits after cleaning
  father_mobile: string;       // 10 digits after cleaning
  mother_mobile: string;       // 10 digits after cleaning
  address: string | null;

  // Financial / Administrative
  fees_status: FeesStatus;
  scholarship_status: ScholarshipStatus;
  hostel_status: HostelStatus;
  hostel_fees: number;         // NUMERIC(10,2), 0 for day scholars

  // Attendance (simple: two fields only)
  sem1_attendance: number | null;  // NUMERIC(5,2), 0–100, null if not yet entered
  sem2_attendance: number | null;  // NUMERIC(5,2), 0–100, null if not yet entered

  // Results (split into two semesters — null means not yet recorded)
  sgpa_sem1: string | null;    // free text, e.g. '7.8', 'Detained', 'ATKT' — null if not entered
  sgpa_sem2: string | null;    // free text — null if not entered

  // Soft Delete
  status: StudentStatus;

  // Metadata
  created_at: string;          // ISO 8601 timestamp
  updated_at: string;          // ISO 8601 timestamp, auto-updated via trigger
  updated_by: string | null;   // UUID references profiles(id), who last edited
}

/**
 * Uploaded File — audit log of Excel uploads (database.md §5)
 * Tracks every file uploaded; original file stored in Supabase Storage.
 */
export interface UploadedFile {
  id: number;                  // SERIAL PRIMARY KEY
  uploaded_by: string;         // UUID references profiles(id)
  file_name: string;
  storage_path: string;        // path in Supabase Storage bucket
  row_count: number;           // total rows processed
  success_count: number;
  failed_count: number;
  status: UploadFileStatus;
  uploaded_at: string;         // ISO 8601 timestamp
}

/** Daily Attendance Record */
export interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  status: AttendanceStatus;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Dynamic Fee Record */
export interface StudentFee {
  id: number;
  student_id: number;
  academic_year: string | null;
  semester: string | null;
  base_fee: number;
  scholarship_type: string | null;
  scholarship_percentage: number | null;
  scholarship_amount: number;
  applicable_fee: number;
  amount_paid: number;
  remaining_amount: number;
  payment_status: DynamicFeesStatus | null;
  payment_date: string | null;
  receipt_reference: string | null;
  remarks: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Entrance and Academic Score */
export interface EntranceScore {
  id: number;
  student_id: number;
  pcm_physics: number | null;
  pcm_chemistry: number | null;
  pcm_maths: number | null;
  pcm_total: number | null;
  jee_score: number | null;
  jee_percentile: number | null;
  jee_rank: number | null;
  cet_score: number | null;
  cet_percentile: number | null;
  cet_rank: number | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Student with Division (joined query result)
// ============================================================

/** Student row joined with its division name — used in list views */
export interface StudentWithDivision extends Student {
  division: Pick<Division, 'name'>;
}

// ============================================================
// Form Data Types (for creating/editing records)
// ============================================================

/**
 * Data shape for creating a new student via the form or API.
 * All required fields must be present; optional fields have defaults in the DB.
 */
export interface StudentFormData {
  full_name: string;
  gender: Gender;
  category: Category;
  branch: Branch;
  prn_number: string;
  cprn_number?: string;
  apaar_id?: string;
  division_id: number;
  roll_number: number;
  student_mobile: string;
  father_mobile: string;
  mother_mobile: string;
  address?: string;
  fees_status?: FeesStatus;
  scholarship_status?: ScholarshipStatus;
  hostel_status?: HostelStatus;
  hostel_fees?: number;
  sem1_attendance?: number;
  sem2_attendance?: number;
  sgpa_sem1?: string;
  sgpa_sem2?: string;
}

/**
 * Data shape for updating an existing student.
 * All fields are optional — only provided fields are updated.
 */
export interface StudentUpdateData {
  full_name?: string;
  gender?: Gender;
  category?: Category;
  branch?: Branch;
  prn_number?: string;
  cprn_number?: string | null;
  apaar_id?: string | null;
  division_id?: number;
  roll_number?: number;
  student_mobile?: string;
  father_mobile?: string;
  mother_mobile?: string;
  address?: string | null;
  fees_status?: FeesStatus;
  scholarship_status?: ScholarshipStatus;
  hostel_status?: HostelStatus;
  hostel_fees?: number;
  sem1_attendance?: number | null;
  sem2_attendance?: number | null;
  sgpa_sem1?: string | null;
  sgpa_sem2?: string | null;
  status?: StudentStatus;
  updated_by?: string;
}

/** Data shape for creating a new division (HOD only) */
export interface DivisionFormData {
  name: string;
}

/** Data shape for faculty registration form */
export interface RegisterFormData {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  registration_code: string;
}

/** Data shape for login form */
export interface LoginFormData {
  email: string;
  password: string;
}

// ============================================================
// API Response Types
// ============================================================

/** Generic API error response */
export interface ApiError {
  error: string;
}

/** Generic API success response with data */
export interface ApiResponse<T> {
  data: T;
}

// ============================================================
// Excel Upload Types (phases.md §Phase 5)
// ============================================================

/** A single row from the Excel file after parsing and validation */
export interface ExcelStudentRow {
  row_number: number;          // 1-indexed row in the original file
  data: StudentFormData;
}

/** Error for a single row that failed validation */
export interface RowError {
  row_number: number;
  field: string;
  message: string;
}

/** Dry-run result returned from the upload endpoint */
export interface DryRunResult {
  valid: ExcelStudentRow[];
  errors: RowError[];
  total_rows: number;
}

/** Commit result returned from the upload endpoint */
export interface CommitResult {
  inserted: number;
  skipped: number;
}

// ============================================================
// Dashboard Types (phases.md §Phase 4)
// ============================================================

/** Stats for the HOD dashboard */
export interface HODDashboardStats {
  total_students: number;
  fees_paid: number;
  fees_unpaid: number;
  fees_partial: number;
  scholarship_availed: number;
  hostellers: number;
  divisions: DivisionStats[];
  teachers: TeacherInfo[];
}

/** Per-division stats for the HOD dashboard bar chart */
export interface DivisionStats {
  division_id: number;
  division_name: string;
  student_count: number;
  avg_attendance: number | null;
}

/** Teacher info for the HOD dashboard teacher list */
export interface TeacherInfo {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

/** Stats for the Faculty dashboard */
export interface FacultyDashboardStats {
  total_students: number;
  total_divisions: number;
  uploaded_today: number;
}
