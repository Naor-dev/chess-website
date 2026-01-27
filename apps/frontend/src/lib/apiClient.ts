import axios from 'axios';

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
 * API client configured to use the BFF proxy.
 * All requests go through /api/proxy which:
 * - Reads JWT from HttpOnly cookie (not accessible to JS)
 * - Forwards to backend with Authorization header
 * - Validates CSRF token for mutating requests
 * - Works in ALL browsers (first-party cookies)
 */
const apiClient = axios.create({
  baseURL: '/api/proxy',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add CSRF token header on mutating requests.
 * Following secure-coding guidelines: explicit CSRF protection.
 */
apiClient.interceptors.request.use((config) => {
  const mutatingMethods = ['post', 'put', 'delete', 'patch'];
  if (mutatingMethods.includes(config.method?.toLowerCase() || '')) {
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }
  return config;
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
