import { useEffect, useRef } from 'react';

import { useAriaLiveAnnouncer } from '@/hooks/useAriaLiveAnnouncer';

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

/**
 * Formats milliseconds to screen-reader-friendly format.
 * E.g., "5 minutes 30 seconds" instead of "5:30".
 */
function formatTimeForScreenReader(ms: number): string {
  if (ms <= 0) return '0 seconds';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

/** Debounce interval for low time announcements (10 seconds). */
const LOW_TIME_ANNOUNCE_INTERVAL_MS = 10_000;

/** Thresholds (in seconds) at which to announce low time. */
const ANNOUNCE_THRESHOLDS = new Set([5, 10, 20, 30]);

interface ChessClockProps {
  time: number;
  isActive: boolean;
  label: string;
  isLow?: boolean;
}

export function ChessClock({ time, isActive, label, isLow }: ChessClockProps) {
  const { announce } = useAriaLiveAnnouncer();
  const lastAnnouncedRef = useRef(0);

  // Debounced low-time announcements via centralized announcer
  useEffect(() => {
    if (!isActive || !isLow || time <= 0) return;

    const now = Date.now();
    const timeSinceLastAnnouncement = now - lastAnnouncedRef.current;
    const totalSeconds = Math.floor(time / 1000);

    if (
      timeSinceLastAnnouncement >= LOW_TIME_ANNOUNCE_INTERVAL_MS &&
      (totalSeconds <= 5 || ANNOUNCE_THRESHOLDS.has(totalSeconds))
    ) {
      lastAnnouncedRef.current = now;
      announce(`${label}: ${formatTimeForScreenReader(time)} remaining`, 'assertive');
    }
  }, [time, isActive, isLow, label, announce]);

  const srTimeLabel = `${label}: ${formatTimeForScreenReader(time)}${isLow ? ' — low time' : ''}`;

  return (
    <div
      role="timer"
      aria-label={srTimeLabel}
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
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${
            isActive
              ? isLow
                ? 'animate-pulse bg-red-500'
                : 'bg-emerald-500'
              : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        />
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        {/* Non-color low time indicator (text, not just red color) */}
        {isLow && isActive && (
          <span className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
            Low
          </span>
        )}
      </div>
      <span
        aria-hidden="true"
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
