import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Route protection proxy — Next.js 16 convention (replaces middleware.ts)
 *
 * Rules (from architecture.md §4.4 + security.md §5.3):
 *   /login, /register                → public (no auth check)
 *   /(faculty)/* → /dashboard, /students, /upload  → logged-in (faculty OR hod)
 *   /hod/*       → /hod/dashboard, /hod/teachers   → logged-in as HOD only
 *   Wrong role   → redirect to their correct dashboard
 *   Logged-in user on /login or /register → redirect to their dashboard
 */

// Paths that are always public — no session check needed
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

// HOD-only paths
const HOD_PATHS = ['/hod'];

// Protected paths that both faculty and HOD can access
const PROTECTED_PATHS = ['/dashboard', '/students', '/upload'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Create a Supabase client using the request cookies (anon key for session check)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // We'll apply these to the response below
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
        },
      },
    }
  );

  // Get the current session user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // --- Public pages: if already logged in, redirect to dashboard ---
  if (isPublicPath) {
    if (user) {
      // Check role to send them to the right dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'hod') {
        return NextResponse.redirect(new URL('/hod/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Not logged in, accessing public page → allow
    return NextResponse.next();
  }

  // --- All routes below require authentication ---
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch user role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role;

  // --- HOD-only paths ---
  const isHodPath = HOD_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isHodPath) {
    if (userRole !== 'hod') {
      // Faculty trying to access HOD pages → redirect to faculty dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // --- Protected paths (faculty + hod) ---
  const isProtectedPath = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtectedPath) {
    // Both faculty and HOD are allowed — but HOD accessing /dashboard should
    // go to /hod/dashboard for the correct experience
    if (pathname === '/dashboard' && userRole === 'hod') {
      return NextResponse.redirect(new URL('/hod/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // --- Root path ---
  if (pathname === '/') {
    if (userRole === 'hod') {
      return NextResponse.redirect(new URL('/hod/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Default: allow through
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
