import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const studentId = parseInt(id, 10);
  if (isNaN(studentId)) {
    return Response.json({ error: 'Invalid student id' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('entrance_scores')
    .select('*')
    .eq('student_id', studentId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[GET /api/students/[id]/academic]', error.message);
    return Response.json({ error: 'Failed to fetch academic scores' }, { status: 500 });
  }

  return Response.json({ data: data || null });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const studentId = parseInt(id, 10);
  if (isNaN(studentId)) {
    return Response.json({ error: 'Invalid student id' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = await createClient();
  
  const payload = {
    ...body,
    student_id: studentId,
    updated_by: user.id
  };

  // Upsert since student_id is UNIQUE in entrance_scores
  const { data, error } = await supabase
    .from('entrance_scores')
    .upsert(payload, { onConflict: 'student_id' })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/students/[id]/academic]', error.message);
    return Response.json({ error: 'Failed to save academic scores' }, { status: 500 });
  }

  return Response.json({ data });
}
