/**
 * Formats milliseconds to MM:SS display format.
 */
function formatTime(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface ChessClockProps {
  time: number;
  isActive: boolean;
  label: string;
  isLow?: boolean;
}

export function ChessClock({ time, isActive, label, isLow }: ChessClockProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg sm:rounded-xl border-2 px-3 sm:px-5 py-3 sm:py-4 transition-all ${
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
        className={`font-mono text-xl sm:text-2xl font-bold tabular-nums ${
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
