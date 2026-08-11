# Implementation Phases
# College Student Information Management System
# Version: 1.0

---

## How to Use This File

Build the phases in order. Do not skip ahead. Each phase produces something testable before the next one starts. If the AI assistant is given this project, give it one phase at a time — not all at once.

When vibe coding with an AI: complete a phase, test it manually, confirm it works, then move to the next phase. This prevents bugs from one phase silently breaking the next.

---

## Phase 0: Project Setup and Configuration
**Time estimate: 1-2 hours | No UI yet**

### What to do:
1. Create a new Next.js 14 project with App Router and TypeScript:
   ```
   npx create-next-app@latest student-desk --typescript --tailwind --app
   ```
2. Install required packages:
   ```
   npm install @supabase/supabase-js @supabase/ssr xlsx rate-limiter-flexible
   ```
3. Create a Supabase project at supabase.com (Singapore region)
4. Copy project URL and anon key into `.env.local`
5. Copy service role key into `.env.local`
6. Set `FACULTY_REGISTRATION_CODE` in `.env.local` to your chosen code
7. Create `.gitignore` and add `.env.local` to it
8. Create the folder structure defined in `architecture.md §3`
9. Create `/lib/supabaseClient.ts` (browser client) and `/lib/supabaseServer.ts` (server client)
10. Run the database schema from `database.md` in Supabase's SQL Editor — all 4 tables + indexes + trigger
11. Run the seed data: divisions (A, B, C) and the HOD account

### How to test:
- Run `npm run dev` — no errors in the terminal
- Open the Supabase dashboard → Tables — confirm all 4 tables exist
- Confirm the HOD profile row exists in the `profiles` table

---

## Phase 1: Authentication — Login, Register, Auto-Login
**Time estimate: 3-5 hours | First working UI**

### What to build:
1. `/app/(auth)/login/page.tsx` — Faculty/HOD tab toggle, email + password form
2. `/app/(auth)/register/page.tsx` — Full Name, Email, Password, Confirm Password, Registration Code
3. `/app/api/auth/register/route.ts` — validate code, create Supabase Auth user, insert `profiles` row
4. `/middleware.ts` — redirect unauthenticated users to `/login`, redirect HOD to `/hod/dashboard`, redirect Faculty to `/dashboard`
5. `/lib/auth.ts` — helper functions: `getSessionUser()`, `getUserProfile()`, `isHOD()`
6. Add rate limiting to the login and register API routes (security.md §4)

### What auto-login means in practice:
- Supabase's client handles this — if you call `supabase.auth.getUser()` and the token is still valid, it returns the user automatically
- In `middleware.ts`, check if a session exists. If yes, skip login page and go straight to dashboard
- No extra code needed beyond what Supabase provides

### How to test:
- Register a new teacher account → you should be redirected to `/dashboard` (blank page is fine at this stage)
- Close the browser tab, reopen it, go to the app URL → you should be on `/dashboard` still (auto-login works)
- Open an incognito tab, go to `/dashboard` → you should be redirected to `/login` (protection works)
- Try to go to `/hod/dashboard` as a teacher → should be redirected to `/dashboard`
- Log in as HOD → should go to `/hod/dashboard`

---

## Phase 2: Division Management and Student CRUD API
**Time estimate: 4-6 hours | API layer, no full UI yet**

### What to build:
1. `/app/api/divisions/route.ts` — GET all active divisions, POST new division (HOD only)
2. `/app/api/students/route.ts` — GET all students (with filters: division, status, search), POST new student
3. `/app/api/students/[id]/route.ts` — GET one student, PATCH student, PATCH status to Withdrawn
4. `/lib/validators.ts` — all validation functions from `database.md §9`
5. TypeScript types in `/types/index.ts` — `Student`, `Division`, `Profile`, `StudentFormData`

### Validation to implement in the API routes:
- Every PATCH and POST calls the validators from `validators.ts` before touching the database
- Phone numbers are cleaned before validation (rules.md §7)
- PRN uniqueness is checked before insert
- Roll number uniqueness within a division is enforced by the database constraint (let the DB throw the error, catch it, and return a readable message)

### How to test (use a tool like Postman, or just write quick fetch calls in the browser console):
- `GET /api/students` → returns empty array (no students yet)
- `POST /api/students` with a valid student body → returns the created student
- `POST /api/students` with the same PRN again → returns an error "PRN already exists"
- `POST /api/students` with a phone number "+91 98765-43210" → should be accepted (cleaned automatically)
- `PATCH /api/students/[id]` with `{ status: 'Withdrawn' }` → student status changes
- Try any of the above without being logged in → 401 Unauthorized

---

## Phase 3: Student List and Detail UI
**Time estimate: 5-8 hours | Core working feature**

### What to build:
1. `/app/(faculty)/students/page.tsx` — Student list with table (desktop) and card (mobile) layouts
2. `/components/SearchBar.tsx` — searches by name, PRN, roll number as user types (300ms debounce)
3. `/components/DivisionFilter.tsx` — dropdown to filter by division
4. `/components/StudentModal.tsx` (desktop) / `/app/(faculty)/students/[id]/page.tsx` (mobile)
5. Student detail: 3 tabs — Academic & Identity, Attendance, Financials & Contact
6. Attendance tab: shows Sem1%, Sem2%, and computes Yearly% on the fly
7. `/components/ConfirmDialog.tsx` — generic confirmation modal for Withdraw action
8. Edit form inside the modal (all fields become inputs when "Edit" is clicked)

### Mobile vs desktop logic:
- Use a `useIsMobile()` hook that checks `window.innerWidth < 768`
- On mobile: clicking a student navigates to `/students/[id]` (full page)
- On desktop: clicking a student opens the modal overlay

