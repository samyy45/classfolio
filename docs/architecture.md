# Architecture Document
# College Student Information Management System
# Version: 1.0

---

## 1. Stack Decision Summary

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Works on mobile + desktop, no separate frontend server |
| Styling | Tailwind CSS | Fast, consistent, responsive — no custom CSS files needed |
| Backend/API | Next.js API Routes (`/app/api/`) | No separate backend server — everything in one project |
| Database | Supabase (PostgreSQL) | Free tier, visual dashboard, built-in auth, no server to manage |
| Authentication | Supabase Auth + Row-Level Security | Handles sessions, tokens, and auto-login natively |
| File Upload | Supabase Storage (for archived Excel files) | Same service, no extra setup |
| Excel Parsing | `xlsx` (SheetJS) | Lightweight, handles .xlsx and .csv |
| Deployment | Vercel (free tier) | One-click deploy from GitHub, handles mobile + desktop |
| Environment Secrets | Vercel Environment Variables | Never stored in code |

**Total infrastructure cost at this scale: ₹0 (free tiers cover everything)**

---

## 2. Why This Stack (Not Others)

**Why Supabase instead of raw PostgreSQL?**
Raw PostgreSQL requires you to run and maintain a server. Supabase gives you PostgreSQL in the cloud with a visual table editor, automatic backups, built-in auth, and an auto-generated API — all free for small projects. You can see your data like a spreadsheet at any time from the Supabase dashboard.

**Why Next.js instead of separate React + FastAPI?**
Separate frontend + backend = two things to deploy, two things that can break, and a CORS configuration that's a common source of bugs. Next.js lets you write both the UI and the API endpoints in one project.

**Why Tailwind instead of Material UI / Chakra?**
Component libraries import a lot and add complexity. Tailwind is just utility classes — the output is smaller, the UI is fully controllable, and there's no version conflict risk.

---

## 3. Folder Structure

```
/project-root
│
├── /app                        ← All pages and API routes (Next.js App Router)
│   ├── /api                    ← Backend API endpoints
│   │   ├── /auth
│   │   │   ├── register/route.ts
│   │   │   └── login/route.ts
│   │   ├── /students
│   │   │   ├── route.ts            ← GET all, POST new student
│   │   │   ├── [id]/route.ts       ← GET one, PATCH, soft-delete
│   │   │   └── upload/route.ts     ← Excel bulk upload
│   │   ├── /divisions
│   │   │   └── route.ts            ← GET all, POST new division (HOD only)
│   │   └── /hod
│   │       └── dashboard/route.ts  ← HOD stats
│   │
│   ├── /(auth)                 ← Public pages (no login needed)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   ├── /(faculty)              ← Protected — Faculty layout
│   │   ├── dashboard/page.tsx
│   │   ├── students/page.tsx
│   │   ├── students/[id]/page.tsx
│   │   └── upload/page.tsx
│   │
│   ├── /(hod)                  ← Protected — HOD layout
│   │   ├── dashboard/page.tsx
│   │   └── teachers/page.tsx
│   │
│   └── layout.tsx              ← Root layout
│
├── /components                 ← Reusable UI components
│   ├── StudentCard.tsx
│   ├── StudentModal.tsx
│   ├── AttendanceDisplay.tsx
│   ├── SearchBar.tsx
│   ├── DivisionFilter.tsx
│   ├── ExcelUploader.tsx
│   ├── ConfirmDialog.tsx
│   └── StatCard.tsx
│
├── /lib                        ← Shared utilities and logic
│   ├── supabaseClient.ts       ← Supabase browser client
│   ├── supabaseServer.ts       ← Supabase server client (for API routes)
│   ├── auth.ts                 ← Auth helpers (get session, check role)
│   ├── validators.ts           ← All Pydantic-equivalent validation logic
│   ├── excelParser.ts          ← Excel parsing + row validation
│   └── constants.ts            ← App-wide constants (roles, status options)
│
├── /types
│   └── index.ts                ← All TypeScript type definitions
│
├── /middleware.ts              ← Route protection (redirect if not logged in)
│
├── .env.local                  ← Secret keys — NEVER commit this file
├── .gitignore                  ← Must include .env.local
└── package.json
```

