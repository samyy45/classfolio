# ClassFolio Application Changes Summary

This document outlines the major updates, newly developed features, and structural database modifications applied to the base **ClassFolio** project repository.

---

## 1. Feature Additions

### 📅 Live Attendance Roll Call (`/class-attendance`)
* **Grid-Based Roll Call System**: Created a visual grid representing students by their roll numbers (e.g. 1 to 74). Faculty can quickly tap individual circles to toggle status between **Present** (Green) and **Absent** (White/Gray).
* **Live Counter**: A floating status bar updates in real time showing the number of present students vs. the total (e.g., `Present: 45 / Total: 74`).
* **Extract Data Feature**: Faculty and HODs can extract roll call data using the "Extract Data" button. It provides a visual Pie Chart summary and an **Export to Excel** option that neatly lists Present and Absent students with their roll numbers and names.
* **Unsaved Changes Warning**: Standard browser guards block navigation if unsaved attendance changes exist in the grid.
* **Auto-Loading**: Selecting a Division, Date, and Period (Morning Session/Afternoon Session) dynamically queries the database for existing records, restoring grid state instantly.
* **Date Restrictions**: Attendance strictly limits date selection up to the current day, preventing future dates from being recorded.

### 🔒 HOD Holiday Management (`HOD Role Only`)
* **Mark as Holiday Toggle**: The HOD now has an exclusive button on the Attendance screen to manually mark the selected date as a holiday.
* **Default Holiday Rules**: Saturdays (1st & 3rd of the month) and all Sundays are automatically locked down as default holidays.
* **Lockdown Action**: When a holiday is active, a red alert banner notifies the user, the roll call grid dims, and the "Save" action is disabled for all faculty.

### 📊 Dynamic Profile Attendance Pie Chart
* The Student Profile view was updated to replace static placeholder metrics with a real-time attendance pie chart.
* Calculates exact attendance percentages using green (Present) and red (Absent) sections, dynamically querying individual attendance logs from the database.

---

## 2. Technical Implementation & Files

### 🆕 New Files Added
* **`app/(faculty)/class-attendance/page.tsx`**: Main page for marking attendance with the roll call grid, live stats, and HOD controls.
* **`app/api/attendance/roster/route.ts`**: Fetches the division-sorted roster of students.
* **`app/api/attendance/session/route.ts`**: API to retrieve existing attendance records or perform transactional updates to class sessions.
* **`components/DivisionFilter.tsx`**: Client-side dropdown selector component pulling divisions dynamically.
* **`supabase/migrations/add_class_attendance.sql`**: Database schema migration introducing the tables `attendance_sessions` and `attendance_records` (replacing the previous schema).

### 🛠️ Key Modified Files
* **`app/api/students/[id]/route.ts`**: Refactored database query routines to join attendance records with session dates to compute metrics for individual students.
* **`app/(faculty)/students/[id]/page.tsx`**: Reconstructed student profile page to process the new API shape and render the green/red chart accurately across both desktop and mobile viewports.
* **`Global Nav Links (Multiple Files)`**: Updated sidebars and bottom navigation grids inside `app/(faculty)/**/page.tsx` and `app/hod/**/page.tsx` to show the **Attendance** page icon (`UserCheck`) for all authenticated user roles.

---

## 3. Database Schema Layout

The attendance system uses a clean relational structure designed to avoid duplication:

```
                  ┌───────────────────────┐
                  │  attendance_sessions   │
                  │ ───────────────────── │
                  │  id (UUID)            │◄─────┐
                  │  division_id (FK)     │      │
                  │  session_date (DATE)  │      │ FK
                  │  period_label (TEXT)  │      │
                  └───────────────────────┘      │
                              │                  │
                              │ 1                │
                              │                  │
                              ▼ N                │
                  ┌───────────────────────┐      │
                  │  attendance_records   │──────┘
                  │ ───────────────────── │
                  │  id (UUID)            │
                  │  session_id (FK)      │
                  │  student_id (FK)      │
                  │  status (Present/Abs) │
                  └───────────────────────┘
```
