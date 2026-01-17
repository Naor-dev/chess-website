'use client';

import { useAuth } from '@/contexts/AuthContext';

/**
 * Google icon SVG component.
 */
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Chess icon SVG component.
 */
function ChessIcon() {
  return (
    <svg
      className="h-16 w-16 text-zinc-900 dark:text-zinc-100"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M19 22H5v-2h14v2M17.16 8.26A8.94 8.94 0 0 1 21 15c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2 0-3.28 1.76-6.15 4.38-7.71A3.987 3.987 0 0 1 7 6c0-1.65 1.07-3.05 2.56-3.56L12 2l2.44.44C15.93 2.95 17 4.35 17 6c0 .83-.25 1.6-.68 2.24l.84.02M12 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

export default function Home() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-16 px-8 bg-white dark:bg-black">
        {/* Logo */}
        <div className="mb-8">
          <ChessIcon />
        </div>

        {/* Title */}
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Chess Website
        </h1>
        <p className="mb-12 max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
          Play chess against an AI engine. Choose your difficulty level and time control.
        </p>

        {/* Auth Section */}
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
            <span className="text-zinc-600 dark:text-zinc-400">Loading...</span>
          </div>
        ) : isAuthenticated ? (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-lg text-zinc-900 dark:text-zinc-100">
                Welcome, <span className="font-semibold">{user?.displayName}</span>
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">{user?.email}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Primary CTA - Green accent for "play/go" action */}
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 font-medium text-white shadow-sm transition-all hover:bg-emerald-500 hover:shadow-md active:scale-[0.98]"
                onClick={() => {
                  // TODO: Navigate to new game
                  alert('New game coming soon!');
                }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                New Game
              </button>
              {/* Secondary action - Subtle styling */}
              <button
                className="flex h-12 items-center justify-center rounded-full border border-zinc-300 px-8 font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={login}
            className="flex h-14 items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white px-8 font-medium text-zinc-700 shadow-md transition-all hover:border-zinc-300 hover:shadow-lg active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-zinc-500 dark:text-zinc-600">
          <p>Play against Stockfish AI with 5 difficulty levels</p>
        </footer>
      </main>
    </div>
  );
}
