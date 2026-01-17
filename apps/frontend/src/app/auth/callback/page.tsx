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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100 mx-auto"></div>
        <p className="text-zinc-600 dark:text-zinc-400">Signing you in...</p>
      </div>
    </div>
  );
}
