export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type TimeControlType =
  | 'none'
  | 'bullet_1min'
  | 'bullet_2min'
  | 'blitz_3min'
  | 'blitz_5min'
  | 'rapid_10min'
  | 'rapid_15min'
  | 'classical_30min';

export interface TimeControlConfig {
  type: TimeControlType;
  initialTime: number; // milliseconds
  increment: number; // milliseconds
}

export const TIME_CONTROL_CONFIGS: Record<TimeControlType, TimeControlConfig> = {
  none: { type: 'none', initialTime: 0, increment: 0 },
  bullet_1min: { type: 'bullet_1min', initialTime: 60000, increment: 0 },
  bullet_2min: { type: 'bullet_2min', initialTime: 120000, increment: 1000 },
  blitz_3min: { type: 'blitz_3min', initialTime: 180000, increment: 0 },
  blitz_5min: { type: 'blitz_5min', initialTime: 300000, increment: 0 },
  rapid_10min: { type: 'rapid_10min', initialTime: 600000, increment: 0 },
  rapid_15min: { type: 'rapid_15min', initialTime: 900000, increment: 10000 },
  classical_30min: { type: 'classical_30min', initialTime: 1800000, increment: 0 },
};

export type GameStatus = 'active' | 'finished' | 'abandoned';

export type GameResult =
  | 'user_win_checkmate'
  | 'user_win_timeout'
  | 'engine_win_checkmate'
  | 'engine_win_timeout'
  | 'draw_stalemate'
  | 'draw_repetition'
  | 'draw_fifty_moves'
  | 'draw_insufficient_material'
  | 'user_resigned';

export interface CreateGameRequest {
  difficultyLevel: DifficultyLevel;
  timeControlType: TimeControlType;
}

export interface MakeMoveRequest {
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface GameResponse {
  id: string;
  userId: string;
  status: GameStatus;
  difficultyLevel: DifficultyLevel;
  timeControlType: TimeControlType;
  currentFen: string;
  movesHistory: string[];
  timeLeftUser: number;
  timeLeftEngine: number;
  turnStartedAt: string | null;
  result?: GameResult;
  currentTurn: 'w' | 'b';
  isCheck: boolean;
  isGameOver: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GameListItem {
  id: string;
  status: GameStatus;
  difficultyLevel: DifficultyLevel;
  timeControlType: TimeControlType;
  result?: GameResult;
  currentTurn: 'w' | 'b';
  createdAt: string;
  updatedAt: string;
}

export interface MoveResponse {
  success: boolean;
  game: GameResponse;
  engineMove?: {
    from: string;
    to: string;
    promotion?: string;
    san: string;
  };
}

// Starting position FEN
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
