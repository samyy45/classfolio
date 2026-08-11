import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';
import { BRANCH_OPTIONS } from '@/lib/constants';

/**
 * GET /api/students
 *
 * Query params (all optional):
 *   ?division_id=1  — filter by division id
 *   ?status=Active  — filter by status (default: 'Active')
 *   ?search=rahul   — case-insensitive partial match on name, PRN, or roll_number
 *
 * Returns: students[] with nested division { name, branch }, sorted by roll_number ASC.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const divisionId = searchParams.get('division_id');
  const status     = searchParams.get('status') ?? 'Active';
  const search     = searchParams.get('search')?.trim() ?? '';

  const supabase = await createClient();

  let query = supabase
    .from('students')
    .select(`
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
      divisions!inner (
        name
      )
    `)
    .eq('status', status)
    .order('roll_number', { ascending: true });

  // Optional division filter
  if (divisionId) {
    const parsed = parseInt(divisionId, 10);
    if (!isNaN(parsed)) {
      query = query.eq('division_id', parsed);
    }
  }

  // Search: name (ilike), PRN (ilike), CPRN (ilike), or exact roll_number match
  if (search) {
    const rollNum = parseInt(search, 10);
    if (!isNaN(rollNum)) {
      query = query.or(
        `full_name.ilike.%${search}%,prn_number.ilike.%${search}%,cprn_number.ilike.%${search}%,roll_number.eq.${rollNum}`
      );
    } else {
      query = query.or(
        `full_name.ilike.%${search}%,prn_number.ilike.%${search}%,cprn_number.ilike.%${search}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[GET /api/students]', error.message);
    return Response.json({ error: 'Failed to fetch students' }, { status: 500 });
  }

  // Flatten the nested divisions join into { ...student, division: { name, branch } }
  const students = (data ?? []).map((row) => {
    const { divisions, ...rest } = row as typeof row & {
      divisions: { name: string } | null;
    };
    return { ...rest, division: divisions ?? { name: 'Unknown' } };
  });

  return Response.json(students);
}

/**
 * POST /api/students
 *
 * Creates a new student. Validates required fields server-side.
 * Returns 201 with the created student row, or a descriptive error.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const required = [
    'full_name', 'gender', 'category', 'branch', 'prn_number',
    'division_id', 'roll_number',
    'student_mobile', 'father_mobile', 'mother_mobile',
  ] as const;

  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return Response.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  if (typeof body.branch === 'string' && !BRANCH_OPTIONS.includes(body.branch as any)) {
    return Response.json({ error: `Invalid branch value: ${body.branch}` }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('students')
    .insert({ ...body, updated_by: user.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('prn_number'))
        return Response.json({ error: 'PRN number already exists' }, { status: 409 });
      if (error.message.includes('unique_roll_per_division'))
        return Response.json({ error: 'Roll number already exists in this division' }, { status: 409 });
      if (error.message.includes('apaar_id'))
        return Response.json({ error: 'APAAR ID already exists' }, { status: 409 });
    }
    console.error('[POST /api/students]', error.message);
    return Response.json({ error: 'Failed to create student' }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
