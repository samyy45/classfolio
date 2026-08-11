/**
 * POST /api/auth/login
 * Phase 1 — security.md §2, §4.1 | rules.md §9
 */

import { loginLimiter } from '@/lib/rateLimiter';
import { createClient } from '@/lib/supabaseServer';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  // Step 1: Rate-limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  try {
    await loginLimiter.consume(ip);
  } catch {
    return Response.json(
      { error: 'Too many login attempts. Try again in 15 minutes.' },
      { status: 429 }
    );
  }

  // Step 2: Parse body
  let email: string;
  let password: string;

  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    email    = typeof body.email    === 'string' ? body.email.trim() : '';
    password = typeof body.password === 'string' ? body.password     : '';
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Step 3: Validate
  if (!email) {
    return Response.json({ error: 'Email is required.' }, { status: 400 });
  }
  if (!password) {
    return Response.json({ error: 'Password is required.' }, { status: 400 });
  }

  // Step 4: Authenticate — uses SSR client so session cookie is set automatically
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.signInWithPassword({ email, password });

  if (authError || !user) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  // Step 5: Get role from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return Response.json(
      { error: 'Account profile not found. Contact your HOD.' },
      { status: 401 }
    );
  }

  // Step 6: Return role for client-side redirect
  return Response.json({ role: profile.role as 'hod' | 'faculty' }, { status: 200 });
}
