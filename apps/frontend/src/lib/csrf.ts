import crypto from 'crypto';

/**
 * CSRF Protection using Double-Submit Cookie Pattern
 *
 * Flow:
 * 1. On login, BFF sets CSRF token in non-HttpOnly cookie (JS can read)
 * 2. Frontend reads cookie, sends in X-CSRF-Token header on mutating requests
 * 3. BFF proxy validates: cookie token == header token
 * 4. Returns 403 if validation fails
 *
 * Following secure-coding guidelines: explicit security configuration.
 */

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Generates a cryptographically secure CSRF token.
 * Uses 32 bytes (256 bits) of entropy for security.
 * @returns Hex-encoded random token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates CSRF token using constant-time comparison.
 * Following secure-coding guidelines: use timingSafeEqual to prevent timing attacks.
 *
 * @param cookieToken - Token from cookie
 * @param headerToken - Token from request header (accepts null from Headers.get())
 * @returns True if tokens match, false otherwise
 */
export function validateCsrfToken(
  cookieToken: string | undefined | null,
  headerToken: string | undefined | null
): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Tokens must be same length for timingSafeEqual
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  } catch {
    // Buffer creation failed (e.g., invalid encoding)
    return false;
  }
}

/**
 * Returns cookie options for CSRF token.
 * Following secure-coding guidelines: explicit cookie attributes.
 *
 * Key differences from auth cookie:
 * - httpOnly: false (JS must read it to send in header)
 * - sameSite: 'lax' (allows normal navigation but blocks cross-origin POST)
 */
export function getCsrfCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: false, // JS must read this cookie to send in header
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax' as const, // CSRF protection (Lax blocks cross-origin POST)
    path: '/', // Explicit scope
    maxAge: 7 * 24 * 60 * 60, // 7 days (match auth cookie lifetime)
  };
}

/**
 * Determines if CSRF validation should be skipped.
 * Skips in development and test environments for easier testing.
 * Similar pattern to rate limiter configuration.
 */
export function shouldSkipCsrfValidation(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}
