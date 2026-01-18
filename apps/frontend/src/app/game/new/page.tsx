'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { gameApi } from '@/lib/gameApi';
import type { DifficultyLevel, TimeControlType } from '@chess-website/shared';

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; description: string }[] = [
  { value: 1, label: 'Beginner', description: 'Perfect for learning the basics' },
  { value: 2, label: 'Easy', description: 'Casual play with forgiving AI' },
  { value: 3, label: 'Medium', description: 'Balanced challenge for most players' },
  { value: 4, label: 'Hard', description: 'Strong AI that punishes mistakes' },
  { value: 5, label: 'Master', description: 'Near-maximum engine strength' },
];

const TIME_CONTROL_OPTIONS: { value: TimeControlType; label: string; time: string }[] = [
  { value: 'none', label: 'No Clock', time: 'Unlimited' },
  { value: 'bullet_1min', label: 'Bullet', time: '1 min' },
  { value: 'bullet_2min', label: 'Bullet', time: '2 min +1s' },
  { value: 'blitz_3min', label: 'Blitz', time: '3 min' },
  { value: 'blitz_5min', label: 'Blitz', time: '5 min' },
  { value: 'rapid_10min', label: 'Rapid', time: '10 min' },
  { value: 'rapid_15min', label: 'Rapid', time: '15 min +10s' },
  { value: 'classical_30min', label: 'Classical', time: '30 min' },
];

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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
          <span className="text-zinc-600 dark:text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center py-16 px-8">
        {/* Header */}
        <button
          onClick={() => router.push('/')}
          className="mb-8 flex items-center gap-2 text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          New Game
        </h1>
        <p className="mb-10 text-zinc-600 dark:text-zinc-400">Configure your game settings</p>

        {/* Difficulty Selection */}
        <div className="mb-10 w-full">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Difficulty Level
          </h2>
          <div className="grid gap-3">
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setDifficulty(option.value)}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  difficulty === option.value
                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {option.label}
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-500">
                      Level {option.value}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {option.description}
                  </p>
                </div>
                {difficulty === option.value && (
                  <svg
                    className="h-5 w-5 text-emerald-600 dark:text-emerald-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Time Control Selection */}
        <div className="mb-10 w-full">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Time Control
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TIME_CONTROL_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeControl(option.value)}
                className={`flex flex-col items-center rounded-xl border p-4 transition-all ${
                  timeControl === option.value
                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {option.time}
                </span>
                <span className="text-sm text-zinc-500 dark:text-zinc-500">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 w-full rounded-lg bg-red-50 p-4 text-center text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Start Game Button */}
        <button
          onClick={handleStartGame}
          disabled={isCreating}
          className="flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-emerald-600 font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              Creating Game...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
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
