'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { gameApi } from '@/lib/gameApi';
import type { DifficultyLevel, TimeControlType } from '@chess-website/shared';

const DIFFICULTY_OPTIONS: {
  value: DifficultyLevel;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: 1, label: 'Beginner', description: 'Perfect for learning the basics', icon: '1' },
  { value: 2, label: 'Easy', description: 'Casual play with forgiving AI', icon: '2' },
  { value: 3, label: 'Medium', description: 'Balanced challenge for most players', icon: '3' },
  { value: 4, label: 'Hard', description: 'Strong AI that punishes mistakes', icon: '4' },
  { value: 5, label: 'Master', description: 'Near-maximum engine strength', icon: '5' },
];

const TIME_CONTROL_OPTIONS: {
  value: TimeControlType;
  label: string;
  time: string;
  color: string;
}[] = [
  { value: 'none', label: 'No Clock', time: 'Unlimited', color: 'zinc' },
  { value: 'bullet_1min', label: 'Bullet', time: '1 min', color: 'red' },
  { value: 'bullet_2min', label: 'Bullet', time: '2 min +1s', color: 'red' },
  { value: 'blitz_3min', label: 'Blitz', time: '3 min', color: 'amber' },
  { value: 'blitz_5min', label: 'Blitz', time: '5 min', color: 'amber' },
  { value: 'rapid_10min', label: 'Rapid', time: '10 min', color: 'blue' },
  { value: 'rapid_15min', label: 'Rapid', time: '15 min +10s', color: 'blue' },
  { value: 'classical_30min', label: 'Classical', time: '30 min', color: 'purple' },
];

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          aria-hidden="true"
          key={star}
          className={`h-3.5 w-3.5 ${star <= level ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-700'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function NewGamePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(3);
  const [timeControl, setTimeControl] = useState<TimeControlType>('blitz_5min');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.push('/');
    return null;
  }

  const handleStartGame = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const game = await gameApi.createGame({
        difficultyLevel: difficulty,
        timeControlType: timeControl,
      });
      router.push(`/game/${game.id}`);
    } catch (err) {
      setError('Failed to create game. Please try again.');
      console.error('Failed to create game:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-bg chess-pattern">
        <div
          className="flex items-center gap-3 rounded-2xl bg-white/80 p-8 backdrop-blur-sm dark:bg-zinc-900/80"
          role="status"
          aria-live="polite"
        >
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-500"
            aria-hidden="true"
          />
          <span className="text-zinc-600 dark:text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg chess-pattern">
      {/* Decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-20 top-20 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -left-20 bottom-20 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <main id="main-content" className="relative mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 fade-in">
          <nav aria-label="Breadcrumb">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-600 transition-all hover:bg-white/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
          </nav>

          <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            New Game
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Choose your difficulty level and time control
          </p>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-8 fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <svg
                aria-hidden="true"
                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2
              id="difficulty-label"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Difficulty Level
            </h2>
          </div>

          <div
            role="radiogroup"
            aria-labelledby="difficulty-label"
            className="grid gap-3 stagger-children"
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.value}
                role="radio"
                aria-checked={difficulty === option.value}
                onClick={() => setDifficulty(option.value)}
                className={`group relative flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                  difficulty === option.value
                    ? 'border-emerald-500 bg-emerald-50/80 shadow-lg shadow-emerald-500/10 dark:border-emerald-600 dark:bg-emerald-950/40'
                    : 'border-zinc-200/50 bg-white/60 hover:border-zinc-300 hover:bg-white/80 dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60'
                } backdrop-blur-sm`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold transition-colors ${
                      difficulty === option.value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-zinc-700'
                    }`}
                  >
                    {option.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {option.label}
                      </span>
                      <DifficultyStars level={option.value} />
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {option.description}
                    </p>
                  </div>
                </div>
                {difficulty === option.value && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Time Control Selection */}
        <div className="mb-8 fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <svg
                aria-hidden="true"
                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            </div>
            <h2
              id="time-control-label"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Time Control
            </h2>
          </div>

          <div
            role="radiogroup"
            aria-labelledby="time-control-label"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {TIME_CONTROL_OPTIONS.map((option) => (
              <button
                key={option.value}
                role="radio"
                aria-checked={timeControl === option.value}
                onClick={() => setTimeControl(option.value)}
                className={`group flex flex-col items-center rounded-xl border-2 p-4 transition-all ${
                  timeControl === option.value
                    ? 'border-emerald-500 bg-emerald-50/80 shadow-lg shadow-emerald-500/10 dark:border-emerald-600 dark:bg-emerald-950/40'
                    : 'border-zinc-200/50 bg-white/60 hover:border-zinc-300 hover:bg-white/80 dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60'
                } backdrop-blur-sm`}
              >
                <span
                  className={`text-xl font-bold ${
                    timeControl === option.value
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {option.time}
                </span>
                <span
                  className={`mt-1 text-xs font-medium ${
                    option.color === 'red'
                      ? 'text-red-600 dark:text-red-400'
                      : option.color === 'amber'
                        ? 'text-amber-600 dark:text-amber-400'
                        : option.color === 'blue'
                          ? 'text-blue-600 dark:text-blue-400'
                          : option.color === 'purple'
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-zinc-500 dark:text-zinc-500'
                  }`}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary Card */}
        <div
          className="mb-6 rounded-xl border border-zinc-200/50 bg-white/60 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-900/40 fade-in"
          style={{ animationDelay: '0.3s' }}
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-500">Game Settings</p>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.label}
            </span>
            <span className="text-zinc-400">-</span>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {TIME_CONTROL_OPTIONS.find((t) => t.value === timeControl)?.time}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          disabled={isCreating}
          className="group flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 fade-in"
          style={{ animationDelay: '0.4s' }}
        >
          {isCreating ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Creating Game...
            </>
          ) : (
            <>
              <svg
                aria-hidden="true"
                className="h-5 w-5 transition-transform group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Game
            </>
          )}
        </button>
      </main>
    </div>
  );
}
