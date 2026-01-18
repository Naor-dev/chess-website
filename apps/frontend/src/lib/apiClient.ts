import axios from 'axios';

/**
 * API client configured to use the BFF proxy.
 * All requests go through /api/proxy which:
 * - Reads JWT from HttpOnly cookie (not accessible to JS)
 * - Forwards to backend with Authorization header
 * - Works in ALL browsers (first-party cookies)
 */
const apiClient = axios.create({
  baseURL: '/api/proxy',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors - but not for auth routes (expected behavior)
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/');
      if (!isAuthRoute && typeof window !== 'undefined') {
        // Only redirect for non-auth routes
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
