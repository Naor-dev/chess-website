import type { GameResponse } from '@chess-website/shared';

interface StatusMessage {
  text: string;
  color: string;
  bg: string;
  border: string;
  icon: 'trophy' | 'x' | 'draw' | 'warning' | 'thinking' | 'play' | 'flag' | 'info';
}

function getStatusMessage(game: GameResponse): StatusMessage {
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
}

function StatusIcon({ icon }: { icon: StatusMessage['icon'] }) {
  switch (icon) {
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
    case 'flag':
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      );
  }
}

interface GameInfoProps {
  game: GameResponse;
}

export function GameInfo({ game }: GameInfoProps) {
  const status = getStatusMessage(game);

  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border px-3 sm:px-4 py-2.5 sm:py-3 ${status.bg} ${status.border} backdrop-blur-sm`}
    >
      <span className={status.color}>
        <StatusIcon icon={status.icon} />
      </span>
      <p className={`font-semibold ${status.color}`}>{status.text}</p>
    </div>
  );
}
