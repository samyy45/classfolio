/**
 * POST /api/auth/logout
 * Phase 1 — clears session cookies via Supabase SSR client
 */

import { createClient } from '@/lib/supabaseServer';

export async function POST() {
  // Step 1: Create SSR-aware client (needed to clear the session cookie)
  const supabase = await createClient();

  // Step 2: Sign out — clears the cookie via the SSR adapter
  await supabase.auth.signOut();

  // Step 3: Return 200
  return Response.json({ message: 'Logged out' }, { status: 200 });
}
