import { NextRequest } from 'next/server';
import { getSessionUser, getUserProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';

/**
 * GET /api/divisions
 *
 * Returns all active divisions sorted by name.
 * Response: { id, name }[]
 * Auth: any authenticated user.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[GET /api/divisions]', error.message);
    return Response.json({ error: 'Failed to fetch divisions' }, { status: 500 });
  }

  return Response.json(data ?? []);
}

/**
 * POST /api/divisions
 *
 * Creates a new division. HOD only (rules.md §8).
 * Body: { name: string }
 * Response 201: the created division row
 * Response 403: if caller is not HOD
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role check — HOD only
  const profile = await getUserProfile(user.id);
  if (!profile || profile.role !== 'hod') {
    return Response.json({ error: 'Forbidden — HOD only' }, { status: 403 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name   = body.name?.trim();
  if (!name) {
    return Response.json({ error: 'Name is required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('divisions')
    .insert({ name })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: `Division "${name}" already exists` }, { status: 409 });
    }
    console.error('[POST /api/divisions]', error.message);
    return Response.json({ error: 'Failed to create division' }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
