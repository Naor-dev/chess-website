'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { useAuth } from '@/contexts/AuthContext';
import { gameApi } from '@/lib/gameApi';
import type { GameResponse, MakeMoveRequest, GameResult } from '@chess-website/shared';

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

function GameOverModal({
  result,
  onNewGame,
  onGoHome,
}: {
  result?: GameResult;
  onNewGame: () => void;
  onGoHome: () => void;
}) {
  const getResultInfo = () => {
    switch (result) {
      case 'user_win_checkmate':
        return {
          title: 'Victory!',
          subtitle: 'Checkmate',
          color: 'emerald',
          icon: 'trophy',
        };
      case 'user_win_timeout':
        return {
          title: 'Victory!',
          subtitle: 'Opponent ran out of time',
          color: 'emerald',
          icon: 'trophy',
        };
      case 'engine_win_checkmate':
        return {
          title: 'Defeat',
          subtitle: 'Checkmate',
          color: 'red',
          icon: 'x',
        };
      case 'engine_win_timeout':
        return {
          title: 'Defeat',
          subtitle: 'You ran out of time',
          color: 'red',
          icon: 'clock',
        };
      case 'draw_stalemate':
        return {
          title: 'Draw',
          subtitle: 'Stalemate',
          color: 'amber',
          icon: 'draw',
        };
      case 'draw_repetition':
        return {
          title: 'Draw',
          subtitle: 'Threefold repetition',
          color: 'amber',
          icon: 'draw',
        };
      case 'draw_fifty_moves':
        return {
          title: 'Draw',
          subtitle: '50-move rule',
          color: 'amber',
          icon: 'draw',
        };
      case 'draw_insufficient_material':
        return {
          title: 'Draw',
          subtitle: 'Insufficient material',
          color: 'amber',
          icon: 'draw',
        };
      case 'user_resigned':
        return {
          title: 'Resigned',
          subtitle: 'You resigned the game',
          color: 'red',
          icon: 'flag',
        };
      default:
        return {
          title: 'Game Over',
          subtitle: '',
          color: 'zinc',
          icon: 'info',
        };
    }
  };

  const info = getResultInfo();

  const getColorClasses = () => {
    switch (info.color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/40',
          text: 'text-emerald-600 dark:text-emerald-400',
          ring: 'ring-emerald-500/20',
        };
      case 'red':
        return {
          bg: 'bg-red-100 dark:bg-red-900/40',
          text: 'text-red-600 dark:text-red-400',
          ring: 'ring-red-500/20',
        };
      case 'amber':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/40',
          text: 'text-amber-600 dark:text-amber-400',
          ring: 'ring-amber-500/20',
        };
      default:
        return {
          bg: 'bg-zinc-100 dark:bg-zinc-800',
          text: 'text-zinc-600 dark:text-zinc-400',
          ring: 'ring-zinc-500/20',
        };
    }
  };

  const colors = getColorClasses();

  const getIcon = () => {
    switch (info.icon) {
      case 'trophy':
        return (
          <svg className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
          </svg>
        );
      case 'x':
        return (
          <svg
            className="h-12 w-12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        );
      case 'clock':
        return (
          <svg className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
          </svg>
        );
      case 'draw':
        return (
          <svg
            className="h-12 w-12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 10H7M17 14H7" />
          </svg>
        );
      case 'flag':
        return (
          <svg className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
          </svg>
        );
      default:
        return (
          <svg className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onGoHome} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900">
          {/* Icon section */}
          <div className={`flex flex-col items-center pb-6 pt-8 ${colors.bg}`}>
            <div className={`mb-4 rounded-full p-4 ring-8 ${colors.ring} ${colors.bg}`}>
              <span className={colors.text}>{getIcon()}</span>
            </div>
            <h2 className={`text-3xl font-bold ${colors.text}`}>{info.title}</h2>
            {info.subtitle && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{info.subtitle}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 p-6">
            <button
              onClick={onNewGame}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
            >
              Play Again
            </button>
            <button
              onClick={onGoHome}
              className="w-full rounded-xl bg-zinc-100 px-6 py-3.5 font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EngineThinkingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-6 py-5 shadow-xl dark:bg-zinc-800/95">
        {/* Animated chess piece */}
        <div className="relative">
          <div className="h-10 w-10 animate-bounce">
            <svg viewBox="0 0 45 45" className="h-full w-full">
              <g
                fill="none"
                fillRule="evenodd"
                stroke="#000"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" />
                <path
                  d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
                  fill="#000"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                />
                <path
                  d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"
                  fill="#000"
                />
                <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
              </g>
            </svg>
          </div>
          {/* Thinking dots */}
          <div className="absolute -right-1 -top-1 flex gap-0.5">
            <div
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">Stockfish is thinking</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Calculating best move...</p>
        </div>
      </div>
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
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Local display times for clock ticking (separate from server times)
  const [displayTimeUser, setDisplayTimeUser] = useState<number>(0);
  const [displayTimeEngine, setDisplayTimeEngine] = useState<number>(0);
  const lastTickRef = useRef<number>(Date.now());

  // Chess.js instance for client-side validation
  const currentFen = game?.currentFen;
  const chess = useMemo(() => {
    if (!currentFen) return null;
    return new Chess(currentFen);
  }, [currentFen]);

  // Sync display times with server times when game updates
  // Uses turnStartedAt to calculate accurate elapsed time for page loads/refreshes
  useEffect(() => {
    if (game) {
      // If game has time control, is active, and has a turn timestamp, calculate accurate time
      if (game.timeControlType !== 'none' && game.status === 'active' && game.turnStartedAt) {
        const turnStarted = new Date(game.turnStartedAt).getTime();
        const now = Date.now();
        const elapsed = now - turnStarted;

        if (game.currentTurn === 'w') {
          // User's turn - deduct elapsed from user's time
          setDisplayTimeUser(Math.max(0, game.timeLeftUser - elapsed));
          setDisplayTimeEngine(game.timeLeftEngine);
        } else {
          // Engine's turn - deduct elapsed from engine's time
          setDisplayTimeUser(game.timeLeftUser);
          setDisplayTimeEngine(Math.max(0, game.timeLeftEngine - elapsed));
        }
      } else {
        // No time control or game over - use server times directly
        setDisplayTimeUser(game.timeLeftUser);
        setDisplayTimeEngine(game.timeLeftEngine);
      }
      lastTickRef.current = Date.now();
    }
  }, [game]);

  // Clock ticking effect
  useEffect(() => {
    // Don't tick if no game, game over, no time control, or currently moving
    if (!game || game.isGameOver || game.timeControlType === 'none' || isMoving) {
      return;
    }

    const currentTurn = game.currentTurn;
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      if (currentTurn === 'w') {
        // User's turn - decrement user's clock
        setDisplayTimeUser((prev) => Math.max(0, prev - elapsed));
      } else {
        // Engine's turn - decrement engine's clock
        setDisplayTimeEngine((prev) => Math.max(0, prev - elapsed));
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(intervalId);
  }, [game, isMoving]);

  // Show game over modal when game ends
  useEffect(() => {
    if (game?.isGameOver && !showGameOverModal) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => {
        setShowGameOverModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [game?.isGameOver, showGameOverModal]);

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

  // Timeout detection - refetch game when time reaches 0 to get server confirmation
  const timeoutCheckRef = useRef<boolean>(false);
  useEffect(() => {
    if (!game || game.isGameOver || game.timeControlType === 'none' || isMoving) {
      timeoutCheckRef.current = false;
      return;
    }

    // Check if current player's time has run out
    const currentPlayerTime = game.currentTurn === 'w' ? displayTimeUser : displayTimeEngine;
    if (currentPlayerTime <= 0 && !timeoutCheckRef.current) {
      // Prevent multiple fetches
      timeoutCheckRef.current = true;
      // Refetch game to get server confirmation of timeout
      fetchGame();
    }
  }, [game, displayTimeUser, displayTimeEngine, isMoving, fetchGame]);

  // Handle piece drop (drag and drop move)
  const onDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square, piece: string): boolean => {
      if (!game || !chess || isMoving || game.isGameOver) return false;
      if (game.currentTurn !== 'w') return false; // Not user's turn

      // Check if it's a promotion move
      const isPromotion =
        piece[1] === 'P' &&
        ((piece[0] === 'w' && targetSquare[1] === '8') ||
          (piece[0] === 'b' && targetSquare[1] === '1'));

      // Validate move client-side first with a test chess instance
      let newFen: string;
      try {
        const testChess = new Chess(game.currentFen);
        const moveResult = testChess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: isPromotion ? 'q' : undefined, // Default to queen promotion
        });

        if (!moveResult) {
          return false; // Invalid move
        }
        newFen = testChess.fen();
      } catch {
        return false; // Invalid move
      }

      // Optimistic update - show the move immediately
      const previousGame = game;
      setGame((prev) => (prev ? { ...prev, currentFen: newFen, currentTurn: 'b' } : prev));
      setIsMoving(true);
      setMoveError(null);

      // Make the move via API
      const move: MakeMoveRequest = {
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? 'q' : undefined,
      };

      gameApi
        .makeMove(gameId, move)
        .then((result) => {
          setGame(result.game);
        })
        .catch((err) => {
          console.error('Failed to make move:', err);
          setMoveError('Failed to make move. Please try again.');
          // Revert to previous state on error
          setGame(previousGame);
        })
        .finally(() => {
          setIsMoving(false);
        });

      return true; // Return true immediately for optimistic update
    },
    [game, chess, gameId, isMoving]
  );

  // Handle save game
  const handleSaveGame = async () => {
    if (!game || isSaving || game.isGameOver) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await gameApi.saveGame(gameId);
      setSaveMessage('Game saved!');
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save game:', err);
      setSaveMessage('Failed to save');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
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
            onClick={handleSaveGame}
            disabled={isSaving || game.isGameOver}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              saveMessage === 'Game saved!'
                ? 'bg-emerald-500 text-white'
                : saveMessage === 'Failed to save'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  : game.isGameOver
                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60'
            }`}
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-700 dark:border-emerald-600 dark:border-t-emerald-300" />
            ) : saveMessage === 'Game saved!' ? (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
            ) : (
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
            )}
            {saveMessage || 'Save'}
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:p-8">
        <div className="w-full max-w-md space-y-4">
          {/* Engine Clock (top) */}
          {showClocks && (
            <ChessClock
              time={displayTimeEngine}
              isActive={!isUserTurn && !game.isGameOver}
              label="Stockfish"
              isLow={isLowTime(displayTimeEngine)}
            />
          )}

          {/* Chess Board */}
          <div className="relative overflow-hidden rounded-2xl shadow-2xl glow">
            <Chessboard
              position={game.currentFen}
              boardWidth={Math.min(
                400,
                typeof window !== 'undefined' ? window.innerWidth - 32 : 400
              )}
              arePiecesDraggable={!game.isGameOver && isUserTurn && !isMoving}
              onPieceDrop={onDrop}
              customBoardStyle={{
                borderRadius: '0',
              }}
              customDarkSquareStyle={{ backgroundColor: '#769656' }}
              customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
            />
            {/* Engine thinking overlay - shown when waiting for engine response */}
            {isMoving && <EngineThinkingOverlay />}
          </div>

          {/* Move error message */}
          {moveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              {moveError}
            </div>
          )}

          {/* User Clock (bottom) */}
          {showClocks && (
            <ChessClock
              time={displayTimeUser}
              isActive={isUserTurn && !game.isGameOver}
              label="You"
              isLow={isLowTime(displayTimeUser)}
            />
          )}

          {/* Game Info / Status Message */}
          <GameInfo game={game} />

          {/* Action Buttons (when game is over but modal dismissed) */}
          {game.isGameOver && !showGameOverModal && (
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

      {/* Game Over Modal */}
      {showGameOverModal && (
        <GameOverModal
          result={game.result}
          onNewGame={() => router.push('/game/new')}
          onGoHome={() => {
            setShowGameOverModal(false);
            router.push('/');
          }}
        />
      )}
    </div>
  );
}
