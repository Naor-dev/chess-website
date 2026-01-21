import { useState, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import { STARTING_FEN } from '@chess-website/shared';

export interface UseMoveReplayResult {
  /** Current move index (-1 = starting position, 0 = after move 1, etc.) */
  currentMoveIndex: number;
  /** FEN at the current position */
  currentFen: string;
  /** Total number of moves in the game */
  totalMoves: number;
  /** Whether we can go back (not at starting position) */
  canGoBack: boolean;
  /** Whether we can go forward (not at final position) */
  canGoForward: boolean;
  /** Go to starting position (before any moves) */
  goToStart: () => void;
  /** Go back one move */
  goBack: () => void;
  /** Go forward one move */
  goForward: () => void;
  /** Go to final position (after all moves) */
  goToEnd: () => void;
  /** Go to a specific move index */
  goToMove: (index: number) => void;
}

/**
 * Hook for managing move-by-move replay of a chess game.
 * Pre-computes all FEN positions for instant navigation.
 * Starts at the final position (end of game) so users see the result first.
 *
 * @param movesHistory - Array of SAN moves (e.g., ['e4', 'e5', 'Nf3'])
 * @param startingFen - Optional starting FEN (defaults to standard starting position)
 * @returns Replay state and navigation functions
 */
export function useMoveReplay(
  movesHistory: string[],
  startingFen: string = STARTING_FEN
): UseMoveReplayResult {
  // Initialize to the end position (last move index) so users see the final game state
  // For a game with N moves, final position is at index N-1
  // For empty history, we stay at -1 (starting position)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(() =>
    movesHistory.length > 0 ? movesHistory.length - 1 : -1
  );

  // Pre-compute all FEN positions for instant navigation
  // Memoized to avoid recalculation on every render
  const positions = useMemo(() => {
    const fens: string[] = [startingFen]; // Index 0 = starting position (before any moves)
    const chess = new Chess(startingFen);

    for (const move of movesHistory) {
      try {
        chess.move(move);
        fens.push(chess.fen());
      } catch {
        // If a move fails to parse, stop processing
        // This handles corrupted move history gracefully
        console.warn(`Failed to parse move: ${move}`);
        break;
      }
    }

    return fens;
  }, [movesHistory, startingFen]);

  const totalMoves = movesHistory.length;

  // Current FEN based on move index
  // Index -1 = starting position (positions[0])
  // Index 0 = after first move (positions[1])
  // etc.
  const currentFen = positions[currentMoveIndex + 1] ?? startingFen;

  const canGoBack = currentMoveIndex >= 0;
  const canGoForward = currentMoveIndex < totalMoves - 1;

  const goToStart = useCallback(() => {
    setCurrentMoveIndex(-1);
  }, []);

  const goBack = useCallback(() => {
    setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
  }, []);

  const goForward = useCallback(() => {
    setCurrentMoveIndex((prev) => Math.min(totalMoves - 1, prev + 1));
  }, [totalMoves]);

  const goToEnd = useCallback(() => {
    setCurrentMoveIndex(totalMoves - 1);
  }, [totalMoves]);

  const goToMove = useCallback(
    (index: number) => {
      // Clamp index to valid range: -1 to totalMoves - 1
      const clampedIndex = Math.max(-1, Math.min(totalMoves - 1, index));
      setCurrentMoveIndex(clampedIndex);
    },
    [totalMoves]
  );

  return {
    currentMoveIndex,
    currentFen,
    totalMoves,
    canGoBack,
    canGoForward,
    goToStart,
    goBack,
    goForward,
    goToEnd,
    goToMove,
  };
}
