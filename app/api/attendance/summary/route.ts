import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');

  if (!student_id) {
    return Response.json({ error: 'student_id is required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('attendance_records')
    .select('status')
    .eq('student_id', student_id);

  if (error) {
    console.error('[GET /api/attendance/summary]', error.message);
    return Response.json({ error: 'Failed to fetch attendance summary' }, { status: 500 });
  }

  const presentCount = data.filter(d => d.status === 'Present').length;
  const absentCount = data.filter(d => d.status === 'Absent').length;

  return Response.json({ present: presentCount, absent: absentCount });
}
