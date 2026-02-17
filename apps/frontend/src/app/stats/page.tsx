'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { statsApi } from '@/lib/statsApi';
import type { UserStatsResponse } from '@chess-website/shared';

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Master',
};

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

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/50 bg-white/60 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-900/40">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{sublabel}</p>}
    </div>
  );
}

function ResultsBar({ wins, losses, draws }: { wins: number; losses: number; draws: number }) {
  const total = wins + losses + draws;
  if (total === 0) return null;

  const winPct = (wins / total) * 100;
  const lossPct = (losses / total) * 100;
  const drawPct = (draws / total) * 100;

  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {wins} Win{wins !== 1 ? 's' : ''}
        </span>
        <span className="font-medium text-zinc-500 dark:text-zinc-400">
          {draws} Draw{draws !== 1 ? 's' : ''}
        </span>
        <span className="font-medium text-red-600 dark:text-red-400">
          {losses} Loss{losses !== 1 ? 'es' : ''}
        </span>
      </div>
      <div
        className="flex h-3 overflow-hidden rounded-full"
        role="img"
        aria-label={`Results: ${wins} wins, ${draws} draws, ${losses} losses`}
      >
        {winPct > 0 && (
          <div className="bg-emerald-500 transition-all" style={{ width: `${winPct}%` }} />
        )}
        {drawPct > 0 && (
          <div
            className="bg-zinc-300 transition-all dark:bg-zinc-600"
            style={{ width: `${drawPct}%` }}
          />
        )}
        {lossPct > 0 && (
          <div className="bg-red-500 transition-all" style={{ width: `${lossPct}%` }} />
        )}
      </div>
      {/* Accessible data table alternative */}
      <table className="sr-only">
        <caption>Game Results Breakdown</caption>
        <thead>
          <tr>
            <th scope="col">Result</th>
            <th scope="col">Count</th>
            <th scope="col">Percentage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Wins</td>
            <td>{wins}</td>
            <td>{winPct.toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Draws</td>
            <td>{draws}</td>
            <td>{drawPct.toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Losses</td>
            <td>{losses}</td>
            <td>{lossPct.toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DifficultyChart({ data }: { data: UserStatsResponse['byDifficulty'] }) {
  if (data.length === 0) return null;

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <div>
      <div className="space-y-3">
        {data.map((d) => {
          const barWidth = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0;
          const winPct = d.total > 0 ? (d.wins / d.total) * 100 : 0;
          return (
            <div key={d.level}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {DIFFICULTY_LABELS[d.level] || `Level ${d.level}`}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {d.wins}W / {d.losses}L / {d.draws}D
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${barWidth}%` }}
                  role="img"
                  aria-label={`${DIFFICULTY_LABELS[d.level]}: ${d.total} games, ${winPct.toFixed(0)}% win rate`}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Accessible data table */}
      <table className="sr-only">
        <caption>Performance by Difficulty Level</caption>
        <thead>
          <tr>
            <th scope="col">Difficulty</th>
            <th scope="col">Total</th>
            <th scope="col">Wins</th>
            <th scope="col">Losses</th>
            <th scope="col">Draws</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.level}>
              <td>{DIFFICULTY_LABELS[d.level]}</td>
              <td>{d.total}</td>
              <td>{d.wins}</td>
              <td>{d.losses}</td>
              <td>{d.draws}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimeControlChart({ data }: { data: UserStatsResponse['byTimeControl'] }) {
  if (data.length === 0) return null;

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <div>
      <div className="space-y-3">
        {data.map((d) => {
          const barWidth = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0;
          return (
            <div key={d.type}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {TIME_CONTROL_LABELS[d.type] || d.type}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {d.total} game{d.total !== 1 ? 's' : ''} ({d.wins} won)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${barWidth}%` }}
                  role="img"
                  aria-label={`${TIME_CONTROL_LABELS[d.type]}: ${d.total} games`}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Accessible data table */}
      <table className="sr-only">
        <caption>Games by Time Control</caption>
        <thead>
          <tr>
            <th scope="col">Time Control</th>
            <th scope="col">Total</th>
            <th scope="col">Wins</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.type}>
              <td>{TIME_CONTROL_LABELS[d.type]}</td>
              <td>{d.total}</td>
              <td>{d.wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadStats();
    }
  }, [authLoading, isAuthenticated]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await statsApi.getUserStats();
      // Validate numeric fields are finite
      if (typeof data.winRate === 'number' && !isFinite(data.winRate)) data.winRate = 0;
      if (typeof data.avgMovesPerGame === 'number' && !isFinite(data.avgMovesPerGame))
        data.avgMovesPerGame = 0;
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Failed to load statistics');
      console.error('Failed to load statistics:', err);
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
        <div
          className="flex items-center gap-3 rounded-2xl bg-white/80 p-8 backdrop-blur-sm dark:bg-zinc-900/80"
          aria-live="polite"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Loading statistics...</span>
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
            Statistics
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">Your chess performance overview</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950/30">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={loadStats}
              className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              Try again
            </button>
          </div>
        )}

        {stats && (
          <>
            {/* Empty state CTA */}
            {stats.finishedGames === 0 && (
              <div className="mb-6 rounded-xl border-2 border-dashed border-zinc-200 bg-white/40 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/20 fade-in">
                <p className="mb-3 text-zinc-600 dark:text-zinc-400">
                  Play your first game to see statistics!
                </p>
                <button
                  onClick={() => router.push('/game/new')}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Start New Game
                </button>
              </div>
            )}

            {/* Overview Cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 fade-in">
              <StatCard label="Total Games" value={stats.totalGames} />
              <StatCard
                label="Win Rate"
                value={`${stats.winRate}%`}
                sublabel={`${stats.finishedGames} finished`}
              />
              <StatCard
                label="Streak"
                value={stats.currentStreak.type === 'none' ? '-' : `${stats.currentStreak.count}`}
                sublabel={
                  stats.currentStreak.type === 'none'
                    ? undefined
                    : stats.currentStreak.type === 'win'
                      ? 'wins'
                      : 'losses'
                }
              />
              <StatCard label="Avg. Moves" value={stats.avgMovesPerGame} sublabel="per game" />
            </div>

            {/* Results Breakdown */}
            {stats.finishedGames > 0 && (
              <div
                className="mb-6 rounded-xl border border-zinc-200/50 bg-white/60 p-5 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-900/40 fade-in"
                style={{ animationDelay: '0.1s' }}
              >
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Results
                </h2>
                <ResultsBar wins={stats.wins} losses={stats.losses} draws={stats.draws} />
              </div>
            )}

            {/* Performance by Difficulty */}
            {stats.byDifficulty.length > 0 && (
              <div
                className="mb-6 rounded-xl border border-zinc-200/50 bg-white/60 p-5 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-900/40 fade-in"
                style={{ animationDelay: '0.2s' }}
              >
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  By Difficulty
                </h2>
                <DifficultyChart data={stats.byDifficulty} />
              </div>
            )}

            {/* Time Control Distribution */}
            {stats.byTimeControl.length > 0 && (
              <div
                className="mb-6 rounded-xl border border-zinc-200/50 bg-white/60 p-5 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-900/40 fade-in"
                style={{ animationDelay: '0.3s' }}
              >
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  By Time Control
                </h2>
                <TimeControlChart data={stats.byTimeControl} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