### How to test:
- Add a few students manually via the form → they appear in the list
- Search "rah" → only students with "rah" in their name/PRN appear
- Filter by Division A → only Division A students appear
- Open a student → all three tabs show correct data
- Edit a student → save → changes are reflected immediately
- Mark a student as Withdrawn → confirmation dialog appears → confirm → student disappears from active list → change filter to "Withdrawn" → student appears

---

## Phase 4: Faculty Dashboard and HOD Dashboard
**Time estimate: 4-6 hours**

### What to build:
1. `/app/(faculty)/dashboard/page.tsx` — 3 stat cards + quick action links
2. `/app/(hod)/dashboard/page.tsx` — stat cards, donut chart (fees), bar chart (attendance by division), division management, teacher list
3. `/app/api/hod/dashboard/route.ts` — returns all stats needed for the HOD dashboard in one call
4. `/components/StatCard.tsx` — reusable number card component
5. Simple charts: use the `recharts` library (already common in Next.js projects, no complex setup)
   - Donut chart for fees: Paid vs Unpaid vs Partial
   - Bar chart for attendance: one bar per division, colored by threshold
6. Division management: inline form to add a new division (name + branch fields, submit button)
7. `/app/(hod)/teachers/page.tsx` — read-only table of registered teachers

### How to test:
- HOD dashboard shows correct totals (add students first in Phase 3, then confirm counts match)
- Fees donut chart updates when you change a student's fees status
- Adding a new division appears in the division list and in the student filter dropdown immediately
- Teacher list shows all registered faculty accounts

---

## Phase 5: Excel Upload
**Time estimate: 5-7 hours | Most complex single feature**

### What to build:
1. `/app/(faculty)/upload/page.tsx` — drag-and-drop zone + dry run report + commit button
2. `/app/api/students/upload/route.ts` — receives file, runs validation, returns dry run report OR commits
3. `/lib/excelParser.ts` — reads the Excel file, normalizes headers (case-insensitive), normalizes values, runs each row through validators
4. Generate a template `.xlsx` file (do this once, save to `/public/template.xlsx`) — can be created with a short Node.js script using the `xlsx` library

### The two-stage upload (important — do not skip):

**Stage 1 (Dry Run):**
```
POST /api/students/upload
Body: { file: File, dryRun: true }
Response: { valid: ValidRow[], errors: RowError[], totalRows: number }
```
Nothing is written to the database. Only the report is returned.

**Stage 2 (Commit):**
```
POST /api/students/upload
Body: { file: File, dryRun: false }
Response: { inserted: number, skipped: number }
```
Only proceeds if `errors.length === 0`.

### Deduplication logic:
- Before inserting any row, check if the PRN exists in the database
- If yes: add it to the error list as "PRN already exists — skipped"
- This means re-uploading the same file always results in 0 new inserts + a clear report, not duplicates

### Template file columns (in this order):
`PRN Number | Full Name | Gender | Division | Roll No | Category | Student Mobile | Father Mobile | Mother Mobile | Address | Fees Status | Scholarship Status | Hostel Status | Hostel Fees | APAAR ID | Sem1 Attendance | Sem2 Attendance | SGPA`

### How to test:
- Upload the template file (empty, no data rows) → dry run shows "0 rows, nothing to commit"
- Upload a file with 10 valid students → dry run shows "10 valid, 0 errors" → commit → all 10 appear in student list
- Upload the same file again → dry run shows "10 errors — PRN already exists" → commit button is disabled
- Upload a file with mixed valid and invalid rows → dry run shows errors per row → commit button is disabled
- Upload a file with headers in different cases ("prn number", "FULL NAME") → should still work correctly
- Upload a file with phone numbers in various formats → should clean and accept them

---

## Phase 6: Final Polish, Testing, and Deployment
**Time estimate: 3-5 hours**

### What to do:
1. **Loading states:** Add loading spinners to every button that calls an API. Add skeleton loaders to list pages.
2. **Error states:** Every API call has a `.catch()` that shows a toast notification with the error message.
3. **Toast notifications:** Implement a simple toast system (bottom-right on desktop, bottom-center on mobile). Use a library like `react-hot-toast` — zero configuration.
4. **Mobile testing:** Open the app on an actual phone. Test every page. Fix anything that is too small to tap or overflows the screen.
5. **Edge cases to manually test:**
   - What happens if you open a student URL directly without being logged in? (should redirect to login)
   - What if attendance is entered as 105? (should show validation error)
   - What if the Division dropdown in the student form has no divisions yet? (should say "No divisions found. Ask HOD to add one.")
6. **Deploy to Vercel:**
   - Push code to a private GitHub repository
   - Connect the repo to Vercel
   - Add all environment variables in Vercel dashboard
   - Deploy
   - Test the live URL on both desktop and mobile

### Pre-launch checklist:
- [ ] HOD account seeded in the database
- [ ] Initial divisions created (A, B, C or whatever is needed)
- [ ] Faculty Registration Code set in environment variables
- [ ] All environment variables added in Vercel
- [ ] Tested login, register, and auto-login on the live URL
- [ ] Tested Excel upload with a real sample file on the live URL
- [ ] Tested on mobile (actual phone, not browser DevTools)

---

## Summary: Build Order and Dependencies

```
Phase 0: Project Setup
    ↓
Phase 1: Auth (Login / Register / Auto-Login / Route Protection)
    ↓ (nothing works without auth)
Phase 2: APIs (Students + Divisions CRUD)
    ↓ (UI is useless without working APIs)
Phase 3: Student List + Detail UI
    ↓ (dashboards need student data to display)
Phase 4: Dashboards (Faculty + HOD)
    ↓ (upload is a separate feature, added after core is stable)
Phase 5: Excel Upload
    ↓ (polish only after everything works)
Phase 6: Polish + Deploy
```