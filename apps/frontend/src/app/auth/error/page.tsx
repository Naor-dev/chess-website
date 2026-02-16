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
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center gradient-bg chess-pattern"
    >
      <div className="max-w-md rounded-2xl bg-white/80 px-8 py-10 text-center backdrop-blur-sm dark:bg-zinc-900/80 shadow-xl fade-in">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <svg
              className="h-10 w-10 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h1 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Oops! Sign-in didn&apos;t work
        </h1>
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">{message}</p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try again
          </Link>
          <Link
            href="/"
            className="flex h-12 items-center justify-center rounded-xl border-2 border-zinc-200 px-6 font-medium text-zinc-600 transition-all hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            Go back home
          </Link>
        </div>

        {/* Help text */}
        <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-600">
          If this keeps happening, try clearing your browser cookies or using a different browser.
        </p>
      </div>
    </main>
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
        <main
          id="main-content"
          className="flex min-h-screen items-center justify-center gradient-bg chess-pattern"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-8 backdrop-blur-sm dark:bg-zinc-900/80">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-500" />
            <span className="text-zinc-600 dark:text-zinc-400">Loading...</span>
          </div>
        </main>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
