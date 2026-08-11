import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const divisionId = searchParams.get('divisionId');
  const date = searchParams.get('date');
  const period = searchParams.get('period');

  if (!divisionId || !date || !period) {
    return Response.json({ error: 'divisionId, date, and period are required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from('attendance_sessions')
    .select('*, attendance_records(student_id, status)')
    .eq('division_id', parseInt(divisionId, 10))
    .eq('session_date', date)
    .eq('period_label', period)
    .maybeSingle();

  if (sessionError) {
    console.error('[GET /api/attendance/session]', sessionError.message);
    return Response.json({ error: 'Failed to fetch session' }, { status: 500 });
  }

  return Response.json({ session: session || null });
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

  const { divisionId, date, period, records } = body;

  if (!divisionId || !date || !period || !Array.isArray(records)) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = await createClient();

  // Validate that all students belong to the given division (Rule 3)
  if (records.length > 0) {
    const studentIds = records.map((r: any) => r.studentId);
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, division_id')
      .in('id', studentIds);

    if (studentError) {
      return Response.json({ error: 'Failed to validate students' }, { status: 500 });
    }

    const invalidStudents = students?.filter(s => s.division_id !== parseInt(divisionId, 10)) || [];
    if (invalidStudents.length > 0 || students?.length !== studentIds.length) {
      return Response.json({ error: 'One or more students do not belong to this division or are invalid.' }, { status: 400 });
    }
  }

  // 1. Upsert Session
  const { data: sessionData, error: sessionError } = await supabase
    .from('attendance_sessions')
    .upsert({
      division_id: parseInt(divisionId, 10),
      session_date: date,
      period_label: period,
      marked_by: user.id
    }, {
      onConflict: 'division_id, session_date, period_label'
    })
    .select('id')
    .single();

  if (sessionError || !sessionData) {
    console.error('[POST /api/attendance/session] Session error:', sessionError?.message);
    return Response.json({ error: 'Failed to save attendance session' }, { status: 500 });
  }

  const sessionId = sessionData.id;

  // 2. Upsert Records
  if (records.length > 0) {
    const recordsToInsert = records.map((r: any) => ({
      session_id: sessionId,
      student_id: r.studentId,
      status: r.status
    }));

    const { error: recordsError } = await supabase
      .from('attendance_records')
      .upsert(recordsToInsert, {
        onConflict: 'session_id, student_id'
      });

    if (recordsError) {
      console.error('[POST /api/attendance/session] Records error:', recordsError.message);
      return Response.json({ error: 'Failed to save attendance records' }, { status: 500 });
    }
  }

  return Response.json({ success: true, sessionId });
}
