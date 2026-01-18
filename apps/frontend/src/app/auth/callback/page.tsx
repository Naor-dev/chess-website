'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * OAuth callback page.
 * Handles the redirect after successful Google authentication.
 * The cookie is already set by the backend, we just need to refresh user state.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Refresh user data to get the authenticated user
      await refreshUser();
      // Redirect to home page
      router.push('/');
    };

    handleCallback();
  }, [refreshUser, router]);

  return (
    <div className="flex min-h-screen items-center justify-center gradient-bg chess-pattern">
      <div className="rounded-2xl bg-white/80 p-10 text-center backdrop-blur-sm dark:bg-zinc-900/80 shadow-xl fade-in">
        {/* Animated logo */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
              <svg className="h-8 w-8 text-white" viewBox="0 0 45 45" fill="currentColor">
                <g fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
                  <path
                    d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="currentColor"
                  />
                  <path
                    d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="currentColor"
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Loading spinner */}
        <div className="mb-4 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-500" />
        </div>

        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Signing you in...</p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          Just a moment while we set things up
        </p>
      </div>
    </div>
  );
}
