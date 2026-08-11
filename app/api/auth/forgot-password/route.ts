import { forgotPasswordLimiter } from '@/lib/rateLimiter';
import { createAdminClient } from '@/lib/supabaseServer';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  // Rate-limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  try {
    await forgotPasswordLimiter.consume(ip);
  } catch {
    return Response.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429 }
    );
  }

  // Parse body
  let email: string;
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === 'string' ? body.email.trim() : '';
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!email) {
    return Response.json({ error: 'Email is required.' }, { status: 400 });
  }

  const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

  try {
    const supabase = createAdminClient();

    // Query profiles table to ensure role is faculty
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', email)
      .single();

    if (profileError || !profile || profile.role !== 'faculty') {
      // Return success to avoid email enumeration
      return Response.json({ message: genericMessage }, { status: 200 });
    }

    // Generate redirect URL
    const requestUrl = new URL(request.url);
    const redirectTo = `${requestUrl.origin}/reset-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      console.error('[forgot-password] resetPasswordForEmail error:', resetError);
    }
  } catch (error) {
    console.error('[forgot-password] unexpected exception during password reset:', error);
  }

  return Response.json({ message: genericMessage }, { status: 200 });
}
