import type { AuthResponse, User } from '@chess-website/shared';

/**
 * CSRF cookie and header names.
 * Must match values in apps/frontend/src/lib/csrf.ts
 */
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Reads a cookie value by name from document.cookie.
 * Returns undefined if cookie not found or running server-side.
 */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift();
  }
  return undefined;
}

/**
 * API service for authentication operations.
 * Uses BFF pattern - all auth goes through Next.js API routes:
 * - JWT stored in HttpOnly cookie (not accessible to JS)
 * - CSRF protection via double-submit cookie pattern
 * - Works in ALL browsers (first-party cookies)
 * - No third-party cookie issues
 */
export const authApi = {
  /**
   * Get the current authenticated user.
   * Calls /api/auth/me which reads JWT from HttpOnly cookie.
   * @returns User data if authenticated, null otherwise
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data: { success: boolean; data: AuthResponse } = await response.json();
      return data.data.user;
    } catch {
      return null;
    }
  },

  /**
   * Logout the current user.
   * Clears the HttpOnly cookie via /api/auth/logout.
   * Includes CSRF token for protection against cross-site logout attacks.
   */
  async logout(): Promise<void> {
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
    const headers: HeadersInit = {};
    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken;
    }
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers,
    });
  },

  /**
   * Logout from all devices.
   * Invalidates all tokens on backend and clears cookie.
   * Includes CSRF token for protection against cross-site logout attacks.
   */
  async logoutAll(): Promise<void> {
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
    const headers: HeadersInit = {};
    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken;
    }
    await fetch('/api/auth/logout-all', {
      method: 'POST',
      credentials: 'include',
      headers,
    });
  },

  /**
   * Get the Google OAuth login URL.
   * Returns local route which redirects to Google.
   * @returns URL to initiate Google OAuth
   */
  getGoogleLoginUrl(): string {
    return '/api/auth/google';
  },
};
