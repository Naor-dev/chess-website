'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'unknown_error';

  const errorMessages: Record<string, string> = {
    auth_failed: "We couldn't sign you in. This might be a temporary issue.",
    access_denied: 'You declined the sign-in request. No worries, you can try again anytime.',
    unknown_error: 'Something went wrong on our end. Please try again.',
  };

  const message = errorMessages[error] || errorMessages.unknown_error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="max-w-md text-center px-6">
        {/* Friendly icon - softer amber instead of harsh red */}
        <div className="mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <svg
              className="h-8 w-8 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <h1 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Oops! Sign-in didn&apos;t work
        </h1>
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">{message}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {/* Primary action - Try again */}
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-600 px-6 font-medium text-white transition-all hover:bg-emerald-500 hover:shadow-md active:scale-[0.98]"
          >
            Try again
          </Link>
          {/* Secondary action - Go home */}
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-6 font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Auth error page.
 * Displays error message when OAuth fails.
 */
export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
