'use client';

import { useRef, useEffect } from 'react';
import type { GameResult } from '@chess-website/shared';

interface ResultInfo {
  title: string;
  subtitle: string;
  color: 'emerald' | 'red' | 'amber' | 'zinc';
  icon: 'trophy' | 'x' | 'clock' | 'draw' | 'flag' | 'info';
}

function getResultInfo(result?: GameResult): ResultInfo {
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
}

function getColorClasses(color: ResultInfo['color']) {
  switch (color) {
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
}

function ResultIcon({ icon }: { icon: ResultInfo['icon'] }) {
  switch (icon) {
    case 'trophy':
      return (
        <svg aria-hidden="true" className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
        </svg>
      );
    case 'x':
      return (
        <svg
          aria-hidden="true"
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
        <svg aria-hidden="true" className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
        </svg>
      );
    case 'draw':
      return (
        <svg
          aria-hidden="true"
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
        <svg aria-hidden="true" className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      );
  }
}

interface GameOverModalProps {
  result?: GameResult;
  onNewGame: () => void;
  onGoHome: () => void;
}

export function GameOverModal({ result, onNewGame, onGoHome }: GameOverModalProps) {
  const info = getResultInfo(result);
  const colors = getColorClasses(info.color);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open dialog as modal on mount (provides focus trap + Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  // Handle native close event (Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onGoHome();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onGoHome]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="game-over-title"
      className="fixed z-50 m-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-sm bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Icon section */}
        <div className={`flex flex-col items-center pb-6 pt-8 ${colors.bg}`}>
          <div className={`mb-4 rounded-full p-4 ring-8 ${colors.ring} ${colors.bg}`}>
            <span className={colors.text}>
              <ResultIcon icon={info.icon} />
            </span>
          </div>
          <h2 id="game-over-title" className={`text-3xl font-bold ${colors.text}`}>
            {info.title}
          </h2>
          {info.subtitle && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{info.subtitle}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 p-6">
          <button
            onClick={onNewGame}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
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
    </dialog>
  );
}
