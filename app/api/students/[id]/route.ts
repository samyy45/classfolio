import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';
import { CATEGORY_OPTIONS, BRANCH_OPTIONS } from '@/lib/constants';

// ============================================================
// Validation helpers (database.md §9, rules.md §7)
// ============================================================

/**
 * Clean a mobile number string per rules.md §7:
 *   strip spaces, dashes, parentheses, +91 prefix, 91 prefix (when 12 digits)
 * Returns the cleaned string (may or may not be valid yet).
 */
function cleanMobile(input: string): string {
  let cleaned = input.replace(/[\s\-()]/g, ''); // remove spaces, dashes, parens
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2);
  return cleaned;
}

/** Returns true when the cleaned number is exactly 10 digits. */
function isValidMobile(input: string): boolean {
  return /^\d{10}$/.test(cleanMobile(input));
}

/**
 * Case-insensitive enum match.
 * Returns the canonical (DB-safe) value if found, or null.
 */
function matchEnum<T extends string>(input: string, allowed: T[]): T | null {
  const normalised = input.trim().toLowerCase();
  const found = allowed.find((v) => v.toLowerCase() === normalised);
  return found ?? null;
}

/** Returns true when value is a number in [0, 100]. */
function isValidAttendance(value: unknown): boolean {
  const n = Number(value);
  return !isNaN(n) && n >= 0 && n <= 100;
}

// ============================================================
// GET /api/students/[id]
// ============================================================

