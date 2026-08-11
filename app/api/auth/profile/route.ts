import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabaseServer';

/**
 * PATCH /api/auth/profile
 *
 * Allows a user (Faculty or HOD) to update their own profile name.
 * Reads the target user ID securely from the session.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name } = body;

    if (typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'Full name is required and cannot be empty' }, { status: 400 });
    }

    const trimmedName = full_name.trim();

    // No role check needed — any logged in user can update their own name
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: trimmedName })
      .eq('id', user.id)
      .select('full_name')
      .single();

    if (error || !data) {
      console.error('[PATCH /api/auth/profile] Update Error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, full_name: data.full_name });
  } catch (err) {
    console.error('Error in PATCH /api/auth/profile:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
