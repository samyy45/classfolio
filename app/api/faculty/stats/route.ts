import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';

/**
 * GET /api/faculty/stats
 *
 * Returns lightweight stats for the faculty dashboard:
 *   - total_students  (Active students only)
 *   - total_divisions (Active divisions)
 *   - uploaded_today  (Students created today)
 *
 * Auth: any authenticated user (faculty or hod) may call this.
 *
 * Responses:
 *   200 { total_students, total_divisions, uploaded_today }
 *   401 { error: 'Unauthorized' }
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Total active students
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Active');

  // Total active divisions
  const { count: totalDivisions } = await supabase
    .from('divisions')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Students added today (UTC midnight boundary)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count: uploadedToday } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString());

  return Response.json({
    total_students: totalStudents ?? 0,
    total_divisions: totalDivisions ?? 0,
    uploaded_today: uploadedToday ?? 0,
  });
}
