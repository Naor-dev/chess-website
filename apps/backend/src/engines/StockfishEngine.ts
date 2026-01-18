import * as Sentry from '@sentry/node';
import type { ChessEngine, EngineConfig, EngineResult } from './types';
import { config } from '../config/unifiedConfig';
import type stockfish from 'stockfish';

type StockfishInstance = ReturnType<typeof stockfish>;

/**
 * StockfishEngine - WASM-based Stockfish implementation
 *
 * Uses UCI protocol to communicate with the Stockfish WASM engine.
 * The engine runs in-process via the stockfish npm package.
 */
export class StockfishEngine implements ChessEngine {
  readonly name = 'stockfish';
  private engine: StockfishInstance | null = null;
  private ready = false;

  async initialize(): Promise<void> {
    if (this.ready) {
      return;
    }

    Sentry.addBreadcrumb({
      message: 'Initializing Stockfish engine',
      category: 'engine',
    });

    try {
      // Dynamic import for the stockfish WASM module
      const stockfish = await import('stockfish');
      this.engine = stockfish.default();

      // Wait for engine to be ready
      await this.waitForReady();
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

  private waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Stockfish initialization timeout'));
      }, config.engine.initTimeout);

      const handler = (message: string) => {
        if (message === 'readyok') {
          clearTimeout(timeout);
          this.engine?.removeMessageListener(handler);
          resolve();
        }
      };

      this.engine?.addMessageListener(handler);
      this.sendCommand('uci');
      this.sendCommand('isready');
    });
  }

  private sendCommand(command: string): void {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }
    this.engine.postMessage(command);
  }

  async getBestMove(fen: string, engineConfig: EngineConfig): Promise<EngineResult> {
    if (!this.ready || !this.engine) {
      throw new Error('Engine not ready');
    }

    Sentry.addBreadcrumb({
      message: 'Getting best move from Stockfish',
      category: 'engine',
      data: { fen, depth: engineConfig.depth },
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.sendCommand('stop');
        reject(new Error('Engine analysis timeout'));
      }, engineConfig.timeout);

      let bestMove: string | null = null;
      let analysisDepth = 0;
      let score: number | undefined;
      let pv: string[] | undefined;

      const handler = (message: string) => {
        // Parse UCI info messages for analysis data
        if (message.startsWith('info')) {
          const depthMatch = message.match(/depth (\d+)/);
          const scoreMatch = message.match(/score cp (-?\d+)/);
          const pvMatch = message.match(/pv (.+)/);

          if (depthMatch) {
            analysisDepth = parseInt(depthMatch[1], 10);
          }
          if (scoreMatch) {
            score = parseInt(scoreMatch[1], 10);
          }
          if (pvMatch) {
            pv = pvMatch[1].split(' ');
          }
        }

        // Best move found
        if (message.startsWith('bestmove')) {
          clearTimeout(timeout);
          this.engine?.removeMessageListener(handler);

          const parts = message.split(' ');
          bestMove = parts[1];

          if (!bestMove || bestMove === '(none)') {
            reject(new Error('No legal moves available'));
            return;
          }

          // Parse UCI move format (e.g., e2e4, e7e8q for promotion)
          const from = bestMove.slice(0, 2);
          const to = bestMove.slice(2, 4);
          const promotion = bestMove.length > 4 ? bestMove.slice(4, 5) : undefined;

          resolve({
            move: {
              from,
              to,
              promotion,
            },
            depth: analysisDepth,
            score,
            pv,
          });
        }
      };

      // Engine is guaranteed to exist here (checked at function start)
      this.engine!.addMessageListener(handler);

      // Set up position and search
      this.sendCommand('ucinewgame');
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${engineConfig.depth}`);
    });
  }

  async dispose(): Promise<void> {
    if (this.engine) {
      this.sendCommand('quit');
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
  description: 'Stockfish 16 WASM engine',
  createEngine: () => new StockfishEngine(),
};
