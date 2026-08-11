import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Supabase Session Client (SSR-aware)
 *
 * Used in API routes that need to read/write the user's session cookie,
 * e.g. login (signInWithPassword) and logout (signOut).
 * Uses service role key + cookie adapter from @supabase/ssr.
 *
 * IMPORTANT: Never import from 'use client' files — Rule 2.
 * SUPABASE_SERVICE_ROLE_KEY must never be prefixed NEXT_PUBLIC_ — Rule 10.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookies cannot be set.
            // Safe to ignore if proxy.ts is refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Supabase Admin Client (plain, no cookie adapter)
 *
 * Used ONLY for auth.admin.* operations (createUser, deleteUser).
 * The @supabase/ssr cookie wrapper is not needed — and can interfere with —
 * admin HTTP calls. This plain client makes clean outbound requests using
 * only the service role key.
 *
 * Safe to use in server-only API route files (no 'use client' directive).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
