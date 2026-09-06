import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';
import { VALID_PERIOD_IDS } from '@/lib/lectureSlots';

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

  const { divisionId, periodId, startDate, endDate, reason } = body;

  if (!divisionId || !startDate || !endDate) {
    return Response.json({ error: 'divisionId, startDate, and endDate are required' }, { status: 400 });
  }

  if (endDate < startDate) {
    return Response.json({ error: 'endDate must be on or after startDate' }, { status: 400 });
  }

  // periodId is optional (null = all periods); validate if provided
  if (periodId !== null && periodId !== undefined && !VALID_PERIOD_IDS.includes(periodId)) {
    return Response.json({ error: `periodId must be one of: ${VALID_PERIOD_IDS.join(', ')}` }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('attendance_skips')
    .insert({
      division_id: parseInt(divisionId, 10),
      period_id: periodId || null,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[POST /api/attendance/skip]', error.message);
    return Response.json({ error: 'Failed to create skip' }, { status: 500 });
  }

  return Response.json({ success: true, skipId: data.id });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const skipId = searchParams.get('skipId');

  if (!skipId) {
    return Response.json({ error: 'skipId is required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('attendance_skips')
    .delete()
    .eq('id', skipId);

  if (error) {
    console.error('[DELETE /api/attendance/skip]', error.message);
    return Response.json({ error: 'Failed to delete skip' }, { status: 500 });
  }

  return Response.json({ success: true });
}
