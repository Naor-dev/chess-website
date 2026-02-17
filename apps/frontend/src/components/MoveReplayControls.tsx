'use client';

interface MoveReplayControlsProps {
  currentMoveIndex: number;
  totalMoves: number;
  canGoBack: boolean;
  canGoForward: boolean;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}

/**
 * Navigation controls for move-by-move game replay.
 * Shows |<< (first), < (prev), > (next), >>| (last) buttons
 * and displays current position as "Move X of Y".
 */
export function MoveReplayControls({
  currentMoveIndex,
  totalMoves,
  canGoBack,
  canGoForward,
  onFirst,
  onPrev,
  onNext,
  onLast,
}: MoveReplayControlsProps) {
  // Convert move index to display number (1-indexed, or "Start" for -1)
  const displayPosition =
    currentMoveIndex === -1 ? 'Start' : `Move ${currentMoveIndex + 1} of ${totalMoves}`;

  return (
    <div className="flex items-center justify-between rounded-lg sm:rounded-xl border-2 border-zinc-200/50 bg-white/60 dark:border-zinc-800/50 dark:bg-zinc-900/40 px-3 sm:px-4 py-2.5 sm:py-3 backdrop-blur-sm">
      {/* Navigation buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* First (|<<) */}
        <button
          onClick={onFirst}
          disabled={!canGoBack}
          className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-all ${
            canGoBack
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60'
              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
          }`}
          title="Go to start"
          aria-label="Go to start"
        >
          <svg aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Previous (<) */}
        <button
          onClick={onPrev}
          disabled={!canGoBack}
          className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-all ${
            canGoBack
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60'
              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
          }`}
          title="Previous move"
          aria-label="Previous move"
        >
          <svg aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        {/* Next (>) */}
        <button
          onClick={onNext}
          disabled={!canGoForward}
          className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-all ${
            canGoForward
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60'
              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
          }`}
          title="Next move"
          aria-label="Next move"
        >
          <svg aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>

        {/* Last (>>|) */}
        <button
          onClick={onLast}
          disabled={!canGoForward}
          className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-all ${
            canGoForward
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60'
              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600'
          }`}
          title="Go to end"
          aria-label="Go to end"
        >
          <svg aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {/* Position indicator */}
      <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{displayPosition}</div>
    </div>
  );
}
