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

  if (!date) {
    return Response.json({ error: 'date is required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .eq('date', date)
    .maybeSingle();

  if (error) {
    console.error('[GET /api/holidays]', error.message);
    return Response.json({ error: 'Failed to fetch holiday' }, { status: 500 });
  }

  return Response.json({ isHoliday: !!data, holiday: data });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  
  // Verify HOD role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'hod') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { date, isHoliday, description = '' } = await request.json();

    if (!date) {
      return Response.json({ error: 'date is required' }, { status: 400 });
    }

    if (isHoliday) {
      const { error } = await supabase
        .from('holidays')
        .upsert({ date, description, created_by: user.id });

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('date', date);

      if (error) throw error;
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/holidays]', err.message);
    return Response.json({ error: 'Failed to update holiday' }, { status: 500 });
  }
}
