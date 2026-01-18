import type { AuthResponse, User } from '@chess-website/shared';

/**
 * API service for authentication operations.
 * Uses BFF pattern - all auth goes through Next.js API routes:
 * - JWT stored in HttpOnly cookie (not accessible to JS)
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
   */
  async logout(): Promise<void> {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  },

  /**
   * Logout from all devices.
   * Invalidates all tokens on backend and clears cookie.
   */
  async logoutAll(): Promise<void> {
    await fetch('/api/auth/logout-all', {
      method: 'POST',
      credentials: 'include',
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
