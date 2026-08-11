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
    .from('student_fees')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/students/[id]/fees]', error.message);
    return Response.json({ error: 'Failed to fetch fees' }, { status: 500 });
  }

  return Response.json({ data: data || [] });
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

  let query;
  if (payload.id) {
    query = supabase.from('student_fees').update(payload).eq('id', payload.id).select().single();
  } else {
    query = supabase.from('student_fees').insert(payload).select().single();
  }

  const { data, error } = await query;
  if (error) {
    console.error('[POST /api/students/[id]/fees]', error.message);
    return Response.json({ error: 'Failed to save fee record' }, { status: 500 });
  }

  return Response.json({ data });
}
