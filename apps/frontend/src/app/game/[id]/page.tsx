'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { useAuth } from '@/contexts/AuthContext';
import { gameApi } from '@/lib/gameApi';
import { useBoardSize } from '@/hooks/useBoardSize';
import { useMoveReplay } from '@/hooks/useMoveReplay';
import { MoveReplayControls } from '@/components/MoveReplayControls';
import type { GameResponse, MakeMoveRequest } from '@chess-website/shared';
import {
  ChessClock,
  DifficultyBadge,
  EngineThinkingOverlay,
  GameInfo,
  GameOverModal,
} from './components';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const gameId = params.id as string;
  const { boardSize } = useBoardSize();

  const [game, setGame] = useState<GameResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isResigning, setIsResigning] = useState(false);
  const [invalidMove, setInvalidMove] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);

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

  // Replay mode for finished games
  const isReplayMode = game?.isGameOver ?? false;
  const {
    currentMoveIndex,
    currentFen: replayFen,
    totalMoves,
    canGoBack,
    canGoForward,
    goToStart,
    goBack,
    goForward,
    goToEnd,
  } = useMoveReplay(game?.movesHistory ?? []);

  // Use replay FEN when in replay mode, otherwise use current game FEN
  const displayFen = isReplayMode ? replayFen : (game?.currentFen ?? '');

  // Custom square styles for highlighting selected piece and possible moves
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
      };
    }

    // Highlight possible moves with dots (empty squares) or rings (capture squares)
    possibleMoves.forEach((square) => {
      const pieceOnSquare = chess?.get(square);
      const isCapture = pieceOnSquare !== null && pieceOnSquare !== undefined;
      if (isCapture) {
        // Capture move - show a ring around the piece
        styles[square] = {
          background:
            'radial-gradient(transparent 0%, transparent 70%, rgba(0, 0, 0, 0.25) 70%, rgba(0, 0, 0, 0.25) 85%, transparent 85%)',
        };
      } else {
        // Empty square - show a dot in the center
        styles[square] = {
          background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.2) 22%, transparent 22%)',
        };
      }
    });

    return styles;
  }, [selectedSquare, possibleMoves, chess]);

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

  // Visibility change handler - re-sync time when tab becomes visible
  // This handles reconnection scenarios where the user switches tabs or minimizes the browser
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && game && !game.isGameOver) {
        // Re-fetch game to get accurate server time
        fetchGame();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [game, fetchGame]);

  // Keyboard navigation for replay mode
  useEffect(() => {
    if (!isReplayMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goBack();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goForward();
          break;
        case 'Home':
          event.preventDefault();
          goToStart();
          break;
        case 'End':
          event.preventDefault();
          goToEnd();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isReplayMode, goBack, goForward, goToStart, goToEnd]);

  // Handle piece drop (drag and drop move)
  const onDrop = useCallback(
    ({
      piece,
      sourceSquare,
      targetSquare,
    }: {
      piece: { pieceType: string };
      sourceSquare: string;
      targetSquare: string | null;
    }): boolean => {
      if (!game || !chess || isMoving || game.isGameOver) return false;
      if (game.currentTurn !== 'w') return false; // Not user's turn
      if (!targetSquare) return false; // Dropped off board

      // Check if it's a promotion move (pieceType is like 'wP' for white pawn)
      const isPromotion =
        piece.pieceType[1] === 'P' &&
        ((piece.pieceType[0] === 'w' && targetSquare[1] === '8') ||
          (piece.pieceType[0] === 'b' && targetSquare[1] === '1'));

      // Helper to trigger invalid move animation
      const triggerInvalidMove = () => {
        setInvalidMove(true);
        setTimeout(() => setInvalidMove(false), 500);
      };

      // Validate move client-side first with a test chess instance
      let newFen: string;
      try {
        const testChess = new Chess(game.currentFen);
        const moveResult = testChess.move({
          from: sourceSquare as Square,
          to: targetSquare as Square,
          promotion: isPromotion ? 'q' : undefined, // Default to queen promotion
        });

        if (!moveResult) {
          triggerInvalidMove();
          return false; // Invalid move
        }
        newFen = testChess.fen();
      } catch {
        triggerInvalidMove();
        return false; // Invalid move
      }

      // Optimistic update - show the move immediately
      const previousGame = game;
      setGame((prev) => (prev ? { ...prev, currentFen: newFen, currentTurn: 'b' } : prev));
      setIsMoving(true);
      setMoveError(null);

      // Make the move via API
      const move: MakeMoveRequest = {
        from: sourceSquare as Square,
        to: targetSquare as Square,
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

  // Handle square click to show possible moves
  const onSquareClick = useCallback(
    ({ square }: { piece: { pieceType: string } | null; square: string }) => {
      const clickedSquare = square as Square;

      if (!game || !chess || game.isGameOver || game.currentTurn !== 'w') {
        // Clear selection if game is over or not user's turn
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      // If clicking the same square, deselect
      if (selectedSquare === clickedSquare) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      // Check if clicking on a possible move (make the move via click)
      if (selectedSquare && possibleMoves.includes(clickedSquare)) {
        const piece = chess.get(selectedSquare);

        // Make move via drop handler (it handles promotion detection)
        onDrop({
          piece: { pieceType: `${piece?.color}${piece?.type.toUpperCase()}` },
          sourceSquare: selectedSquare,
          targetSquare: clickedSquare,
        });

        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      // Check if the square has a piece of the current player
      const pieceOnSquare = chess.get(clickedSquare);
      if (pieceOnSquare && pieceOnSquare.color === 'w') {
        // Get legal moves for this piece
        const moves = chess.moves({ square: clickedSquare, verbose: true });
        const targetSquares = moves.map((move) => move.to as Square);

        setSelectedSquare(clickedSquare);
        setPossibleMoves(targetSquares);
      } else {
        // Clicked on empty square or opponent piece - clear selection
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    },
    [game, chess, selectedSquare, possibleMoves, onDrop]
  );

  // Clear selection when move is made (after drag or when turn changes)
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
  }, [game?.currentFen]);

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

  // Handle resign game
  const handleResign = async () => {
    if (!game || isResigning || game.isGameOver) return;

    // Confirmation dialog
    const confirmed = window.confirm('Are you sure you want to resign? This will count as a loss.');
    if (!confirmed) return;

    setIsResigning(true);
    setMoveError(null);

    try {
      const result = await gameApi.resignGame(gameId);
      setGame(result);
    } catch (err) {
      console.error('Failed to resign game:', err);
      setMoveError('Failed to resign game. Please try again.');
    } finally {
      setIsResigning(false);
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
          className="flex items-center gap-3 rounded-2xl bg-white/80 p-8 backdrop-blur-sm dark:bg-zinc-900/80 shadow-xl"
          role="status"
          aria-live="polite"
        >
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-500"
            aria-hidden="true"
          />
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
              aria-hidden="true"
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
          <Link
            href="/"
            className="inline-block rounded-xl bg-zinc-900 px-6 py-3 font-medium text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const showClocks = game.timeControlType !== 'none';
  const isUserTurn = game.currentTurn === 'w';
  const isLowTime = (time: number) => time > 0 && time < 30000;

  return (
    <div className="flex min-h-screen flex-col gradient-bg chess-pattern">
      <h1 className="sr-only">Chess Game</h1>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-200/50 bg-white/80 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav aria-label="Site navigation" className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              aria-label="Home"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
              </svg>
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              href="/history"
              aria-label="My Games"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              <span className="hidden sm:inline">My Games</span>
            </Link>
          </nav>

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
                aria-hidden="true"
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
                aria-hidden="true"
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
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-6 lg:p-8"
      >
        <div className="w-full space-y-3 sm:space-y-4" style={{ maxWidth: boardSize + 48 }}>
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
          <div
            className={`relative mx-auto overflow-hidden rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl glow transition-all ${
              invalidMove ? 'animate-shake ring-4 ring-red-500/50' : ''
            }`}
            style={{ width: boardSize }}
          >
            <Chessboard
              options={{
                position: displayFen,
                allowDragging: !game.isGameOver && isUserTurn && !isMoving,
                onPieceDrop: onDrop,
                onSquareClick: onSquareClick,
                squareStyles: isReplayMode ? {} : customSquareStyles,
                boardStyle: {
                  borderRadius: '0',
                },
                darkSquareStyle: { backgroundColor: '#769656' },
                lightSquareStyle: { backgroundColor: '#eeeed2' },
              }}
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

          {/* Replay Controls (for finished games) */}
          {isReplayMode && totalMoves > 0 && (
            <MoveReplayControls
              currentMoveIndex={currentMoveIndex}
              totalMoves={totalMoves}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onFirst={goToStart}
              onPrev={goBack}
              onNext={goForward}
              onLast={goToEnd}
            />
          )}

          {/* Action Buttons (when game is over but modal dismissed) */}
          {game.isGameOver && !showGameOverModal && (
            <div className="flex gap-3 pt-2">
              <Link
                href="/game/new"
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-center font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
              >
                New Game
              </Link>
              <Link
                href="/"
                className="rounded-xl bg-zinc-200 px-6 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Home
              </Link>
            </div>
          )}

          {/* Resign button (when game is active) */}
          {!game.isGameOver && (
            <button
              onClick={handleResign}
              disabled={isResigning}
              className={`w-full rounded-lg sm:rounded-xl border-2 px-4 sm:px-6 py-2.5 sm:py-3 font-medium backdrop-blur-sm transition-all ${
                isResigning
                  ? 'border-zinc-300 bg-zinc-100 text-zinc-400 cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-600'
                  : 'border-zinc-200 bg-white/60 text-zinc-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-400'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {isResigning ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
                ) : (
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
                  </svg>
                )}
                {isResigning ? 'Resigning...' : 'Resign'}
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
