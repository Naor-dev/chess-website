'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Root error boundary for the application.
 * Catches runtime errors in the app route tree and displays a fallback UI.
 *
 * Note: Sentry integration will be added in Task 1.2
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error);

    // TODO: When Sentry is integrated (Task 1.2), add:
    // Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 px-4">
      <div className="max-w-md text-center">
        {/* Chess-themed error icon */}
        <div className="mb-6 text-6xl">
          <span role="img" aria-label="fallen king">
            &#9818;
          </span>
        </div>

        <h2 className="mb-4 text-2xl font-bold text-white">Something went wrong!</h2>

        <p className="mb-6 text-gray-400">
          An unexpected error occurred. Don&apos;t worry, your game progress is saved.
        </p>

        {/* Show error message in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-lg bg-red-900/30 p-4 text-left">
            <p className="mb-2 text-sm font-semibold text-red-400">Error Details:</p>
            <p className="font-mono text-sm text-red-300">{error.message}</p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-red-400">Digest: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
