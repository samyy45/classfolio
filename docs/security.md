# Security Document
# College Student Information Management System
# Version: 1.0

---

## Why Security Gets Its Own File

Security rules scattered across other files get missed. This file is the single source of truth for everything security-related. Every API route developer must read this file before writing any endpoint.

---

## 1. Threat Model (What We Are Protecting Against)

This is an internal college tool. The realistic threats are:

| Threat | Likelihood | Impact |
|---|---|---|
| Outsider guessing a teacher's password | Medium | High — could read/corrupt all student data |
| Automatic brute-force login attempts | Medium | High |
| Teacher accidentally calling a wrong API endpoint | Low | Medium |
| Malicious Excel file with bad data | Low-Medium | Medium — data corruption |
| SQL injection via form inputs | Low (ORM prevents it) | High if it worked |
| Service role key exposed in the browser | Low (if rules are followed) | Critical — full DB access |

We do not need to protect against nation-state attacks or large-scale DDoS — this is a low-traffic internal tool. Security measures are proportional to realistic risk.

---

## 2. Authentication Security

### 2.1 Password Requirements
- Minimum 8 characters
- No complexity requirements beyond that (longer simple passwords are more secure than short complex ones)
- Hashed by Supabase Auth using bcrypt — no custom hashing code needed
- Passwords are never logged, never returned in API responses, never stored in plain text anywhere

### 2.2 Faculty Registration Code
- Stored only in the `FACULTY_REGISTRATION_CODE` environment variable
- Verified server-side only — the browser never sees or sends the value in a way that reveals it (it is submitted as a form field, checked against the env var, and the result is a pass/fail — the actual code is never echoed back)
- Never hardcoded in source code
- Can be changed by updating the environment variable — existing accounts are not affected
- Not the same as a password — it is a shared code known to staff, not an individual credential

### 2.3 Session Management
- Supabase Auth handles session tokens (JWT) automatically
- Tokens are stored in the browser's `localStorage` by Supabase's client library
- Token expiry: 1 hour access token, 30 days refresh token (Supabase default)
- When the access token expires, the refresh token silently gets a new one — this is the "auto-login" behavior
- After 30 days of no activity, the session expires and the user must log in again

### 2.4 HOD Account Security
- The HOD email and password are set once during deployment setup
- HOD cannot register through the UI — the account is manually created in Supabase Auth + seeded in `profiles`
- If the HOD needs to change their password: Supabase Auth dashboard → Users → Reset Password

---

## 3. Input Validation & Sanitization

### 3.1 Rule: Validate Twice — Browser + Server

Browser validation provides instant user feedback. Server validation prevents bypassed browser checks. Both must exist for every form.

### 3.2 What To Validate (All Inputs)

```typescript
// validators.ts — implement all of these

// Strings
sanitizeText(input: string): string
    → input.trim()  // remove leading/trailing whitespace
    → never allow empty string where field is required

// Phone numbers
cleanAndValidateMobile(input: string): { clean: string; valid: boolean }
    → strip: spaces, dashes, parentheses, +91, 91-prefix
    → validate: exactly 10 digits
    → example: "+91 98765-43210" → "9876543210" → valid

// Numbers (attendance, hostel fees)
validatePercentage(input: unknown): boolean
    → must be a number
    → must be 0–100 inclusive

// Enum fields (category, gender, fees_status, etc.)
validateEnum(input: string, allowed: string[]): boolean
    → input.trim().toLowerCase() must match one of the allowed values (also lowercased)

// PRN / APAAR
validateId(input: string): boolean
    → non-empty after trimming
    → no special characters that could affect database queries (though SQLAlchemy/Supabase ORM prevents injection anyway)
```

### 3.3 SQL Injection Prevention
- All database queries use Supabase's JavaScript client, which parameterizes all queries automatically
- We never construct SQL strings by concatenating user input
- Example of what we never do: `` `SELECT * FROM students WHERE name = '${userInput}'` ``
- This rule is enforced by only using the Supabase client methods (`.select()`, `.insert()`, `.update()`, `.eq()`, etc.)

