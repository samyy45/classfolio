/**
 * POST /api/auth/register
 * Phase 1 — security.md §2, §4.2, §6 | rules.md §3, §9, §10
 */

import { registerLimiter } from '@/lib/rateLimiter';
import { createAdminClient } from '@/lib/supabaseServer';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  // Step 1: Rate-limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  try {
    await registerLimiter.consume(ip);
  } catch {
    return Response.json(
      { error: 'Too many registration attempts. Try again later.' },
      { status: 429 }
    );
  }

  // Step 2: Parse body
  let full_name: string;
  let email: string;
  let password: string;
  let registration_code: string;

  try {
    const body = (await request.json()) as {
      full_name?: unknown;
      email?: unknown;
      password?: unknown;
      registration_code?: unknown;
    };
    full_name         = typeof body.full_name         === 'string' ? body.full_name.trim()         : '';
    email             = typeof body.email             === 'string' ? body.email.trim()             : '';
    password          = typeof body.password          === 'string' ? body.password                 : '';
    registration_code = typeof body.registration_code === 'string' ? body.registration_code        : '';
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Step 5 debug logs (temporary — remove after confirming registration works)
  console.log('[register] body received:', {
    full_name,
    email,
    registration_code: registration_code ? 'provided' : 'missing',
  });
  console.log('[register] env code exists:', !!process.env.FACULTY_REGISTRATION_CODE);
  console.log('[register] codes match:', registration_code === process.env.FACULTY_REGISTRATION_CODE);

  // Step 3: Validate inputs
  if (!full_name) {
    return Response.json({ error: 'Full name is required.' }, { status: 400 });
  }

  if (!email) {
    return Response.json({ error: 'Email is required.' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    );
  }

  // Step 4 (prompt Step 7): Verify registration code
  const expectedCode = process.env.FACULTY_REGISTRATION_CODE;

  if (!expectedCode) {
    console.error('[register] FACULTY_REGISTRATION_CODE env var is not set.');
    return Response.json(
      { error: 'Registration is temporarily unavailable. Contact your HOD.' },
      { status: 500 }
    );
  }

  if (registration_code !== expectedCode) {
    return Response.json(
      { error: 'Invalid staff registration code. Contact your HOD.' },
      { status: 403 }
    );
  }

  // Step 5 (prompt Step 8+9): Create Supabase auth user
  // Uses plain admin client (no cookie adapter) — safe for auth.admin.* calls.
  const supabase = createAdminClient();

  const {
    data: { user: newUser },
    error: createError,
  } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !newUser) {
    console.error('[register] createUser error:', createError?.message);
    return Response.json(
      { error: createError?.message ?? 'Failed to create account. Please try again.' },
      { status: 400 }
    );
  }

  // Step 6 (prompt Step 10): Insert into profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: newUser.id,
      full_name,
      email,
      role: 'faculty',
    });

  if (profileError) {
    console.error('[register] profiles insert error:', profileError.message);
    // Rollback: delete the orphaned auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(newUser.id);
    if (deleteError) {
      console.error('[register] rollback failed — orphaned auth user:', newUser.id, deleteError.message);
    }
    return Response.json(
      { error: 'Failed to save account profile. Please try again.' },
      { status: 500 }
    );
  }

  // Step 7 (prompt Step 11): Success
  console.log('[register] success for:', email);
  return Response.json({ message: 'Account created successfully' }, { status: 200 });
}
