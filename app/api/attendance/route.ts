import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const division_id = searchParams.get('division_id');

  if (!date || !division_id) {
    return Response.json({ error: 'date and division_id are required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch students in this division to ensure we only get attendance for them
  // We can join attendance_records with students where division_id matches
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      id,
      student_id,
      date,
      status,
      recorded_by,
      created_at,
      updated_at,
      students!inner(division_id)
    `)
    .eq('date', date)
    .eq('students.division_id', parseInt(division_id, 10));

  if (error) {
    console.error('[GET /api/attendance]', error.message);
    return Response.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }

  // Remove the joined students table from the output
  const records = data.map(({ students, ...rest }) => rest);

  return Response.json({ data: records });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { date, present_student_ids, absent_student_ids } = body;

  if (!date || !Array.isArray(present_student_ids) || !Array.isArray(absent_student_ids)) {
    return Response.json({ error: 'date, present_student_ids, and absent_student_ids are required' }, { status: 400 });
  }

  const records = [
    ...present_student_ids.map((id: number) => ({
      student_id: id,
      date,
      status: 'Present',
      recorded_by: user.id
    })),
    ...absent_student_ids.map((id: number) => ({
      student_id: id,
      date,
      status: 'Absent',
      recorded_by: user.id
    }))
  ];

  if (records.length === 0) {
    return Response.json({ success: true, message: 'No records to update' });
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('attendance_records')
    .upsert(records, { onConflict: 'student_id,date' });

  if (error) {
    console.error('[POST /api/attendance]', error.message);
    return Response.json({ error: 'Failed to save attendance' }, { status: 500 });
  }

  return Response.json({ success: true });
}
