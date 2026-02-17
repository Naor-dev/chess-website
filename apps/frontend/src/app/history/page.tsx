'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { gameApi } from '@/lib/gameApi';
import type { GameListItem } from '@chess-website/shared';

type SortOrder = 'newest' | 'oldest';
type StatusFilter = 'all' | 'active' | 'completed';
type ResultFilter = 'all' | 'wins' | 'losses' | 'draws';

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
          aria-hidden="true"
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

function GameCard({ game, href }: { game: GameListItem; href: string }) {
  const isActive = game.status === 'active';
  const resultInfo = getResultInfo(game.result);
  const timeColor = TIME_CONTROL_COLORS[game.timeControlType] || 'zinc';
  const difficulty = DIFFICULTY_LABELS[game.difficultyLevel] || `Level ${game.difficultyLevel}`;
  const timeControl = TIME_CONTROL_LABELS[game.timeControlType] || game.timeControlType;
  const statusText = isActive
    ? `Active, ${game.currentTurn === 'w' ? 'your turn' : 'engine turn'}`
    : resultInfo?.text || 'Finished';

  return (
    <Link
      href={href}
      aria-label={`${statusText} - ${difficulty}, ${timeControl} - ${formatTimeAgo(game.updatedAt)}`}
      className="group block w-full rounded-xl border-2 p-4 text-left transition-all border-zinc-200/50 bg-white/60 hover:border-emerald-300 hover:bg-white/80 hover:shadow-lg dark:border-zinc-800/50 dark:bg-zinc-900/40 dark:hover:border-emerald-700 dark:hover:bg-zinc-900/60 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Status indicator */}
          <div className="mb-2 flex items-center gap-2">
            {isActive ? (
              <>
                <div
                  aria-hidden="true"
                  className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500"
                />
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
            aria-hidden="true"
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
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white/40 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/20">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <svg
          aria-hidden="true"
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
      <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">No games yet</h2>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Start playing to see your game history here
      </p>
      <Link
        href="/game/new"
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
      >
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        Start New Game
      </Link>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and sort state
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');

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

  // Filter and sort games
  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];

    // Apply status filter
    if (statusFilter === 'active') {
      result = result.filter((g) => g.status === 'active');
    } else if (statusFilter === 'completed') {
      result = result.filter((g) => g.status !== 'active');
    }

    // Apply result filter (only for completed games)
    if (resultFilter !== 'all') {
      result = result.filter((g) => {
        if (g.status === 'active') return true; // Don't filter out active games
        const isWin = g.result?.startsWith('user_win');
        const isLoss = g.result?.startsWith('engine_win') || g.result === 'user_resigned';
        const isDraw = g.result?.startsWith('draw_');

        switch (resultFilter) {
          case 'wins':
            return isWin;
          case 'losses':
            return isLoss;
          case 'draws':
            return isDraw;
          default:
            return true;
        }
      });
    }

    // Apply sort
    result.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [games, statusFilter, resultFilter, sortOrder]);

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.push('/');
    return null;
  }

  if (authLoading || isLoading) {
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
          <span className="text-zinc-600 dark:text-zinc-400">Loading games...</span>
        </div>
      </div>
    );
  }

  // Separate active and completed games from filtered results
  const activeGames = filteredAndSortedGames.filter((g) => g.status === 'active');
  const completedGames = filteredAndSortedGames.filter((g) => g.status !== 'active');
  const hasNoFilterResults = games.length > 0 && filteredAndSortedGames.length === 0;

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
            Game History
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {games.length === 0
              ? 'No games played yet'
              : `${games.length} game${games.length === 1 ? '' : 's'} played`}
          </p>
        </div>

        {/* Filter Controls */}
        {games.length > 0 && (
          <div
            className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200/50 bg-white/60 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-900/40 fade-in"
            aria-label="Filter and sort games"
          >
            {/* Sort Order */}
            <div className="flex items-center gap-2">
              <span
                id="sort-label"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-500"
              >
                Sort:
              </span>
              <div
                role="radiogroup"
                aria-labelledby="sort-label"
                className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800"
              >
                <button
                  role="radio"
                  aria-checked={sortOrder === 'newest'}
                  onClick={() => setSortOrder('newest')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    sortOrder === 'newest'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  Newest
                </button>
                <button
                  role="radio"
                  aria-checked={sortOrder === 'oldest'}
                  onClick={() => setSortOrder('oldest')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    sortOrder === 'oldest'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  Oldest
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span
                id="status-filter-label"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-500"
              >
                Status:
              </span>
              <div
                role="radiogroup"
                aria-labelledby="status-filter-label"
                className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800"
              >
                {(['all', 'active', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    role="radio"
                    aria-checked={statusFilter === status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                      statusFilter === status
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Result Filter */}
            <div className="flex items-center gap-2">
              <span
                id="result-filter-label"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-500"
              >
                Result:
              </span>
              <div
                role="radiogroup"
                aria-labelledby="result-filter-label"
                className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800"
              >
                {(['all', 'wins', 'losses', 'draws'] as const).map((result) => (
                  <button
                    key={result}
                    role="radio"
                    aria-checked={resultFilter === result}
                    onClick={() => setResultFilter(result)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                      resultFilter === result
                        ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                        : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {result}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {/* Screen reader announcement for filter results */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {games.length > 0 && `Showing ${filteredAndSortedGames.length} of ${games.length} games`}
        </div>

        {games.length === 0 ? (
          <EmptyState />
        ) : hasNoFilterResults ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white/40 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <svg
                aria-hidden="true"
                className="h-8 w-8 text-zinc-400 dark:text-zinc-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              No matching games
            </h2>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Try adjusting your filters to see more games
            </p>
            <button
              onClick={() => {
                setStatusFilter('all');
                setResultFilter('all');
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Active Games Section */}
            {activeGames.length > 0 && (
              <div className="mb-8 fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <div
                      aria-hidden="true"
                      className="h-3 w-3 animate-pulse rounded-full bg-emerald-500"
                    />
                  </div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Active Games ({activeGames.length})
                  </h2>
                </div>
                <div className="grid gap-3">
                  {activeGames.map((game) => (
                    <GameCard key={game.id} game={game} href={`/game/${game.id}`} />
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
                      aria-hidden="true"
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
                    <GameCard key={game.id} game={game} href={`/game/${game.id}`} />
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
            <Link
              href="/game/new"
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4v16m8-8H4" />
              </svg>
              New Game
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
