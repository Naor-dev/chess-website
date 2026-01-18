import type { DifficultyLevel } from '@chess-website/shared';

/**
 * Engine configuration passed to ChessEngine.getBestMove()
 */
export interface EngineConfig {
  depth: number;
  timeout: number; // milliseconds
  difficultyLevel: DifficultyLevel;
}

/**
 * Result from engine analysis
 */
export interface EngineMove {
  from: string;
  to: string;
  promotion?: string;
  san?: string; // Standard Algebraic Notation (filled by caller with chess.js)
}

/**
 * Full result from engine including analysis info
 */
export interface EngineResult {
  move: EngineMove;
  depth: number;
  score?: number; // centipawns
  pv?: string[]; // principal variation
}

/**
 * ChessEngine interface - pluggable engine implementations
 *
 * Implement this interface to add new engines:
 * - StockfishEngine (WASM) - current implementation
 * - MCPEngine (future) - MCP-based engine provider
 * - RemoteEngine (future) - cloud-based engine
 */
export interface ChessEngine {
  /** Engine identifier */
  readonly name: string;

  /** Initialize the engine (load WASM, connect to service, etc.) */
  initialize(): Promise<void>;

  /** Get the best move for a given position */
  getBestMove(fen: string, config: EngineConfig): Promise<EngineResult>;

  /** Clean up resources */
  dispose(): Promise<void>;

  /** Check if engine is ready */
  isReady(): boolean;
}

/**
 * PlayStyleStrategy interface - RAG/opening book extension point
 *
 * Implement this interface to add personality or opening book support:
 * - DefaultPlayStyle - no modifications (current)
 * - SicilianStyle (future) - prefers Sicilian openings
 * - AggressiveStyle (future) - prefers sharp positions
 */
export interface PlayStyleStrategy {
  /** Strategy identifier */
  readonly name: string;

  /**
   * Modify engine configuration before analysis
   * Can adjust depth, add contempt, etc.
   */
  modifyConfig(config: EngineConfig): EngineConfig;

  /**
   * Get a predetermined opening move from a book or RAG system
   * Returns null if no book move available
   */
  getOpeningMove?(fen: string, history: string[]): Promise<EngineMove | null>;
}

/**
 * EngineProvider - factory for creating engines
 *
 * Used by EngineService to manage multiple engine implementations
 */
export interface EngineProvider {
  /** Provider identifier (e.g., 'stockfish', 'mcp') */
  readonly name: string;

  /** Human-readable description */
  readonly description: string;

  /** Create a new engine instance */
  createEngine(): ChessEngine;
}
