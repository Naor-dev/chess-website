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
      className={`flex items-center justify-between rounded-xl px-4 py-3 ${
        isActive ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-zinc-100 dark:bg-zinc-800/50'
      }`}
    >
      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      <span
        className={`font-mono text-2xl font-bold ${
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
          return { text: 'Checkmate! You win!', color: 'text-emerald-600 dark:text-emerald-400' };
        case 'user_win_timeout':
          return { text: 'Time out! You win!', color: 'text-emerald-600 dark:text-emerald-400' };
        case 'engine_win_checkmate':
          return { text: 'Checkmate. Engine wins.', color: 'text-red-600 dark:text-red-400' };
        case 'engine_win_timeout':
          return { text: 'Time out. Engine wins.', color: 'text-red-600 dark:text-red-400' };
        case 'draw_stalemate':
          return { text: 'Stalemate. Draw.', color: 'text-amber-600 dark:text-amber-400' };
        case 'draw_repetition':
          return { text: 'Draw by repetition.', color: 'text-amber-600 dark:text-amber-400' };
        case 'draw_fifty_moves':
          return { text: 'Draw by 50-move rule.', color: 'text-amber-600 dark:text-amber-400' };
        case 'draw_insufficient_material':
          return {
            text: 'Draw. Insufficient material.',
            color: 'text-amber-600 dark:text-amber-400',
          };
        case 'user_resigned':
          return { text: 'You resigned.', color: 'text-red-600 dark:text-red-400' };
        default:
          return { text: 'Game over.', color: 'text-zinc-600 dark:text-zinc-400' };
      }
    }
    if (game.isCheck) {
      return { text: 'Check!', color: 'text-amber-600 dark:text-amber-400' };
    }
    return {
      text: game.currentTurn === 'w' ? 'Your turn' : 'Engine thinking...',
      color: 'text-zinc-600 dark:text-zinc-400',
    };
  };

  const status = getStatusMessage();

  return (
    <div className="text-center">
      <p className={`text-lg font-semibold ${status.color}`}>{status.text}</p>
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
          <span className="text-zinc-600 dark:text-zinc-400">Loading game...</span>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
        <p className="text-red-600 dark:text-red-400">{error || 'Game not found'}</p>
        <button
          onClick={() => router.push('/')}
          className="rounded-lg bg-zinc-200 px-4 py-2 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const showClocks = game.timeControlType !== 'none';
  const isUserTurn = game.currentTurn === 'w';
  const isLowTime = (time: number) => time > 0 && time < 30000; // Less than 30 seconds

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
          Exit
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-500">
            Level {game.difficultyLevel}
          </span>
        </div>
        <button
          onClick={() => {
            // TODO: Implement save game
            alert('Save game coming soon!');
          }}
          className="flex items-center gap-2 rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
      </header>

      {/* Main Game Area */}
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {/* Engine Clock (top) */}
        {showClocks && (
          <div className="w-full max-w-md">
            <ChessClock
              time={game.timeLeftEngine}
              isActive={!isUserTurn && !game.isGameOver}
              label="Engine"
              isLow={isLowTime(game.timeLeftEngine)}
            />
          </div>
        )}

        {/* Chess Board */}
        <div className="w-full max-w-md">
          <Chessboard
            position={game.currentFen}
            boardWidth={Math.min(400, typeof window !== 'undefined' ? window.innerWidth - 32 : 400)}
            arePiecesDraggable={!game.isGameOver && isUserTurn}
            onPieceDrop={(sourceSquare, targetSquare) => {
              // TODO: Implement move logic
              console.log('Move:', sourceSquare, '->', targetSquare);
              return false; // Return false for now - will implement move API later
            }}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#769656' }}
            customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
          />
        </div>

        {/* User Clock (bottom) */}
        {showClocks && (
          <div className="w-full max-w-md">
            <ChessClock
              time={game.timeLeftUser}
              isActive={isUserTurn && !game.isGameOver}
              label="You"
              isLow={isLowTime(game.timeLeftUser)}
            />
          </div>
        )}

        {/* Game Info / Status Message */}
        <div className="w-full max-w-md">
          <GameInfo game={game} />
        </div>

        {/* Action Buttons (when game is over) */}
        {game.isGameOver && (
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/game/new')}
              className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white transition-colors hover:bg-emerald-500"
            >
              New Game
            </button>
            <button
              onClick={() => router.push('/')}
              className="rounded-lg bg-zinc-200 px-6 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Home
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
