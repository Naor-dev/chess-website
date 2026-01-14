import apiClient from './apiClient';
import type { AuthResponse, User } from '@chess-website/shared';

/**
 * API service for authentication operations.
 */
export const authApi = {
  /**
   * Get the current authenticated user.
   * @returns User data if authenticated, null otherwise
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<AuthResponse>('/auth/me');
      return response.data.user;
    } catch {
      return null;
    }
  },

  /**
   * Logout the current user.
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  /**
   * Logout from all devices.
   */
  async logoutAll(): Promise<void> {
    await apiClient.post('/auth/logout-all');
  },

  /**
   * Get the Google OAuth login URL.
   * @returns Full URL to initiate Google OAuth
   */
  getGoogleLoginUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    return `${baseUrl}/auth/google`;
  },
};
