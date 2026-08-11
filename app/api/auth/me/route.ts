import { getSessionUser, getUserProfile } from '@/lib/auth';

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile from the 'profiles' table.
 * Uses getSessionUser() to read the session cookie server-side, then
 * fetches full_name, email, role from the profiles table.
 *
 * Responses:
 *   200  { full_name, email, role }
 *   401  { error: 'Unauthorized' }      — no valid session
 *   404  { error: 'Profile not found' } — session valid but no profile row
 */
export async function GET() {
  // 1. Verify the user has a valid session
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch their profile row from the profiles table
  const profile = await getUserProfile(user.id);
  if (!profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404 });
  }

  // 3. Return only the fields the client needs (never expose the UUID here)
  return Response.json({
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
  });
}