---

## 4. Authentication Architecture

### 4.1 How Supabase Auth Works Here
- Supabase Auth handles all session management — tokens, refresh, expiry
- When a user logs in or registers, Supabase sets a cookie in the browser
- On every page load, Next.js middleware checks this cookie
- If valid → user sees their page
- If missing or expired → redirect to `/login`
- This is the "auto-login" behavior described in the PRD — nothing extra to build

### 4.2 Role Storage
Supabase Auth doesn't have a built-in role system. We handle this as follows:
- Every registered user has a row in a custom `profiles` table in the database
- `profiles` stores: `user_id` (links to Supabase Auth), `full_name`, `role` (`hod` or `faculty`), `created_at`
- When checking permissions in an API route, we query `profiles` to get the role
- HOD's profile is seeded manually before launch — their `role` is set to `hod` in the database

### 4.3 Faculty Registration Code
- The Faculty Registration Code is stored as an environment variable: `FACULTY_REGISTRATION_CODE`
- During registration, the submitted code is compared against this env variable server-side
- If it does not match → registration rejected, no account created
- This value is never exposed to the browser — the check happens only in the API route

### 4.4 Middleware Route Protection
```
/middleware.ts — rules:
- /login and /register → public (no auth check)
- /(faculty)/* → must be logged in as faculty OR hod
- /(hod)/* → must be logged in as HOD only
- If wrong role → redirect to their correct dashboard
```

---

## 5. Database Connection

Two Supabase clients are used — this is important:

- **Browser Client** (`supabaseClient.ts`): Used in React components for reading data with the user's session
- **Server Client** (`supabaseServer.ts`): Used in API Routes for all writes and sensitive reads — uses the service role key, bypasses Row Level Security

All database writes go through API routes (server-side) — the browser never writes directly to the database.

---

## 6. Excel Upload Flow

```
User selects file → Browser sends file to /api/students/upload
        ↓
API Route receives file buffer
        ↓
excelParser.ts reads all rows
        ↓
Each row is normalized:
  - headers lowercased and trimmed
  - cell values trimmed
  - phone numbers stripped of spaces/dashes/+91
        ↓
Each row is validated against StudentRowSchema
        ↓
Dry Run result returned to browser (no DB write yet)
        ↓
User reviews and clicks "Confirm Upload"
        ↓
Valid rows are inserted in a single database transaction
If anything fails mid-insert → entire transaction rolled back
        ↓
Original Excel file saved to Supabase Storage with timestamp
```

---

## 7. Environment Variables

Stored in `.env.local` for local development and in Vercel's Environment Variables for production. This file is **never committed to GitHub** (must be in `.gitignore`).

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key    ← NEVER prefix with NEXT_PUBLIC_

# App Secrets
FACULTY_REGISTRATION_CODE=YourSecretCodeHere
HOD_EMAIL=hod@college.edu                          ← For reference only
```

---

## 8. Deployment — Step by Step

1. Push code to a GitHub repository (private repo)
2. Go to [vercel.com](https://vercel.com) → Import GitHub repo → Deploy
3. In Vercel dashboard → Settings → Environment Variables → add all variables from `.env.local`
4. Every push to `main` branch auto-deploys — no manual steps
5. Vercel gives a free `.vercel.app` domain — or connect a custom domain if available

---

## 9. Supabase Setup — Step by Step

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project (choose a region close to India — Singapore)
3. Go to Settings → API → copy the URL and anon key into `.env.local`
4. Go to Settings → API → copy the service role key into `.env.local`
5. Go to SQL Editor → run the schema from `database.md`
6. Seed the HOD account using the Supabase dashboard (insert a row into `profiles` with `role = 'hod'`)
7. Enable Supabase Auth → Email provider → turn off "Confirm email" (so teachers can register and log in immediately without an email confirmation step)

---

## 10. Backup Policy

Supabase free tier includes automatic daily backups retained for 7 days. This is sufficient for this use case. No additional backup setup is needed.

---

## 11. What Happens at Scale

This app is designed for one department, first-year students, approximately 60–240 students (1–4 divisions of 60 each), and fewer than 20 teachers. The free tiers of Supabase and Vercel handle this load with no performance concerns.