'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chessboard } from 'react-chessboard';
import { useAuth } from '@/contexts/AuthContext';
import { gameApi } from '@/lib/gameApi';
import type { GameResponse } from '@chess-website/shared';

function formatTime(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function ChessClock({
  time,
  isActive,
  label,
  isLow,
}: {
  time: number;
  isActive: boolean;
  label: string;
  isLow?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border-2 px-5 py-4 transition-all ${
        isActive
          ? isLow
            ? 'border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/40'
            : 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40'
          : 'border-zinc-200/50 bg-white/60 dark:border-zinc-800/50 dark:bg-zinc-900/40'
      } backdrop-blur-sm`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            isActive
              ? isLow
                ? 'animate-pulse bg-red-500'
                : 'bg-emerald-500'
              : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        />
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      </div>
      <span
        className={`font-mono text-2xl font-bold tabular-nums ${
          isLow && isActive
            ? 'text-red-600 dark:text-red-400'
            : isActive
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-zinc-700 dark:text-zinc-300'
        }`}
      >
        {formatTime(time)}
      </span>
    </div>
  );
}

function GameInfo({ game }: { game: GameResponse }) {
  const getStatusMessage = () => {
    if (game.isGameOver) {
      switch (game.result) {
        case 'user_win_checkmate':
          return {
            text: 'Checkmate! You win!',
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
            border: 'border-emerald-200 dark:border-emerald-800',
            icon: 'trophy',
          };
        case 'user_win_timeout':
          return {
            text: 'Time out! You win!',
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
            border: 'border-emerald-200 dark:border-emerald-800',
            icon: 'trophy',
          };
        case 'engine_win_checkmate':
          return {
            text: 'Checkmate. Engine wins.',
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 dark:bg-red-950/40',
            border: 'border-red-200 dark:border-red-800',
            icon: 'x',
          };
        case 'engine_win_timeout':
          return {
            text: 'Time out. Engine wins.',
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 dark:bg-red-950/40',
            border: 'border-red-200 dark:border-red-800',
            icon: 'x',
          };
        case 'draw_stalemate':
          return {
            text: 'Stalemate. Draw.',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            border: 'border-amber-200 dark:border-amber-800',
            icon: 'draw',
          };
        case 'draw_repetition':
          return {
            text: 'Draw by repetition.',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            border: 'border-amber-200 dark:border-amber-800',
            icon: 'draw',
          };
        case 'draw_fifty_moves':
          return {
            text: 'Draw by 50-move rule.',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            border: 'border-amber-200 dark:border-amber-800',
            icon: 'draw',
          };
        case 'draw_insufficient_material':
          return {
            text: 'Draw. Insufficient material.',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            border: 'border-amber-200 dark:border-amber-800',
            icon: 'draw',
          };
        case 'user_resigned':
          return {
            text: 'You resigned.',
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 dark:bg-red-950/40',
            border: 'border-red-200 dark:border-red-800',
            icon: 'flag',
          };
        default:
          return {
            text: 'Game over.',
            color: 'text-zinc-600 dark:text-zinc-400',
            bg: 'bg-zinc-50 dark:bg-zinc-900/40',
            border: 'border-zinc-200 dark:border-zinc-800',
            icon: 'info',
          };
      }
    }
    if (game.isCheck) {
      return {
        text: 'Check!',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'warning',
      };
    }
    return {
      text: game.currentTurn === 'w' ? 'Your turn' : 'Engine thinking...',
      color: 'text-zinc-600 dark:text-zinc-400',
      bg: 'bg-white/60 dark:bg-zinc-900/40',
      border: 'border-zinc-200/50 dark:border-zinc-800/50',
      icon: game.currentTurn === 'w' ? 'play' : 'thinking',
    };
  };

  const status = getStatusMessage();

  const getIcon = () => {
    switch (status.icon) {
      case 'trophy':
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
          </svg>
        );
      case 'x':
        return (
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        );
      case 'draw':
        return (
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 10H7M17 14H7" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
        );
      case 'thinking':
        return (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
        );
      default:
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-xl border px-4 py-3 ${status.bg} ${status.border} backdrop-blur-sm`}
    >
      <span className={status.color}>{getIcon()}</span>
      <p className={`font-semibold ${status.color}`}>{status.text}</p>
    </div>
  );
}

