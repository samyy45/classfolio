import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';
import { VALID_PERIOD_IDS } from '@/lib/lectureSlots';
import { isDefaultHoliday, parseDateString } from '@/lib/holidayUtils';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const divisionId = searchParams.get('divisionId');
  const date = searchParams.get('date');
  const periodId = searchParams.get('periodId');

  if (!divisionId || !date || !periodId) {
    return Response.json({ error: 'divisionId, date, and periodId are required' }, { status: 400 });
  }

  const supabase = await createClient();

  // ── 1. Holiday check ──────────────────────────────────────────────────────
  const defaultHoliday = isDefaultHoliday(parseDateString(date));

  let manualHoliday = false;
  if (!defaultHoliday) {
    const { data: holidayRow } = await supabase
      .from('holidays')
      .select('id, description')
      .eq('date', date)
      .maybeSingle();
    manualHoliday = !!holidayRow;
  }

  const holiday = defaultHoliday || manualHoliday;

  // ── 2. Skip check ─────────────────────────────────────────────────────────
  const { data: skipRow } = await supabase
    .from('attendance_skips')
    .select('id, reason')
    .eq('division_id', parseInt(divisionId, 10))
    .lte('start_date', date)
    .gte('end_date', date)
    .or(`period_id.is.null,period_id.eq.${periodId}`)
    .maybeSingle();

  const skipped = !!skipRow;

  // ── 3. Fetch session ──────────────────────────────────────────────────────
  const { data: session, error: sessionError } = await supabase
    .from('attendance_sessions')
    .select('*, attendance_records(student_id, status)')
    .eq('division_id', parseInt(divisionId, 10))
    .eq('session_date', date)
    .eq('period_id', periodId)
    .maybeSingle();

  if (sessionError) {
    console.error('[GET /api/attendance/session]', sessionError.message);
    return Response.json({ error: 'Failed to fetch session' }, { status: 500 });
  }

  return Response.json({
    session: session || null,
    holiday,
    skipped,
    skipId: skipRow?.id || null,
    skipReason: skipRow?.reason || null,
  });
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

  const { divisionId, date, periodId, records } = body;

  if (!divisionId || !date || !periodId || !Array.isArray(records)) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate periodId
  if (!VALID_PERIOD_IDS.includes(periodId)) {
    return Response.json({ error: `periodId must be one of: ${VALID_PERIOD_IDS.join(', ')}` }, { status: 400 });
  }

  // Reject future dates
  const today = new Date().toISOString().split('T')[0];
  if (date > today) {
    return Response.json({ error: 'Cannot mark attendance for a future date' }, { status: 400 });
  }

  const supabase = await createClient();

  // Reject if holiday
  const defaultHoliday = isDefaultHoliday(parseDateString(date));
  if (!defaultHoliday) {
    const { data: holidayRow } = await supabase
      .from('holidays').select('id').eq('date', date).maybeSingle();
    if (holidayRow) {
      return Response.json({ error: 'Cannot mark attendance on a holiday' }, { status: 400 });
    }
  } else {
    return Response.json({ error: 'Cannot mark attendance on a holiday' }, { status: 400 });
  }

  // Reject if skipped
  const { data: skipRow } = await supabase
    .from('attendance_skips')
    .select('id')
    .eq('division_id', parseInt(divisionId, 10))
    .lte('start_date', date)
    .gte('end_date', date)
    .or(`period_id.is.null,period_id.eq.${periodId}`)
    .maybeSingle();

  if (skipRow) {
    return Response.json({ error: 'This session has been skipped and cannot have attendance recorded' }, { status: 400 });
  }

  // Validate students belong to the division
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
      return Response.json({ error: 'One or more students do not belong to this division.' }, { status: 400 });
    }
  }

  // Upsert Session
  // Note: period_label is kept for backward-compat (NOT NULL in old schema); mirrors period_id
  const { data: sessionData, error: sessionError } = await supabase
    .from('attendance_sessions')
    .upsert({
      division_id: parseInt(divisionId, 10),
      session_date: date,
      period_id: periodId,
      period_label: periodId,   // backward-compat: old schema has period_label NOT NULL
      marked_by: user.id,
    }, {
      onConflict: 'division_id,session_date,period_id',
      ignoreDuplicates: false,
    })
    .select('id')
    .single();

  if (sessionError || !sessionData) {
    console.error('[POST /api/attendance/session] Session error:', sessionError?.message);
    return Response.json({ error: 'Failed to save attendance session' }, { status: 500 });
  }

  const sessionId = sessionData.id;

  // Upsert Records
  if (records.length > 0) {
    const recordsToInsert = records.map((r: any) => ({
      session_id: sessionId,
      student_id: r.studentId,
      status: r.status,
    }));

    const { error: recordsError } = await supabase
      .from('attendance_records')
      .upsert(recordsToInsert, { onConflict: 'session_id, student_id' });

    if (recordsError) {
      console.error('[POST /api/attendance/session] Records error:', recordsError.message);
      return Response.json({ error: 'Failed to save attendance records' }, { status: 500 });
    }
  }

  return Response.json({ success: true, sessionId });
}
