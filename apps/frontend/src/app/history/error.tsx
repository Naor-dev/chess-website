'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

/**
 * Error boundary for the history page.
 * Provides history-specific error messaging and navigation options.
 */
export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('History page error:', error);

    // Capture history-specific error in Sentry with explicit context
    Sentry.captureException(error, {
      tags: {
        boundary: 'history',
        page: 'history',
        errorDigest: error.digest ?? 'none',
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 px-4">
      <div className="max-w-md text-center">
        {/* Chess-themed error icon */}
        <div className="mb-6 text-6xl">
          <span role="img" aria-label="chess pieces">
            &#9814;&#9820;
          </span>
        </div>

        <h2 className="mb-4 text-2xl font-bold text-white">Could not load game history</h2>

        <p className="mb-6 text-gray-400">
          We encountered an error while loading your games. This might be a temporary issue.
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

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Try again
          </button>

          <Link
            href="/game/new"
            className="w-full rounded-lg border border-emerald-600/50 px-6 py-3 font-semibold text-emerald-400 transition-colors hover:bg-emerald-900/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Start New Game
          </Link>

          <Link
            href="/"
            className="w-full rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
