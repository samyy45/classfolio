import { NextRequest } from 'next/server';
import { getSessionUser, getUserProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';

/**
 * PATCH /api/divisions/[id]
 *
 * Edits an existing division's name. HOD only (rules.md §8).
 * Body: { name: string }
 * Response 200: the updated division row
 * Response 403: if caller is not HOD
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role check — HOD only
  const profile = await getUserProfile(user.id);
  if (!profile || profile.role !== 'hod') {
    return Response.json({ error: 'Forbidden — HOD only' }, { status: 403 });
  }

  const p = await params;
  const divisionId = parseInt(p.id, 10);
  if (isNaN(divisionId)) {
    return Response.json({ error: 'Invalid division ID' }, { status: 400 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: 'Name is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Check if a division with the SAME name already exists (excluding this one)
  const { data: existingDivisions, error: checkError } = await supabase
    .from('divisions')
    .select('id')
    .ilike('name', name)
    .neq('id', divisionId);

  if (checkError) {
    console.error('[PATCH /api/divisions/[id]] Check error:', checkError.message);
    return Response.json({ error: 'Failed to validate division name' }, { status: 500 });
  }

  if (existingDivisions && existingDivisions.length > 0) {
    return Response.json({ error: `A division with the name "${name}" already exists` }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('divisions')
    .update({ name })
    .eq('id', divisionId)
    .select()
    .single();

  if (error) {
    console.error('[PATCH /api/divisions/[id]]', error.message);
    return Response.json({ error: 'Failed to update division' }, { status: 500 });
  }

  return Response.json(data);
}
