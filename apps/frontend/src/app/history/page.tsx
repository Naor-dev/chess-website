'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { gameApi } from '@/lib/gameApi';
import type { GameListItem } from '@chess-website/shared';

const DIFFICULTY_LABELS = ['', 'Beginner', 'Easy', 'Medium', 'Hard', 'Master'];

const TIME_CONTROL_LABELS: Record<string, string> = {
  none: 'No Clock',
  bullet_1min: '1 min',
  bullet_2min: '2 min',
  blitz_3min: '3 min',
  blitz_5min: '5 min',
  rapid_10min: '10 min',
  rapid_15min: '15 min',
  classical_30min: '30 min',
};

const TIME_CONTROL_COLORS: Record<string, string> = {
  none: 'zinc',
  bullet_1min: 'red',
  bullet_2min: 'red',
  blitz_3min: 'amber',
  blitz_5min: 'amber',
  rapid_10min: 'blue',
  rapid_15min: 'blue',
  classical_30min: 'purple',
};

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-3 w-3 ${star <= level ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-700'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getResultInfo(result?: string): { text: string; color: string } | null {
  if (!result) return null;

  switch (result) {
    case 'user_win_checkmate':
      return { text: 'Won by checkmate', color: 'emerald' };
    case 'user_win_timeout':
      return { text: 'Won on time', color: 'emerald' };
    case 'engine_win_checkmate':
      return { text: 'Lost by checkmate', color: 'red' };
    case 'engine_win_timeout':
      return { text: 'Lost on time', color: 'red' };
    case 'draw_stalemate':
    case 'draw_repetition':
    case 'draw_fifty_moves':
    case 'draw_insufficient_material':
      return { text: 'Draw', color: 'amber' };
    case 'user_resigned':
      return { text: 'Resigned', color: 'red' };
    default:
      return { text: 'Finished', color: 'zinc' };
  }
}

function GameCard({ game, onClick }: { game: GameListItem; onClick: () => void }) {
  const isActive = game.status === 'active';
  const resultInfo = getResultInfo(game.result);
  const timeColor = TIME_CONTROL_COLORS[game.timeControlType] || 'zinc';

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border-2 p-4 text-left transition-all border-zinc-200/50 bg-white/60 hover:border-emerald-300 hover:bg-white/80 hover:shadow-lg dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:hover:border-emerald-700 dark:hover:bg-zinc-900/60 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Status indicator */}
          <div className="mb-2 flex items-center gap-2">
            {isActive ? (
              <>
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Active - {game.currentTurn === 'w' ? 'Your turn' : 'Engine turn'}
                </span>
              </>
            ) : (
              resultInfo && (
                <span
                  className={`text-xs font-medium ${
                    resultInfo.color === 'emerald'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : resultInfo.color === 'red'
                        ? 'text-red-600 dark:text-red-400'
                        : resultInfo.color === 'amber'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {resultInfo.text}
                </span>
              )
            )}
          </div>

          {/* Difficulty and time control */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {DIFFICULTY_LABELS[game.difficultyLevel]}
              </span>
              <DifficultyStars level={game.difficultyLevel} />
            </div>
            <span className="text-zinc-300 dark:text-zinc-600">|</span>
            <span
              className={`text-sm font-medium ${
                timeColor === 'red'
                  ? 'text-red-600 dark:text-red-400'
                  : timeColor === 'amber'
                    ? 'text-amber-600 dark:text-amber-400'
                    : timeColor === 'blue'
                      ? 'text-blue-600 dark:text-blue-400'
                      : timeColor === 'purple'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-zinc-500 dark:text-zinc-500'
              }`}
            >
              {TIME_CONTROL_LABELS[game.timeControlType]}
            </span>
          </div>

          {/* Time ago */}
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            {formatTimeAgo(game.updatedAt)}
          </p>
        </div>

        {/* Arrow indicator */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 transition-colors group-hover:bg-emerald-100 dark:bg-zinc-800 dark:group-hover:bg-emerald-900/40">
          <svg
            className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-emerald-600 dark:text-zinc-500 dark:group-hover:text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ onNewGame }: { onNewGame: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white/40 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/20">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <svg
          className="h-8 w-8 text-zinc-400 dark:text-zinc-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">No games yet</h3>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Start playing to see your game history here
      </p>
      <button
        onClick={onNewGame}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        Start New Game
      </button>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadGames();
    }
  }, [authLoading, isAuthenticated]);

  const loadGames = async () => {
    try {
      const gameList = await gameApi.listGames();
      setGames(gameList);
      setError(null);
    } catch (err) {
      setError('Failed to load games');
      console.error('Failed to load games:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.push('/');
    return null;
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-bg chess-pattern">
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-8 backdrop-blur-sm dark:bg-zinc-900/80">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Loading games...</span>
        </div>
      </div>
    );
  }

  const activeGames = games.filter((g) => g.status === 'active');
  const completedGames = games.filter((g) => g.status !== 'active');

  return (
    <div className="min-h-screen gradient-bg chess-pattern">
      {/* Decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-20 top-20 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -left-20 bottom-20 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 fade-in">
          <button
            onClick={() => router.push('/')}
            className="mb-6 flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-600 transition-all hover:bg-white/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
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
            Back to Home
          </button>

          <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Game History
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {games.length === 0
              ? 'No games played yet'
              : `${games.length} game${games.length === 1 ? '' : 's'} played`}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {games.length === 0 ? (
          <EmptyState onNewGame={() => router.push('/game/new')} />
        ) : (
          <>
            {/* Active Games Section */}
            {activeGames.length > 0 && (
              <div className="mb-8 fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
                  </div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Active Games ({activeGames.length})
                  </h2>
                </div>
                <div className="grid gap-3">
                  {activeGames.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onClick={() => router.push(`/game/${game.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Games Section */}
            {completedGames.length > 0 && (
              <div className="fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <svg
                      className="h-4 w-4 text-zinc-600 dark:text-zinc-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 12l2 2 4-4" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Completed Games ({completedGames.length})
                  </h2>
                </div>
                <div className="grid gap-3">
                  {completedGames.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onClick={() => router.push(`/game/${game.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Floating New Game Button */}
        {games.length > 0 && (
          <div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 fade-in"
            style={{ animationDelay: '0.3s' }}
          >
            <button
              onClick={() => router.push('/game/new')}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4v16m8-8H4" />
              </svg>
              New Game
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
