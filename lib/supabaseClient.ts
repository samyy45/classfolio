import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase Browser Client
 *
 * Used in React components (client-side) for reading data with the user's session.
 * NEVER use this for database writes — all writes must go through API routes
 * using the server client (Rule 2 from rules.md).
 *
 * This client uses the anon key, which is safe to expose in the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
