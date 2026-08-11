import { createClient } from '@/lib/supabaseServer';
import type { Profile } from '@/types';

/**
 * Auth helpers — used in API routes and Server Components
 *
 * These functions use the server-side Supabase client (service role key)
 * from lib/supabaseServer.ts. They must NEVER be imported from client
 * components (files with 'use client' directive) — Rule 2.
 */

/**
 * Get the currently authenticated Supabase user from the session cookies.
 * Returns the user object or null if not authenticated.
 *
 * Usage: const user = await getSessionUser();
 */
export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get the profile row from the 'profiles' table for a given user ID.
 * Returns the profile row or null if not found.
 *
 * @param userId - The UUID of the user (from auth.users)
 */
export async function getUserProfile(
  userId: string
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile as Profile;
}

/**
 * Check if the currently authenticated user has the 'hod' role.
 * Returns true if the user is authenticated AND has role = 'hod'.
 *
 * This combines getSessionUser() + getUserProfile() + role check
 * into a single convenience function for HOD-only API routes.
 *
 * Usage (per rules.md §8):
 *   if (!(await isHOD())) {
 *     return Response.json({ error: 'Forbidden' }, { status: 403 });
 *   }
 */
export async function isHOD(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) {
    return false;
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    return false;
  }

  return profile.role === 'hod';
}
