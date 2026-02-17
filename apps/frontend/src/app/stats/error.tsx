'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function StatsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Stats page error:', error);

    Sentry.captureException(error, {
      tags: {
        boundary: 'stats',
        page: 'stats',
        errorDigest: error.digest ?? 'none',
      },
    });
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 px-4"
    >
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">
          <span role="img" aria-label="chart">
            &#9814;&#9820;
          </span>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-white">Could not load statistics</h1>

        <p className="mb-6 text-gray-300">
          We encountered an error while loading your statistics. This might be a temporary issue.
        </p>

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
            className="w-full rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Try again
          </button>

          <Link
            href="/"
            className="w-full rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
