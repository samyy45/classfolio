# PRD — Product Requirements Document
# College Student Information Management System
# Version: 1.0 | Status: Final for Development

---

## 1. What This App Is

A simple, reliable, internal web application for college faculty to manage first-year student records. It replaces manual Excel tracking with a centralized database. It works on mobile and desktop. It must be completely bug-free — not feature-rich.

**App Name:** To be decided (placeholder: "StudentDesk")
**Target Users:** HOD (1 person) + Faculty/Teachers (multiple)
**Target Students:** First-year students only
**Deployment:** Web — accessible from any browser on mobile or desktop

---

## 2. Who Uses This App

### 2.1 HOD (Head of Department)
- Logs in with a single pre-configured email and password
- No registration — account exists from day one (seeded in the database)
- Can see the main dashboard with student stats and charts
- Can upload bulk student data via Excel
- Can see which teachers have registered and are active
- Can view and edit all student records
- Can add or remove divisions/classes

### 2.2 Faculty / Teacher
- Registers with their college email, a password they choose, and the secret Faculty Registration Code
- After registration, they are immediately active — no approval wait
- Stays logged in via persistent session (auto-login when they return to the app)
- Can view all student records across all divisions
- Can add a new student manually
- Can edit any student's details
- Can upload student data via Excel (if HOD grants this — see §5.1)
- Cannot access HOD-only views (dashboard analytics, teacher list)

---

## 3. Authentication Model

### 3.1 Faculty Registration
- Faculty goes to the Register page
- Fills in: Full Name, College Email, Password, Faculty Registration Code
- The Faculty Registration Code is a secret word/phrase decided before launch (e.g., `CSESTAFF2025`) — given to teachers offline
- If the code is wrong → registration is rejected with a clear error
- If the code is correct → account is created and the teacher is logged in immediately
- Session persists — when they close and reopen the browser, they are still logged in (no need to re-enter password every time)

### 3.2 HOD Login
- HOD goes directly to the Login page (no registration)
- Logs in with a pre-set email and password configured at deployment
- HOD account is seeded into the database before launch — not created through the UI

### 3.3 What "Auto Login" Means
- After a successful login or registration, a session token is saved in the browser
- When the user returns to the app, the app checks for a valid token and logs them in silently
- Session expires after 30 days of inactivity — after that, they log in once again

---

## 4. Core Features

### 4.1 Student Record Management
Every teacher and HOD can:
- View all students across all divisions
- Search for a student by name, PRN, or roll number
- Open a student's full profile
- Edit any field in a student's profile
- Add a new student manually
- Mark a student as "Withdrawn" (soft delete — record kept, student hidden from default view)

### 4.2 Division / Class Management
- Students belong to a Division (e.g., Div A, Div B, Div C)
- HOD can add a new division from the HOD dashboard
- HOD can rename or deactivate a division
- When browsing, faculty can filter students by Division
- Within a division, students are sorted by Roll Number

### 4.3 Attendance Tracking
Simple model — two attendance fields per student:
- Semester 1 Attendance (percentage, e.g., 85)
- Semester 2 Attendance (percentage, e.g., 90)
- Yearly Attendance is auto-calculated: average of Sem 1 and Sem 2

In addition to this static record, there is a **Live Roll Call** system:
- Attendance is recorded twice a day: **Morning Session** and **Afternoon Session**.
- **Holiday System**: Sundays and 1st/3rd Saturdays are automatically locked. HOD can manually mark other days as holidays to prevent records.
- **Export Data**: Administrators can extract a live report of any session via an "Extract Data" modal, providing a visual Pie Chart and an Excel export that organizes students by Present/Absent status.

### 4.4 Bulk Excel Upload
- HOD (and optionally teachers) can upload an Excel file to bulk-add students
- The system validates every row before committing anything
- Validation is tolerant of common human mistakes:
  - Column headers are matched case-insensitively (e.g., "PRN Number", "prn number", "PRN NUMBER" all work)
  - Leading and trailing spaces in values are stripped automatically
  - Phone numbers are cleaned (spaces, dashes, +91 prefix removed before validation)
- A "Dry Run" preview shows which rows will succeed and which will fail — with the exact reason per row
- Only after the user clicks "Confirm Upload" does data get written to the database
- If even one row fails validation, the entire batch is rejected — nothing is saved partially
- The original Excel file is stored (not deleted) after upload for audit purposes

### 4.5 HOD Dashboard
HOD sees a simple overview page with:
- Total student count
- Count of students with Fees Paid vs. Fees Unpaid
- Count of students on Scholarship
- Count of students in Hostel
- Attendance overview (average attendance per division)
- List of registered teachers (name, email, when they joined)
- Option to add a new Division

No complex charts — clean number cards and a simple bar chart for fees/attendance are enough.

### 4.6 Faculty Dashboard
When a teacher logs in, they see:
- Quick stats: total students they can see, count by division
- Quick links: View Students, Add Student, Upload Excel

---

## 5. Student Data Model

Each student record contains exactly these fields and nothing more:

| Field | Type | Notes |
|---|---|---|
| Full Name | Text | Required |
| Gender | Choice | Boy / Girl |
| Roll Number | Number | Unique within a Division |
| Division | Relation | Links to the Division table |
| Branch | Text | e.g., Computer Engineering |
| PRN Number | Text | Unique across all students |
| APAAR ID | Text | Unique, optional at entry |
| Category | Choice | Open / OBC / SC |
| Student Mobile | Text | 10-digit, validated |
| Father's Mobile | Text | 10-digit, validated |
| Mother's Mobile | Text | 10-digit, validated |
| Address | Long Text | Free-form |
| Fees Status | Choice | Paid / Unpaid / Partial |
| Scholarship Status | Choice | Availed / Not Availed |
| Hostel Status | Choice | Hosteller / Day Scholar |
| Hostel Fees | Number | Only relevant if Hosteller |
| Sem 1 Attendance | Number (%) | 0–100 |
| Sem 2 Attendance | Number (%) | 0–100 |
| Results / SGPA | Text | Free text — e.g., "7.8" or "Pass" |
| Status | Choice | Active / Withdrawn — default Active |

**Yearly Attendance** is not stored — it is always computed as `(Sem1 + Sem2) / 2` when displayed.

---

## 6. What This App Does NOT Do

To keep the app simple and bug-free, these are explicitly out of scope:

- No per-lecture attendance tracking
- No monthly attendance breakdown
- No parent/student login
- No SMS or email notifications
- No exam timetable or scheduling
- No multi-year / batch history (first-year only)
- No assigning class teachers to specific divisions
- No complex analytics — just basic number cards
- No document uploads (admit cards, marksheets)
- No multi-department support (single department only)

---

## 7. Acceptance Criteria (How We Know It Works)

- A teacher can register, close the browser, reopen it, and be already logged in
- Uploading an Excel file with one invalid row rejects the whole file and shows which row failed and why
- Uploading the same Excel file twice does not create duplicate students (PRN is the deduplication key)
- Searching "rahul" finds students named "Rahul", "RAHUL", "rahul kumar" — case-insensitive
- A student marked as Withdrawn disappears from the default list but can be found via a "Show Withdrawn" filter
- All pages display correctly on a 375px wide mobile screen (iPhone SE size) and a 1280px wide desktop
- Yearly attendance auto-calculates without the teacher doing any math