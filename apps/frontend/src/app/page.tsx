'use client';

import { useRouter } from 'next/navigation';
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
 * Animated chess knight icon.
 */
function ChessKnightIcon() {
  return (
    <svg
      className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 text-emerald-600 dark:text-emerald-500 drop-shadow-lg"
      viewBox="0 0 45 45"
      fill="currentColor"
    >
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
        <circle cx="9" cy="25.5" r="0.5" fill="#fff" stroke="none" />
        <path
          d="M 17.5,15.5 A 0.5,1.5 0 1 1 16.5,15.5 A 0.5,1.5 0 1 1 17.5,15.5 z"
          transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
          fill="#fff"
          stroke="none"
        />
      </g>
    </svg>
  );
}

/**
 * Decorative chess piece (pawn) for background.
 */
function DecorativePawn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 45 45" fill="currentColor" opacity="0.05">
      <path d="M22.5,9c-2.21,0-4,1.79-4,4c0,0.89,0.29,1.71,0.78,2.38C17.33,16.5,16,18.59,16,21c0,2.03,0.94,3.84,2.41,5.03C15.41,27.09,11,31.58,11,39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06,24.84,29,23.03,29,21c0-2.41-1.33-4.5-3.28-5.62c0.49-0.67,0.78-1.49,0.78-2.38C26.5,10.79,24.71,9,22.5,9z" />
    </svg>
  );
}

/**
 * Feature card component.
 */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 rounded-2xl bg-white/60 p-4 sm:p-6 backdrop-blur-sm dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
        {icon}
      </div>
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden gradient-bg chess-pattern">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <DecorativePawn className="absolute -left-10 top-20 h-64 w-64 text-emerald-600 dark:text-emerald-400 rotate-12 hidden md:block" />
        <DecorativePawn className="absolute -right-10 bottom-20 h-48 w-48 text-emerald-600 dark:text-emerald-400 -rotate-12 hidden md:block" />
        <div className="absolute left-1/2 top-0 h-[300px] w-[300px] md:h-[400px] md:w-[400px] lg:h-[500px] lg:w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/5" />
      </div>

      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12 md:py-16">
        {/* Logo Section */}
        <div className="mb-8 float">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl" />
            <div className="relative rounded-full bg-gradient-to-br from-emerald-50 to-white p-4 shadow-xl dark:from-zinc-800 dark:to-zinc-900 glow">
              <ChessKnightIcon />
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="mb-12 text-center fade-in">
          <h1 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Chess<span className="text-emerald-600 dark:text-emerald-500">Master</span>
          </h1>
          <p className="mx-auto max-w-md text-lg text-zinc-600 dark:text-zinc-400">
            Challenge yourself against Stockfish AI. Choose your difficulty and time control.
          </p>
        </div>

        {/* Auth Section */}
        <div className="w-full max-w-md fade-in" style={{ animationDelay: '0.2s' }}>
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl bg-white/80 p-8 backdrop-blur-sm dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Loading...</span>
            </div>
          ) : isAuthenticated ? (
            <div className="rounded-2xl bg-white/80 p-8 backdrop-blur-sm dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xl font-bold text-white shadow-lg">
                  {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {user?.displayName}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500">{user?.email}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  className="group flex h-14 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
                  onClick={() => router.push('/game/new')}
                >
                  <svg
                    className="h-5 w-5 transition-transform group-hover:scale-110"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Start New Game
                </button>
                <button
                  className="group flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-300 px-8 font-medium text-zinc-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                  onClick={() => router.push('/history')}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  Game History
                </button>
                <button
                  className="flex h-12 items-center justify-center rounded-xl border border-zinc-300 px-8 font-medium text-zinc-600 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  onClick={logout}
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/80 p-8 backdrop-blur-sm dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl">
              <p className="mb-6 text-center text-zinc-600 dark:text-zinc-400">
                Sign in to start playing
              </p>
              <button
                onClick={login}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-8 font-medium text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="mt-10 sm:mt-12 md:mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 stagger-children">
          <FeatureCard
            icon={
              <svg
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            }
            title="5 Difficulty Levels"
            description="From beginner to master, find your perfect challenge"
          />
          <FeatureCard
            icon={
              <svg
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            }
            title="Time Controls"
            description="Bullet, Blitz, Rapid, or Classical - you choose"
          />
          <FeatureCard
            icon={
              <svg
                className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17,21 17,13 7,13 7,21" />
                <polyline points="7,3 7,8 15,8" />
              </svg>
            }
            title="Save Progress"
            description="Your games are saved so you can continue anytime"
          />
        </div>

        {/* Footer */}
        <footer className="mt-10 sm:mt-12 md:mt-16 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-600">
            Powered by{' '}
            <span className="font-medium text-emerald-600 dark:text-emerald-500">Stockfish</span>{' '}
            chess engine
          </p>
        </footer>
      </main>
    </div>
  );
}