function DifficultyBadge({ level }: { level: number }) {
  const labels = ['', 'Beginner', 'Easy', 'Medium', 'Hard', 'Master'];
  return (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Level {level}</span>
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        {labels[level]}
      </span>
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const gameId = params.id as string;

  const [game, setGame] = useState<GameResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    try {
      const gameData = await gameApi.getGame(gameId);
      setGame(gameData);
      setError(null);
    } catch (err) {
      setError('Failed to load game. It may not exist or you may not have access.');
      console.error('Failed to fetch game:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchGame();
    }
  }, [authLoading, isAuthenticated, fetchGame]);

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    router.push('/');
    return null;
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-bg chess-pattern">
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-8 backdrop-blur-sm dark:bg-zinc-900/80 shadow-xl">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Loading game...</span>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 gradient-bg chess-pattern">
        <div className="rounded-2xl bg-white/80 p-8 text-center backdrop-blur-sm dark:bg-zinc-900/80 shadow-xl">
          <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Game Not Found
          </p>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            {error || 'This game may have been deleted or you may not have access.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl bg-zinc-900 px-6 py-3 font-medium text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const showClocks = game.timeControlType !== 'none';
  const isUserTurn = game.currentTurn === 'w';
  const isLowTime = (time: number) => time > 0 && time < 30000;

  return (
    <div className="flex min-h-screen flex-col gradient-bg chess-pattern">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200/50 bg-white/80 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
            <span className="hidden sm:inline">Exit Game</span>
          </button>

          <DifficultyBadge level={game.difficultyLevel} />

          <button
            onClick={() => {
              alert('Save game coming soon!');
            }}
            className="flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17,21 17,13 7,13 7,21" />
              <polyline points="7,3 7,8 15,8" />
            </svg>
            Save
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-8">
        <div className="w-full max-w-md space-y-4">
          {/* Engine Clock (top) */}
          {showClocks && (
            <ChessClock
              time={game.timeLeftEngine}
              isActive={!isUserTurn && !game.isGameOver}
              label="Stockfish"
              isLow={isLowTime(game.timeLeftEngine)}
            />
          )}

          {/* Chess Board */}
          <div className="overflow-hidden rounded-2xl shadow-2xl glow">
            <Chessboard
              position={game.currentFen}
              boardWidth={Math.min(
                400,
                typeof window !== 'undefined' ? window.innerWidth - 32 : 400
              )}
              arePiecesDraggable={!game.isGameOver && isUserTurn}
              onPieceDrop={(sourceSquare, targetSquare) => {
                console.log('Move:', sourceSquare, '->', targetSquare);
                return false;
              }}
              customBoardStyle={{
                borderRadius: '0',
              }}
              customDarkSquareStyle={{ backgroundColor: '#769656' }}
              customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
            />
          </div>

          {/* User Clock (bottom) */}
          {showClocks && (
            <ChessClock
              time={game.timeLeftUser}
              isActive={isUserTurn && !game.isGameOver}
              label="You"
              isLow={isLowTime(game.timeLeftUser)}
            />
          )}

          {/* Game Info / Status Message */}
          <GameInfo game={game} />

          {/* Action Buttons (when game is over) */}
          {game.isGameOver && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.push('/game/new')}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
              >
                New Game
              </button>
              <button
                onClick={() => router.push('/')}
                className="rounded-xl bg-zinc-200 px-6 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Home
              </button>
            </div>
          )}

          {/* Resign button (when game is active) */}
          {!game.isGameOver && (
            <button
              onClick={() => {
                alert('Resign coming soon!');
              }}
              className="w-full rounded-xl border-2 border-zinc-200 bg-white/60 px-6 py-3 font-medium text-zinc-600 backdrop-blur-sm transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
                </svg>
                Resign
              </span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
