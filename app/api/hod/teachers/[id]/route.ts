import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabaseServer';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Role check (caller)
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'hod') {
      return NextResponse.json({ error: 'Forbidden — HOD only' }, { status: 403 });
    }

    const resolvedParams = await context.params;
    const targetUserId = resolvedParams.id;
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    // 3. Check target user
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    if (targetProfile.role === 'hod') {
      return NextResponse.json({ error: 'Cannot remove another HOD account.' }, { status: 403 });
    }

    // 4. Delete user using admin API
    const adminSupabase = createAdminClient();
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      console.error('[DELETE /api/hod/teachers/[id]] Admin deleteUser failed:', deleteError.message);
      
      // Specific error handling for FK constraint violations if migration is missing
      if (deleteError.message?.includes('foreign key constraint') || deleteError.message?.includes('violates foreign key constraint')) {
        return NextResponse.json({ 
          error: 'Cannot delete teacher. They have associated records (edits or uploads). Please run the SET NULL migration.' 
        }, { status: 409 });
      }

      return NextResponse.json({ 
        error: deleteError.message || 'Failed to delete user.' 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in DELETE /api/hod/teachers/[id]:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