### 3.4 Excel File Safety
- Only `.xlsx` and `.csv` files are accepted (check MIME type and extension, not just extension)
- Maximum file size: 50MB (enforced in the API route, not just the UI)
- File contents are parsed by the `xlsx` library — the content is treated as data, never as code
- The original file is saved to Supabase Storage (isolated from the application) — not executed

---

## 4. Rate Limiting

### 4.1 Login Endpoint (`POST /api/auth/login`)
- Maximum: 10 attempts per IP per 15 minutes
- On 10th failed attempt: return `429 Too Many Requests` with message "Too many login attempts. Try again in 15 minutes."
- Implementation: `rate-limiter-flexible` package with in-memory store

### 4.2 Register Endpoint (`POST /api/auth/register`)
- Maximum: 5 attempts per IP per hour
- Prevents automated account creation attempts

### 4.3 All Other Endpoints
- No rate limiting needed for authenticated endpoints — by the time a user is authenticated, they are a known staff member

### 4.4 Implementation Pattern
```typescript
// In /lib/rateLimiter.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

export const loginLimiter = new RateLimiterMemory({
    points: 10,       // 10 attempts
    duration: 900,    // per 15 minutes (in seconds)
});

// In /api/auth/login/route.ts — first thing before any logic:
try {
    await loginLimiter.consume(request.headers.get('x-forwarded-for') ?? 'unknown');
} catch {
    return Response.json(
        { error: 'Too many login attempts. Try again in 15 minutes.' },
        { status: 429 }
    );
}
```

---

## 5. Authorization (Who Can Do What)

### 5.1 Role Definitions
| Action | Faculty | HOD |
|---|---|---|
| View all students | ✅ | ✅ |
| Add student manually | ✅ | ✅ |
| Edit student | ✅ | ✅ |
| Mark student as Withdrawn | ✅ | ✅ |
| Upload Excel | ✅ | ✅ |
| View HOD dashboard | ❌ | ✅ |
| View teacher list | ❌ | ✅ |
| Add/rename divisions | ❌ | ✅ |

### 5.2 How Authorization Is Checked

Every API route performs this check at the very top, before any logic:

```typescript
// Step 1: Get the session from the request
const supabase = createServerSupabaseClient(request);
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

// Step 2: Get the role from the profiles table
const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
if (!profile) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

// Step 3: For HOD-only routes, additionally check:
if (profile.role !== 'hod') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 5.3 Middleware (Page-Level Protection)

`/middleware.ts` runs before every page renders and redirects unauthenticated users:

```typescript
// If user is not logged in → redirect to /login
// If user is logged in as faculty and tries to access /hod/* → redirect to /dashboard
// If user is logged in as HOD and accesses /dashboard → redirect to /hod/dashboard
```

---

## 6. Secrets Management

| Secret | Where It Lives | Where It Must NOT Be |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env vars + `.env.local` | Source code, browser, any `.ts` file with `use client` |
| `FACULTY_REGISTRATION_CODE` | Vercel env vars + `.env.local` | Source code |
| HOD password | HOD's memory | Anywhere in code or files |
| Supabase anon key | Vercel env vars + `.env.local` | This one IS safe in the browser — it's designed for public use |

### `.gitignore` must include:
```
.env.local
.env
*.env
```

---

## 7. HTTPS and Headers

- Vercel enforces HTTPS automatically — no HTTP traffic reaches the application
- Add these security headers in `next.config.js`:

```javascript
const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];
```

These headers prevent a category of browser-based attacks (clickjacking, MIME sniffing) with zero effort.

---

## 8. Data Privacy

- Student records, including mobile numbers, addresses, and fee status, are accessible to all logged-in staff (HOD and faculty) — this is an explicit decision per the PRD.
- No student or parent has access to this system.
- The system does not send any data to third-party services (no analytics, no tracking).
- Supabase (the database provider) is the only third party with access to the data. Their data is stored in the Singapore AWS region (nearest to India on Supabase's free tier).