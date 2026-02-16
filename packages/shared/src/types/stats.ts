export interface DifficultyStats {
  level: number;
  total: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface TimeControlStats {
  type: string;
  total: number;
  wins: number;
}

export interface UserStatsResponse {
  totalGames: number;
  activeGames: number;
  finishedGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgMovesPerGame: number;
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  byDifficulty: DifficultyStats[];
  byTimeControl: TimeControlStats[];
}
