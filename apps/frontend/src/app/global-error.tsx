'use client';

import { useEffect } from 'react';

/**
 * Global error boundary for the application.
 * This catches errors in the root layout itself, which error.tsx cannot catch.
 * It must include its own <html> and <body> tags since the root layout has failed.
 *
 * Note: Sentry integration will be added in Task 1.2
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Global error:', error);

    // TODO: When Sentry is integrated (Task 1.2), add:
    // Sentry.captureException(error, { tags: { boundary: 'global' } });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-gray-900">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="max-w-md text-center">
            {/* Critical error icon */}
            <div className="mb-6 text-6xl">
              <span role="img" aria-label="warning">
                &#9888;
              </span>
            </div>

            <h2 className="mb-4 text-2xl font-bold text-white">Critical Error</h2>

            <p className="mb-6 text-gray-400">
              The application encountered a critical error. Please try refreshing the page.
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
                className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-800"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
