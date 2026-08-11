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

  if (!divisionId || isNaN(parseInt(divisionId, 10))) {
    return Response.json({ error: 'Valid divisionId is required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, roll_number, division_id')
    .eq('division_id', parseInt(divisionId, 10))
    .eq('status', 'Active')
    .order('roll_number', { ascending: true });

  if (error) {
    console.error('[GET /api/attendance/roster]', error.message);
    return Response.json({ error: 'Failed to fetch roster' }, { status: 500 });
  }

  return Response.json(data);
}
