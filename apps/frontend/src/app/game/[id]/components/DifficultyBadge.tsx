const DIFFICULTY_LABELS = ['', 'Beginner', 'Easy', 'Medium', 'Hard', 'Master'];

interface DifficultyBadgeProps {
  level: number;
}

export function DifficultyBadge({ level }: DifficultyBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Level {level}</span>
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        {DIFFICULTY_LABELS[level]}
      </span>
    </div>
  );
}
