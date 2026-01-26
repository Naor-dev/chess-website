import * as Sentry from '@sentry/node';
import type { ChessEngine, EngineConfig, EngineResult } from './types';
import { Stockfish } from '@se-oss/stockfish';
import { Mutex } from '../utils/Mutex';

// Security: FEN validation regex - defense in depth
// FEN format: pieces activeColor castling enPassant halfmove fullmove
const FEN_REGEX = /^[rnbqkpRNBQKP1-8/]+ [wb] [KQkq-]+ [a-h36-]+ \d+ \d+$/;

/**
 * Validates FEN string format for security (defense in depth).
 * Even though FEN comes from chess.js, we validate before passing to UCI.
 */
function isValidFen(fen: string): boolean {
  if (!fen || fen.length > 100) return false; // Reasonable length limit
  return FEN_REGEX.test(fen);
}

// Security: Bounds for engine configuration
const MAX_DEPTH = 30;
const MIN_DEPTH = 1;

/**
 * StockfishEngine - WASM-based Stockfish implementation
 *
 * Uses UCI protocol to communicate with the Stockfish WASM engine.
 * The engine runs in-process via the @se-oss/stockfish npm package.
 */
export class StockfishEngine implements ChessEngine {
  readonly name = 'stockfish';
  private engine: Stockfish | null = null;
  private ready = false;
  private mutex = new Mutex();

  async initialize(): Promise<void> {
    if (this.ready) {
      return;
    }

    Sentry.addBreadcrumb({
      message: 'Initializing Stockfish engine',
      category: 'engine',
    });

    try {
      this.engine = new Stockfish();
      await this.engine.waitReady();
      this.ready = true;

      Sentry.addBreadcrumb({
        message: 'Stockfish engine initialized',
        category: 'engine',
      });
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Failed to initialize Stockfish: ${error}`);
    }
  }

  async getBestMove(fen: string, engineConfig: EngineConfig): Promise<EngineResult> {
    if (!this.ready || !this.engine) {
      throw new Error('Engine not ready');
    }

    // Security: Validate FEN format (defense in depth)
    if (!isValidFen(fen)) {
      throw new Error('Invalid FEN format');
    }

    // Security: Bound depth value (defense in depth)
    const safeDepth = Math.max(MIN_DEPTH, Math.min(MAX_DEPTH, engineConfig.depth));

    // Acquire mutex to serialize access to this engine instance
    const release = await this.mutex.acquire();

    try {
      Sentry.addBreadcrumb({
        message: 'Getting best move from Stockfish',
        category: 'engine',
        data: { fen, depth: safeDepth },
      });

      const analysis = await this.engine.analyze(fen, safeDepth);

      if (!analysis.bestmove) {
        throw new Error('No legal moves available');
      }

      // Parse UCI move format (e.g., e2e4, e7e8q for promotion)
      const bestMove = analysis.bestmove;
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      const promotion = bestMove.length > 4 ? bestMove.slice(4, 5) : undefined;

      // Extract score from analysis lines
      let score: number | undefined;
      let pv: string[] | undefined;

      if (analysis.lines && analysis.lines.length > 0) {
        const line = analysis.lines[0];
        if (line.score?.type === 'cp') {
          score = line.score.value;
        }
        if (line.pv) {
          pv = line.pv.split(' ');
        }
      }

      return {
        move: {
          from,
          to,
          promotion,
        },
        depth: safeDepth,
        score,
        pv,
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Engine analysis failed: ${error}`);
    } finally {
      release();
    }
  }

  async dispose(): Promise<void> {
    if (this.engine) {
      this.engine.terminate();
      this.engine = null;
      this.ready = false;

      Sentry.addBreadcrumb({
        message: 'Stockfish engine disposed',
        category: 'engine',
      });
    }
  }

  isReady(): boolean {
    return this.ready;
  }
}

/**
 * StockfishProvider - factory for creating StockfishEngine instances
 */
export const stockfishProvider = {
  name: 'stockfish',
  description: 'Stockfish 17.1 WASM engine',
  createEngine: () => new StockfishEngine(),
};
