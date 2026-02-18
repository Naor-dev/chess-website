import { useState, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';

interface KeyboardMoveInputProps {
  chess: Chess | null;
  isUserTurn: boolean;
  isGameOver: boolean;
  isMoving: boolean;
  onMove: (from: Square, to: Square, promotion?: string) => void;
}

/** Regex for coordinate notation like "e2e4" or "e7e8q" (with optional promotion). */
const COORDINATE_RE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

/**
 * Accessible keyboard move input for screen reader and keyboard-only users.
 * Accepts standard algebraic notation (SAN) like "Nf3", "e4", "O-O",
 * or coordinate notation like "e2e4".
 */
export function KeyboardMoveInput({
  chess,
  isUserTurn,
  isGameOver,
  isMoving,
  onMove,
}: KeyboardMoveInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const input = value.trim();
      if (!input || !chess || !isUserTurn || isGameOver || isMoving) return;

      // Try SAN notation first (e.g., "Nf3", "e4", "O-O", "Qxd7+")
      try {
        const move = chess.move(input);
        if (move) {
          // Undo the move — we only validated, the parent handles the actual move
          chess.undo();
          onMove(move.from as Square, move.to as Square, move.promotion);
          setValue('');
          return;
        }
      } catch {
        // Not valid SAN, try coordinate notation below
      }

      // Try coordinate notation (e.g., "e2e4", "e7e8q")
      const coordMatch = input.toLowerCase().match(COORDINATE_RE);
      if (coordMatch) {
        const [, from, to, promotion] = coordMatch;
        try {
          const move = chess.move({
            from: from as Square,
            to: to as Square,
            promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
          });
          if (move) {
            chess.undo();
            onMove(move.from as Square, move.to as Square, move.promotion);
            setValue('');
            return;
          }
        } catch {
          // Invalid coordinate move
        }
      }

      setError(`"${input}" is not a legal move. Use notation like Nf3, e4, O-O, or e2e4.`);
    },
    [value, chess, isUserTurn, isGameOver, isMoving, onMove]
  );

  const disabled = !isUserTurn || isGameOver || isMoving;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label htmlFor="keyboard-move-input" className="sr-only">
        Enter your move in algebraic notation
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id="keyboard-move-input"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={disabled ? 'Waiting...' : 'Type move (e.g. Nf3, e4, O-O)'}
          disabled={disabled}
          autoComplete="off"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'move-input-error' : 'move-input-help'}
          className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm transition-colors
            ${
              error
                ? 'border-red-300 bg-red-50/50 text-red-900 placeholder-red-400 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200 dark:placeholder-red-600'
                : 'border-zinc-200 bg-white/60 text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:placeholder-zinc-500'
            }
            focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500
            disabled:cursor-not-allowed disabled:opacity-50
            backdrop-blur-sm`}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors
            hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            dark:focus:ring-offset-zinc-900"
        >
          Move
        </button>
      </div>
      {error && (
        <p
          id="move-input-error"
          role="alert"
          className="mt-1 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
      <p id="move-input-help" className="sr-only">
        Enter moves in standard algebraic notation like Nf3, e4, O-O, or coordinate notation like
        e2e4. Press Enter to submit.
      </p>
    </form>
  );
}
