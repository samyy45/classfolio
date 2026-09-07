# Development Rules & Constraints
# College Student Information Management System
# Version: 1.0

---

## Purpose of This File

These are non-negotiable rules. They exist because this app holds real student data for a real college. Breaking any of these rules makes the app unreliable or insecure. Every rule includes the reason it exists so it is never accidentally treated as optional.

---

## RULE 1 — Never Hard-Delete a Student Record

**The rule:** Never run `DELETE FROM students`. A "deleted" student is set to `status = 'Withdrawn'`. The row stays in the database forever.

**Why:** If a student disputes their withdrawal, or if fees data is audited, or if a mistake is made, the record must exist for recovery. A hard delete destroys this permanently.

**How to implement:** The "Withdraw Student" action in the UI sends a `PATCH /api/students/[id]` request with `{ status: 'Withdrawn' }`. There is no delete endpoint. The UI shows a confirmation dialog before this action.

---

## RULE 2 — All Database Writes Go Through API Routes, Never the Browser Client

**The rule:** The browser Supabase client can only be used to read data. Any insert, update, or delete must go through a Next.js API route (`/app/api/`) using the server-side Supabase client with the service role key.

**Why:** The service role key bypasses all database security. If it runs in the browser, it is exposed to any user who opens DevTools. This would let a student (if they ever accessed the URL) delete the entire database.

**The service role key must:** Live only in `SUPABASE_SERVICE_ROLE_KEY` environment variable, only be used in `/app/api/` files, and never appear in any file that starts with `use client` or in `/components/` or `/lib/supabaseClient.ts`.

---

## RULE 3 — Validate Every Input, Twice

**The rule:** Every piece of data the user submits is validated:
1. In the browser (form validation) — to give instant feedback
2. In the API route (server validation) — because browser validation can be bypassed

**Why:** A user can modify form data using browser DevTools and submit garbage directly to the API. If the API doesn't validate, garbage enters the database.

**How to implement:** Use TypeScript types for compile-time safety. Write a `validators.ts` file containing all validation functions. Call them both in the form component and at the top of every API route before any database operation.

---

## RULE 4 — Excel Upload Must Be Fully Validated Before Anything Is Written

**The rule:** The Excel upload endpoint has two stages. Stage 1 (dry run) validates all rows and returns a report. Stage 2 (commit) writes data only if every row passed validation. No partial writes.

**Why:** A partially uploaded batch (some rows written, some not) creates an incomplete and misleading dataset. A teacher might not notice and proceed as if all students are in the system.

**How to implement:** Stage 1 returns `{ valid: Row[], errors: RowError[] }`. Stage 2 only proceeds if `errors.length === 0`. All valid rows are inserted in a single database transaction — if any insert throws an error, the entire transaction is rolled back.

---

## RULE 5 — PRN Is the Deduplication Key for Excel Uploads

**The rule:** Before inserting a row from an Excel file, check if a student with that PRN already exists. If yes, the row is flagged as a duplicate in the dry-run report and not committed again.

**Why:** It is realistic that the HOD uploads the same Excel file twice by accident. Without this check, every student would be duplicated with no easy way to clean it up.

---

## RULE 6 — Excel Column Headers Are Matched Case-Insensitively

**The rule:** When reading an Excel file, all column headers are converted to lowercase and trimmed before matching. The column map in `database.md §8` defines the accepted aliases.

**Why:** Humans make formatting mistakes. A header like " PRN Number " (with spaces) or "prn number" (all lowercase) should work identically to "PRN Number". Rejecting valid data due to a capitalization difference is a bug, not a feature.

**How to implement:** In `excelParser.ts`, after reading the header row, convert each header to `header.trim().toLowerCase()` before matching.

---

## RULE 7 — Phone Numbers Are Cleaned Before Validation

**The rule:** Before validating a mobile number, strip all spaces, dashes, and the `+91` or `91` prefix. Then check that the result is exactly 10 digits.

**Why:** People write phone numbers in many formats: `+91 98765 43210`, `91-9876543210`, `9876543210`. All are the same number. Rejecting valid entries due to formatting is a usability bug.

**Cleaning logic (implement in `validators.ts`):**
```typescript
function cleanMobile(input: string): string {
    let cleaned = input.replace(/[\s\-\(\)]/g, '');  // remove spaces, dashes, parens
    if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
    if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2);
    return cleaned;
}
// After cleaning, validate: /^\d{10}$/.test(cleaned)
```

---

## RULE 8 — HOD-Only Routes Must Check Role on the Server

**The rule:** Every API route under `/api/hod/` must verify that the authenticated user has `role = 'hod'` before doing anything. Reject with `403 Forbidden` if not.

**Why:** Middleware protects the page (UI), but a user can call API routes directly using tools like Postman or curl. If the API route doesn't also check the role, a logged-in teacher can call HOD-only endpoints directly.

**How to implement:**
```typescript
// At the top of every HOD-only API route:
const profile = await getSessionProfile(request);
if (!profile || profile.role !== 'hod') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## RULE 9 — Rate-Limit the Login and Register Endpoints

**The rule:** The `/api/auth/login` and `/api/auth/register` endpoints must reject more than 10 requests from the same IP within 15 minutes.

**Why:** Without this, anyone can try thousands of email/password combinations automatically (brute-force attack). Even for an internal tool, this is basic and required.

**How to implement:** Use the `rate-limiter-flexible` npm package with an in-memory store (sufficient for this scale). Return `429 Too Many Requests` when the limit is hit.

---

## RULE 10 — No Secrets in Source Code or Git

**The rule:** The following must never appear in any `.ts`, `.js`, `.json`, or `.md` file that is committed to the repository:
- `SUPABASE_SERVICE_ROLE_KEY`
- `FACULTY_REGISTRATION_CODE`
- Any password

**Why:** GitHub repositories — even private ones — have been accidentally made public. A service role key in source code means anyone who sees the repo can destroy the entire database.

**How:** Use `.env.local` locally (add to `.gitignore`). Use Vercel Environment Variables in production. Reference them as `process.env.VARIABLE_NAME` in code only.

---

## RULE 11 — Yearly Attendance Is Always Computed, Never Stored

**The rule:** The `yearly_attendance` field does not exist in the database. It is always calculated in code as `(sem1_attendance + sem2_attendance) / 2`.

**Why:** If both the computed value and the stored value exist, they can get out of sync. A stored yearly attendance of `85%` next to a sem1 of `60%` and sem2 of `90%` is silently wrong and misleading.

---

## RULE 12 — TypeScript Strict Mode Is Non-Negotiable

**The rule:** `tsconfig.json` must have `"strict": true`. No `any` types except where a library genuinely requires it, and those cases must have a comment explaining why.

**Why:** TypeScript strict mode catches entire categories of runtime bugs (null reference errors, wrong argument types) before the code even runs. Turning it off is trading future reliability for short-term convenience.

---

## RULE 13 — Every User-Facing Action Has a Loading and Error State

**The rule:** Every button that triggers an API call must have three visual states: idle, loading (spinner), and error (message). No button silently does nothing while data is being fetched.

**Why:** Without loading states, teachers click buttons multiple times thinking nothing happened. This causes duplicate submissions. Without error states, a failed save is invisible and data is silently lost.

---

## RULE 14 — Confirmation Dialog Before Marking a Student as Withdrawn

**The rule:** Clicking "Mark as Withdrawn" must show a modal dialog asking "Are you sure? This student will be hidden from the active list." with Cancel and Confirm buttons. The action only proceeds after Confirm.
Be careful

**Why:** Accidental withdrawal of the wrong student is a realistic scenario. This one extra step prevents a consequential mistake.
