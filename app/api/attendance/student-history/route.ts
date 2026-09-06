import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';
import { getLectureSlot } from '@/lib/lectureSlots';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return Response.json({ error: 'studentId is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch all attendance records for the student, joined with sessions
  const { data: records, error } = await supabase
    .from('attendance_records')
    .select(`
      id,
      status,
      attendance_sessions!inner (
        id,
        session_date,
        period_id,
        division_id
      )
    `)
    .eq('student_id', parseInt(studentId, 10))
    .order('id', { ascending: false });

  if (error) {
    console.error('[GET /api/attendance/student-history]', error.message);
    return Response.json({ error: 'Failed to fetch attendance history' }, { status: 500 });
  }

  // Fetch skips for the student's division to filter out skipped sessions
  // Get the student's division_id first
  const { data: student } = await supabase
    .from('students')
    .select('division_id')
    .eq('id', parseInt(studentId, 10))
    .single();

  let skips: any[] = [];
  if (student?.division_id) {
    const { data: skipData } = await supabase
      .from('attendance_skips')
      .select('*')
      .eq('division_id', student.division_id);
    skips = skipData || [];
  }

  // Filter out records that fall within a skip range
  const filtered = (records || []).filter((record: any) => {
    const session = record.attendance_sessions;
    if (!session) return false;
    const sessionDate = session.session_date;
    const periodId = session.period_id;

    return !skips.some(skip => {
      if (skip.start_date > sessionDate || skip.end_date < sessionDate) return false;
      // period_id null means all periods are skipped
      if (skip.period_id === null) return true;
      return skip.period_id === periodId;
    });
  });

  // Shape the response — attach human-readable lecture info
  const history = filtered.map((record: any) => {
    const session = record.attendance_sessions;
    const slot = getLectureSlot(session.period_id);
    return {
      id: record.id,
      date: session.session_date,
      periodId: session.period_id,
      periodLabel: slot ? `${slot.label} (${slot.time})` : session.period_id,
      status: record.status,
    };
  });

  // Sort by date desc, then period asc
  history.sort((a: any, b: any) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return a.periodId.localeCompare(b.periodId);
  });

  return Response.json({ history });
}