/**
 * GET /api/students/[id]
 *
 * Fetches a single student by primary-key id, joined with its division
 * (name, branch).
 *
 * Responses:
 *   200 — student object with division nested
 *   401 — not authenticated
 *   404 — student not found
 *   500 — database error
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const studentId = parseInt(id, 10);

  if (isNaN(studentId)) {
    return Response.json({ error: 'Invalid student id' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('students')
    .select(
      `
        id,
        full_name,
        gender,
        category,
        branch,
        prn_number,
        cprn_number,
        apaar_id,
        division_id,
        roll_number,
        student_mobile,
        father_mobile,
        mother_mobile,
        address,
        fees_status,
        scholarship_status,
        hostel_status,
        hostel_fees,
        sem1_attendance,
        sem2_attendance,
        sgpa_sem1,
        sgpa_sem2,
        status,
        created_at,
        updated_at,
        updated_by,
        divisions (
          name
        ),
        entrance_scores (*),
        student_fees (*),
        attendance_records (
          id, status, attendance_sessions ( session_date )
        )
      `
    )
    .eq('id', studentId)
    .single();

  if (error) {
    // PostgREST returns code 'PGRST116' for "zero rows" from .single()
    if (error.code === 'PGRST116') {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }
    console.error('[GET /api/students/[id]]', error.message);
    return Response.json({ error: 'Failed to fetch student' }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: 'Student not found' }, { status: 404 });
  }

  // Flatten nested joins
  const { divisions, entrance_scores, student_fees, attendance_records, ...rest } = data as any;

  const student = {
    ...rest,
    division: divisions ?? { name: 'Unknown' },
    entrance_score: Array.isArray(entrance_scores) ? entrance_scores[0] ?? null : entrance_scores,
    student_fees: student_fees ?? [],
    attendance_records: (attendance_records ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      date: r.attendance_sessions?.session_date || null
    }))
  };

  return Response.json(student);
}

// ============================================================
// PATCH /api/students/[id]
// ============================================================

/**
 * PATCH /api/students/[id]
 *
 * Two distinct code paths:
 *
 * 1. Soft-withdraw fast path (rules.md §1):
 *    Body is exactly `{ "status": "Withdrawn" }`.
 *    Only the status column is updated — no other validation is performed.
 *
 * 2. Full edit:
 *    All provided fields are validated per database.md §9.
 *    updated_by is set to the current user's id.
 *    updated_at is managed automatically by the DB trigger (database.md §4).
 *
 * Responses:
 *   200 — updated student object
 *   400 — validation error (specific message included)
 *   401 — not authenticated
 *   404 — student not found
 *   409 — unique constraint violation (PRN / APAAR / roll per division)
 *   500 — database error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const studentId = parseInt(id, 10);

  if (isNaN(studentId)) {
    return Response.json({ error: 'Invalid student id' }, { status: 400 });
  }

  // ── Parse body ──────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const bodyKeys = Object.keys(body);

  // ── Fast path: soft withdraw (rules.md §1) ──────────────────
  // Body must be exactly { status: 'Withdrawn' } — no other keys.
  if (
    bodyKeys.length === 1 &&
    bodyKeys[0] === 'status' &&
    body['status'] === 'Withdrawn'
  ) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('students')
      .update({ status: 'Withdrawn' })
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: 'Student not found' }, { status: 404 });
      }
      console.error('[PATCH /api/students/[id] withdraw]', error.message);
      return Response.json({ error: 'Failed to update student' }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }

    return Response.json(data);
  }

  // ── Full edit path: validate all provided fields ─────────────

  // Allowed enum values (database.md §4, §9)
  const GENDERS    = ['Boy', 'Girl'] as const;
  const FEES       = ['Paid', 'Unpaid', 'Partial'] as const;
  const SCHOLARSHIP = ['Availed', 'Not Availed'] as const;
  const HOSTEL     = ['Hosteller', 'Day Scholar'] as const;
  const STATUSES   = ['Active', 'Withdrawn'] as const;

  // Validated update payload — only includes keys that are actually in body
  const update: Record<string, unknown> = {};

  // full_name
  if ('full_name' in body) {
    const val = String(body['full_name'] ?? '').trim();
    if (!val) {
      return Response.json({ error: 'full_name cannot be empty' }, { status: 400 });
    }
    update['full_name'] = val;
  }

  // prn_number
  if ('prn_number' in body) {
    const val = String(body['prn_number'] ?? '').trim();
    if (!val) {
      return Response.json({ error: 'prn_number cannot be empty' }, { status: 400 });
    }
    update['prn_number'] = val;
  }

  // cprn_number
  if ('cprn_number' in body) {
    update['cprn_number'] = body['cprn_number'] === '' || body['cprn_number'] === null ? null : String(body['cprn_number']).trim();
  }

  // gender (case-insensitive)
  if ('gender' in body) {
    const canonical = matchEnum(String(body['gender'] ?? ''), [...GENDERS]);
    if (!canonical) {
      return Response.json(
        { error: `gender must be one of: ${GENDERS.join(', ')}` },
        { status: 400 }
      );
    }
    update['gender'] = canonical;
  }

  // category (case-insensitive)
  if ('category' in body) {
    const canonical = matchEnum(String(body['category'] ?? ''), [...CATEGORY_OPTIONS]);
    if (!canonical) {
      return Response.json(
        { error: `category must be one of: ${CATEGORY_OPTIONS.join(', ')}` },
        { status: 400 }
      );
    }
    update['category'] = canonical;
  }

  // branch (case-insensitive)
  if ('branch' in body) {
    const canonical = matchEnum(String(body['branch'] ?? ''), [...BRANCH_OPTIONS]);
    if (!canonical) {
      return Response.json(
        { error: `branch must be one of: ${BRANCH_OPTIONS.join(', ')}` },
        { status: 400 }
      );
    }
    update['branch'] = canonical;
  }

  // fees_status (case-insensitive)
  if ('fees_status' in body) {
    const canonical = matchEnum(String(body['fees_status'] ?? ''), [...FEES]);
    if (!canonical) {
      return Response.json(
        { error: `fees_status must be one of: ${FEES.join(', ')}` },
        { status: 400 }
      );
    }
    update['fees_status'] = canonical;
  }

  // scholarship_status (case-insensitive)
  if ('scholarship_status' in body) {
    const canonical = matchEnum(String(body['scholarship_status'] ?? ''), [...SCHOLARSHIP]);
    if (!canonical) {
      return Response.json(
        { error: `scholarship_status must be one of: ${SCHOLARSHIP.join(', ')}` },
        { status: 400 }
      );
    }
    update['scholarship_status'] = canonical;
  }

  // hostel_status (case-insensitive)
  if ('hostel_status' in body) {
    const canonical = matchEnum(String(body['hostel_status'] ?? ''), [...HOSTEL]);
    if (!canonical) {
      return Response.json(
        { error: `hostel_status must be one of: ${HOSTEL.join(', ')}` },
        { status: 400 }
      );
    }
    update['hostel_status'] = canonical;
  }

  // status (case-insensitive) — when present alongside other fields
  if ('status' in body) {
    const canonical = matchEnum(String(body['status'] ?? ''), [...STATUSES]);
    if (!canonical) {
      return Response.json(
        { error: `status must be one of: ${STATUSES.join(', ')}` },
        { status: 400 }
      );
    }
    update['status'] = canonical;
  }

  // Phone numbers — clean then validate (database.md §9, rules.md §7)
  for (const field of ['student_mobile', 'father_mobile', 'mother_mobile'] as const) {
    if (field in body) {
      const raw = String(body[field] ?? '');
      if (!isValidMobile(raw)) {
        return Response.json(
          {
            error: `${field}: after stripping spaces, dashes, and +91/91 prefix the number must be exactly 10 digits`,
          },
          { status: 400 }
        );
      }
      update[field] = cleanMobile(raw);
    }
  }

  // Attendance — must be 0–100 (database.md §9)
  for (const field of ['sem1_attendance', 'sem2_attendance'] as const) {
    if (field in body) {
      const val = body[field];
      // Allow explicit null to clear the field
      if (val === null) {
        update[field] = null;
      } else if (!isValidAttendance(val)) {
        return Response.json(
          { error: `${field} must be a number between 0 and 100` },
          { status: 400 }
        );
      } else {
        update[field] = Number(val);
      }
    }
  }

  // hostel_fees — non-negative number
  if ('hostel_fees' in body) {
    const val = body['hostel_fees'];
    if (val === null || val === undefined) {
      update['hostel_fees'] = 0;
    } else {
      const n = Number(val);
      if (isNaN(n) || n < 0) {
        return Response.json(
          { error: 'hostel_fees must be a non-negative number' },
          { status: 400 }
        );
      }
      update['hostel_fees'] = n;
    }
  }

  // roll_number — positive integer
  if ('roll_number' in body) {
    const n = Number(body['roll_number']);
    if (!Number.isInteger(n) || n < 1) {
      return Response.json(
        { error: 'roll_number must be a positive integer' },
        { status: 400 }
      );
    }
    update['roll_number'] = n;
  }

  // division_id — positive integer
  if ('division_id' in body) {
    const n = Number(body['division_id']);
    if (!Number.isInteger(n) || n < 1) {
      return Response.json(
        { error: 'division_id must be a positive integer' },
        { status: 400 }
      );
    }
    update['division_id'] = n;
  }

  // apaar_id — optional free text (or null to clear)
  if ('apaar_id' in body) {
    update['apaar_id'] = body['apaar_id'] === '' ? null : body['apaar_id'];
  }

  // address — optional free text (or null to clear)
  if ('address' in body) {
    update['address'] = body['address'] === '' ? null : body['address'];
  }

  // sgpa_sem1 — optional free text (or null to clear)
  if ('sgpa_sem1' in body) {
    update['sgpa_sem1'] = body['sgpa_sem1'] === '' ? null : body['sgpa_sem1'];
  }

  // sgpa_sem2 — optional free text (or null to clear)
  if ('sgpa_sem2' in body) {
    update['sgpa_sem2'] = body['sgpa_sem2'] === '' ? null : body['sgpa_sem2'];
  }

  // Reject empty update payloads
  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'No valid fields provided for update' }, { status: 400 });
  }

  // Stamp who made the last edit (database.md §4, security.md §5)
  update['updated_by'] = user.id;

  // ── Write to DB ──────────────────────────────────────────────
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('students')
    .update(update)
    .eq('id', studentId)
    .select(
      `
        id,
        full_name,
        gender,
        category,
        branch,
        prn_number,
        cprn_number,
        apaar_id,
        division_id,
        roll_number,
        student_mobile,
        father_mobile,
        mother_mobile,
        address,
        fees_status,
        scholarship_status,
        hostel_status,
        hostel_fees,
        sem1_attendance,
        sem2_attendance,
        sgpa_sem1,
        sgpa_sem2,
        status,
        created_at,
        updated_at,
        updated_by,
        divisions (
          name
        ),
        entrance_scores (*),
        student_fees (*),
        attendance_records (
          id, status, attendance_sessions ( session_date )
        )
      `
    )
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }
    // Unique constraint violations
    if (error.code === '23505') {
      if (error.message.includes('prn_number'))
        return Response.json({ error: 'PRN number already exists' }, { status: 409 });
      if (error.message.includes('cprn_number'))
        return Response.json({ error: 'CPRN number already exists' }, { status: 409 });
      if (error.message.includes('unique_roll_per_division'))
        return Response.json(
          { error: 'Roll number already exists in this division' },
          { status: 409 }
        );
      if (error.message.includes('apaar_id'))
        return Response.json({ error: 'APAAR ID already exists' }, { status: 409 });
    }
    console.error('[PATCH /api/students/[id]]', error.message);
    return Response.json({ error: 'Failed to update student' }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: 'Student not found' }, { status: 404 });
  }

  // Flatten nested joins
  const { divisions, entrance_scores, student_fees, attendance_records, ...rest } = data as any;

  const updated = {
    ...rest,
    division: divisions ?? { name: 'Unknown' },
    entrance_score: Array.isArray(entrance_scores) ? entrance_scores[0] ?? null : entrance_scores,
    student_fees: student_fees ?? [],
    attendance_records: (attendance_records ?? []).map((r: any) => ({
      id: r.id,
      status: r.status,
      date: r.attendance_sessions?.session_date || null
    }))
  };

  return Response.json(updated);
}
