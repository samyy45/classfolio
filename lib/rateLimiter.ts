import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Rate Limiting — security.md §4
 *
 * Uses in-memory store via rate-limiter-flexible package.
 * Sufficient for this scale (single department, <20 teachers).
 *
 * Note: In-memory store resets on server restart. This is acceptable
 * for a low-traffic internal tool — security.md explicitly states
 * we don't need to protect against large-scale attacks.
 */

/**
 * Login rate limiter — security.md §4.1
 * Maximum: 10 attempts per IP per 15 minutes
 *
 * Usage in /api/auth/login/route.ts:
 *   try {
 *     await loginLimiter.consume(ip);
 *   } catch {
 *     return Response.json(
 *       { error: 'Too many login attempts. Try again in 15 minutes.' },
 *       { status: 429 }
 *     );
 *   }
 */
export const loginLimiter = new RateLimiterMemory({
  points: 10,     // 10 attempts
  duration: 900,  // per 15 minutes (900 seconds)
});

/**
 * Register rate limiter — security.md §4.2
 * Maximum: 5 attempts per IP per 1 hour
 * Prevents automated account creation attempts.
 */
export const registerLimiter = new RateLimiterMemory({
  points: 5,       // 5 attempts
  duration: 3600,  // per 1 hour (3600 seconds)
});

/**
 * Forgot password rate limiter
 * Maximum: 5 attempts per IP per 1 hour
 * Prevents automated email enumeration/spam.
 */
export const forgotPasswordLimiter = new RateLimiterMemory({
  points: 5,       // 5 attempts
  duration: 3600,  // per 1 hour (3600 seconds)
});

