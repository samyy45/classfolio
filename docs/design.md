# Design & UI/UX Blueprint
# College Student Information Management System
# Version: 1.0

---

## 1. Design Philosophy

**Government-style, not startup-style.** This is a functional tool for daily professional use. The design priorities are:

1. **Clarity** — Every action is obvious without training
2. **Speed** — A teacher should be able to find and update a student record in under 30 seconds
3. **Mobile-first** — Many teachers will use this on their phone between classes
4. **No decorative elements** — No animations, no gradients, no icons that don't add meaning
5. **Consistent** — The same button does the same thing on every page

---

## 2. Visual Style

| Property | Value |
|---|---|
| Color scheme | Light background, dark text (light mode only — no dark mode) |
| Primary color | A calm blue (`#2563EB`) for buttons and active states |
| Danger color | Red (`#DC2626`) for withdraw/delete actions only |
| Success color | Green (`#16A34A`) for Paid status, active badges |
| Warning color | Amber (`#D97706`) for Partial fees, low attendance |
| Background | `#F9FAFB` (near white) |
| Card background | `#FFFFFF` |
| Text primary | `#111827` |
| Text secondary | `#6B7280` |
| Border | `#E5E7EB` |
| Font | System font stack (no Google Fonts — faster to load): `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| Border radius | `8px` for cards, `6px` for buttons and inputs |

---

## 3. Layout: Desktop vs Mobile

### Desktop (≥ 768px wide)
- Sidebar on the left (fixed, 240px wide) with navigation links
- Main content area fills the rest
- Student list: table layout
- Student modal: centered overlay, 600px wide

### Mobile (< 768px wide)
- No sidebar — replaced by a bottom navigation bar (like a phone app)
- Bottom bar icons: Home, Students, Upload, Profile
- Student list: card layout (one card per student, stacked vertically)
- Student detail: full-screen page (not a modal)
- All buttons: full-width, minimum 44px tall (thumb-friendly)

---

## 4. Page: Login (`/login`)

**Layout:** Centered card, white background, subtle border

**Contents:**
- App name/logo at the top
- Two-tab toggle: **Faculty** | **HOD** — switching tabs changes the subtitle only (both use the same login form)
- Email input field
- Password input field with show/hide toggle
- "Sign In" button (full width, primary blue)
- Below button (Faculty tab only): "Don't have an account? Register"
- Small note: "Authorized personnel only."

**Behavior:**
- On submit: show loading spinner inside the button, disable the button
- On error: show a red error message below the button ("Invalid credentials" or "Account not found")
- On success: redirect to dashboard
- Auto-login: if a valid session exists, skip this page and redirect directly to dashboard

---

## 5. Page: Register (`/register`) — Faculty Only

**Layout:** Same centered card as login

**Contents:**
- "Create Faculty Account" heading
- Full Name input
- College Email input
- Password input (with show/hide)
- Confirm Password input
- Faculty Registration Code input (labeled "Staff Registration Code" — do not explain what it is on the page; teachers already know it)
- "Create Account" button (full width)
- "Already registered? Sign In" link

**Behavior:**
- All fields required
- Password must be at least 8 characters
- Passwords must match
- If Registration Code is wrong: "Invalid staff code. Please contact your HOD."
- On success: redirect to faculty dashboard immediately

---

## 6. Page: Faculty Dashboard (`/dashboard`)

**Layout:** Sidebar + content area (desktop) / Bottom nav (mobile)

**Sidebar links:** Dashboard, Students, Upload Excel, Logout

**Content area:**
- Heading: "Welcome, [Teacher Name]"
- 3 stat cards in a row (stacked on mobile):
  - "Total Students" — count of all active students
  - "Divisions" — count of active divisions
  - "Uploaded Today" — count of students added today
- "Quick Actions" section:
  - Button: "View All Students"
  - Button: "Add Student Manually"
  - Button: "Upload Excel"

---

## 7. Page: HOD Dashboard (`/hod/dashboard`)

**Layout:** Sidebar + content area (desktop) / Bottom nav (mobile)

**Sidebar links:** Dashboard, Teachers, Students, Upload Excel, Logout

**Content area:**
- Heading: "HOD Command Center"
- Row 1: 3 stat cards:
  - "Total Students" (all active)
  - "Fees Paid" (count + percentage, green)
  - "Fees Unpaid" (count + percentage, red/amber)
- Row 2: 2 sections side by side (stacked on mobile):
  - **Financial Overview**: Simple donut chart — Paid % vs Unpaid %. Below it: count of Scholarship students and Hostellers
  - **Attendance by Division**: Simple horizontal bar chart — one bar per division, showing average attendance %. Color: green if ≥75%, amber if 60–75%, red if <60%
- Row 3: "Division Management"
  - List of all divisions with student count each
  - "+ Add Division" button (opens a small inline form: Division Name + Branch)
- Row 4: "Registered Teachers"
  - Simple table: Name | Email | Joined Date
  - No actions — view only

---

## 8. Page: Students List (`/students`)

**Layout:** Full page with filters at top, list below

**Filters bar (horizontal, wraps on mobile):**
- Division filter: dropdown (All Divisions | Div A | Div B | ...)
- Status filter: toggle (Active | Withdrawn) — default: Active
- Sort by: Roll Number (default) | Name

**Search bar:**
- Placed above the filters or inline with them
- Searches by name, PRN, or roll number
- Case-insensitive, partial match
- Results update as the user types (debounced 300ms)

**Desktop: Table layout**
| Roll No | Name | Division | PRN | Fees | Attendance | Actions |
|---|---|---|---|---|---|---|
| 1 | Rahul Patil | Div A | 2025CS001 | Paid ✓ | 85% / 88% | View |
| 2 | Priya Desai | Div A | 2025CS002 | Unpaid ✗ | 72% / 69% | View |

- Attendance column shows "Sem1% / Sem2%"
- Fees shown as a colored badge (Paid = green, Unpaid = red, Partial = amber)
- "View" button opens the student detail modal

**Mobile: Card layout**
```
┌─────────────────────────────┐
│ Roll 1 — Div A              │
│ Rahul Patil          [View] │
│ PRN: 2025CS001              │
│ Fees: Paid ✓                │
└─────────────────────────────┘
```

**Empty state:** "No students found. Try changing your filters or add a student."

---

## 9. Component: Student Detail Modal / Page

On desktop: a centered modal overlay with a close button (×)
On mobile: a full-screen page (navigated to, with a back button)

**Header:**
- Student name (large text)
- Active / Withdrawn badge
- Division + Roll Number subtitle
- "Edit" button (top right)

**Three tabs:**

### Tab 1: Academic & Identity
- PRN Number (read-only display box)
- APAAR ID (read-only display box, or "Not provided" if empty)
- Branch
- Division + Roll Number
- Category (Open / OBC / SC)
- Gender
- Results / SGPA

### Tab 2: Attendance
- Simple 2-row table:

| | Sem 1 | Sem 2 |
|---|---|---|
| Attendance | 85% | 88% |

- Below the table: **Yearly Attendance: 86.5%** (calculated, displayed in large text)
- Color coding: ≥75% = green, 60–74% = amber, <60% = red

### Tab 3: Financials & Contact
- Financial Summary section:
  - Fees Status (colored badge)
  - Scholarship Status
  - Hostel Status + Hostel Fees (shown only if Hosteller)
- Contact Details section:
  - Student Mobile (click-to-call on mobile: `tel:` link)
  - Father's Mobile (click-to-call)
  - Mother's Mobile (click-to-call)
  - Address

**Action buttons at bottom:**
- "Edit Student" — opens the edit form (same modal, form mode)
- "Mark as Withdrawn" — red button, triggers confirmation dialog (Rules.md §14)

---

## 10. Component: Edit Student Form

Same tabbed layout as the detail view, but all fields become editable inputs. Key behaviors:
- Dropdowns for: Gender, Category, Division, Fees Status, Scholarship Status, Hostel Status
- Number inputs (0–100) for attendance
- Phone number fields: formatted as plain text, cleaning applied on submit (not on typing)
- "Save Changes" button (primary blue) and "Cancel" button
- On save: loading state on button, success toast "Student updated", modal closes
- On error: error message inline

---

## 11. Page: Add Student (`/students/new`)

Same form as Edit Student, all fields blank. Required fields marked with *.
- "Add Student" button
- "Cancel" link back to students list

---

## 12. Page: Excel Upload (`/upload`)

**Stage 1 — File Selection:**
- Page heading: "Upload Student Data"
- Instruction text: "Upload a .xlsx or .csv file. Download the template below if needed."
- "Download Template" link (downloads a sample .xlsx with correct headers)
- Large drag-and-drop zone with dashed border: "Drag & Drop Excel File Here"
- "Or Browse Files" button below it
- Accepted formats listed: .xlsx, .csv
- Maximum file size: 50MB

**Stage 2 — Dry Run Report (shown after file is selected):**
- Progress bar and status: "Validating 245 rows..."
- Summary bar: "240 rows valid ✓ | 5 rows have errors ✗"
- Error table (only shows rows with errors):

| Row | Field | Issue |
|---|---|---|
| 12 | PRN Number | Already exists in the database |
| 34 | student_mobile | Must be 10 digits — received "9876" |
| 45 | Division | "Div D" not found — check division name |

- Two buttons:
  - "Cancel" — clears the file, back to Stage 1
  - "Commit Valid Rows (240)" — **only enabled if 0 errors exist** (if any errors exist, this button is disabled and shows "Fix errors to proceed")

**Stage 3 — Success:**
- Green banner: "240 students successfully added."
- "View Students" button

---

## 13. Page: HOD Teachers View (`/hod/teachers`)

- Table of all registered faculty:

| Name | Email | Joined |
|---|---|---|
| Prof. Sharma | sharma@college.edu | 12 Jul 2025 |
| Dr. Patil | patil@college.edu | 8 Jul 2025 |

- No actions — read-only
- HOD cannot delete teacher accounts from the UI; if needed, deactivation is done from the Supabase Auth dashboard

---

## 14. Global Components

### Navigation Sidebar (Desktop)
- App name at the top
- Navigation links with an active state highlight
- User name and role at the bottom
- Logout link at the bottom

### Bottom Navigation (Mobile)
- 4 icons: Home | Students | Upload | Profile
- Active tab highlighted in primary blue

### Toast Notifications
- Appear at the bottom-right (desktop) or bottom-center (mobile)
- Auto-dismiss after 4 seconds
- Green for success, Red for error
- Maximum one visible at a time

### Loading States
- Any button that triggers a server action shows a spinner and is disabled while waiting
- List pages show a subtle "Loading..." skeleton of the table/cards while data loads

### Confirmation Dialog
- Used for: "Mark as Withdrawn" only
- Simple modal: Title | Message | Cancel | Confirm (red)

---

## 15. Responsive Breakpoints

| Breakpoint | Width | Layout Mode |
|---|---|---|
| Mobile | < 768px | Card layout, bottom nav, full-screen detail |
| Desktop | ≥ 768px | Table layout, sidebar nav, modal detail |

No intermediate breakpoints — two clean modes only.

---

## 16. Accessibility Basics

- All inputs have visible labels (not just placeholder text)
- Error messages are associated with their input via `aria-describedby`
- Buttons have meaningful text (not just icons)
- Minimum touch target size: 44×44px for all clickable elements on mobile
- Tab order is logical — follows visual top-to-bottom, left-to-right order

## 0. Visual Design System
### Colors
- Sidebar background: #1E1E2E (dark navy)
- Sidebar text: #A0A0B0 (muted), #FFFFFF (active)
- Sidebar active item: #4F46E5 (indigo highlight)
- Main content background: #F8F9FA (off-white)
- Card background: #FFFFFF
- Primary button: #4F46E5 (indigo)
- Primary button hover: #4338CA
- Top bar background: #FFFFFF
- Border color: #E5E7EB
- Text primary: #111827
- Text secondary: #6B7280

### Status Badge Colors
- Active / Paid: green (#16A34A background #DCFCE7)
- Withdrawn / Unpaid: red (#DC2626 background #FEE2E2)
- Partial: amber (#D97706 background #FEF3C7)
- Availed: blue (#2563EB background #DBEAFE)

### Typography
- Font: Inter (import from Google Fonts)
- Page heading: 24px, weight 700
- Section heading: 18px, weight 600
- Card label: 12px, weight 500, uppercase, letter-spacing
- Body text: 14px, weight 400
- Stat number (dashboard): 32px, weight 700


