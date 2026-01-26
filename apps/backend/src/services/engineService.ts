import * as Sentry from '@sentry/node';
import type { DifficultyLevel } from '@chess-website/shared';
import type {
  PlayStyleStrategy,
  EngineConfig,
  EngineResult,
  EngineProvider,
} from '../engines/types';
import { stockfishProvider } from '../engines/StockfishEngine';
import { EnginePool } from '../engines/EnginePool';
import { DefaultPlayStyle } from '../engines/styles/DefaultPlayStyle';
import { config } from '../config/unifiedConfig';

/**
 * EngineService - Orchestrates chess engine pool and play styles
 *
 * Responsibilities:
 * - Manages engine pool lifecycle (initialization, disposal)
 * - Applies play style modifications
 * - Handles opening book lookups
 * - Provides extension points for MCP/RAG integration
 */
export class EngineService {
  private enginePool: EnginePool | null = null;
  private playStyle: PlayStyleStrategy;
  private providers: Map<string, EngineProvider> = new Map();
  private currentProvider = 'stockfish';
  private initializationPromise: Promise<void> | null = null;

  constructor(playStyle?: PlayStyleStrategy) {
    this.playStyle = playStyle || new DefaultPlayStyle();

    // Register default providers
    this.registerProvider(stockfishProvider);
  }

  /**
   * Register an engine provider for future use
   */
  registerProvider(provider: EngineProvider): void {
    this.providers.set(provider.name, provider);

    Sentry.addBreadcrumb({
      message: `Registered engine provider: ${provider.name}`,
      category: 'engine',
      data: { description: provider.description },
    });
  }

  /**
   * Set the active play style strategy
   */
  setPlayStyle(style: PlayStyleStrategy): void {
    this.playStyle = style;

    Sentry.addBreadcrumb({
      message: `Set play style: ${style.name}`,
      category: 'engine',
    });
  }

  /**
   * Switch to a different engine provider
   */
  async switchProvider(providerName: string): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown engine provider: ${providerName}`);
    }

    // Dispose current engine pool
    if (this.enginePool) {
      await this.enginePool.disposeAll();
      this.enginePool = null;
      this.initializationPromise = null;
    }

    this.currentProvider = providerName;

    Sentry.addBreadcrumb({
      message: `Switched to engine provider: ${providerName}`,
      category: 'engine',
    });
  }

  /**
   * Initialize the engine pool (lazy initialization)
   */
  private async ensureInitialized(): Promise<void> {
    if (this.enginePool && !this.enginePool.isPoolDisposed()) {
      return;
    }

    // Prevent multiple concurrent initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeEnginePool();
    await this.initializationPromise;
  }

  private async initializeEnginePool(): Promise<void> {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`Engine provider not found: ${this.currentProvider}`);
    }

    Sentry.addBreadcrumb({
      message: `Initializing engine pool from provider: ${this.currentProvider}`,
      category: 'engine',
      data: { poolSize: config.engine.poolSize },
    });

    this.enginePool = new EnginePool(provider, config.engine.poolSize);
    await this.enginePool.initialize();
  }

  /**
   * Get the best move for a position
   *
   * @param fen - Current board position in FEN notation
   * @param difficultyLevel - Difficulty level (1-5)
   * @param movesHistory - List of moves played (for opening book lookup)
   */
  async getEngineMove(
    fen: string,
    difficultyLevel: DifficultyLevel,
    movesHistory: string[] = []
  ): Promise<EngineResult> {
    Sentry.addBreadcrumb({
      message: 'Getting engine move',
      category: 'engine',
      data: { fen, difficultyLevel, moveCount: movesHistory.length },
    });

    // Check for opening book move first
    if (this.playStyle.getOpeningMove) {
      const openingMove = await this.playStyle.getOpeningMove(fen, movesHistory);
      if (openingMove) {
        Sentry.addBreadcrumb({
          message: 'Using opening book move',
          category: 'engine',
          data: { move: openingMove },
        });

        return {
          move: openingMove,
          depth: 0, // Book move, no calculation
        };
      }
    }

    // Ensure engine pool is initialized
    await this.ensureInitialized();

    if (!this.enginePool) {
      throw new Error('Engine pool failed to initialize');
    }

    // Build engine config
    const baseConfig: EngineConfig = {
      depth: config.stockfish.depths[difficultyLevel] || 5,
      timeout: config.engine.timeout,
      difficultyLevel,
    };

    // Allow play style to modify config
    const engineConfig = this.playStyle.modifyConfig(baseConfig);

    // Acquire an engine from the pool
    const engine = await this.enginePool.acquire();

    try {
      // Get move from engine
      const result = await engine.getBestMove(fen, engineConfig);

      Sentry.addBreadcrumb({
        message: 'Engine move calculated',
        category: 'engine',
        data: {
          move: result.move,
          depth: result.depth,
          score: result.score,
        },
      });

      return result;
    } finally {
      // Always release the engine back to the pool
      this.enginePool.release(engine);
    }
  }

  /**
   * Check if engine pool is ready
   */
  isReady(): boolean {
    return this.enginePool !== null && !this.enginePool.isPoolDisposed();
  }

  /**
   * Dispose of all engine resources
   */
  async dispose(): Promise<void> {
    if (this.enginePool) {
      await this.enginePool.disposeAll();
      this.enginePool = null;
      this.initializationPromise = null;

      Sentry.addBreadcrumb({
        message: 'Engine service disposed',
        category: 'engine',
      });
    }
  }

  /**
   * Get pool statistics for monitoring
   */
  getPoolStats(): { poolSize: number; available: number; waiting: number } | null {
    if (!this.enginePool) {
      return null;
    }
    return {
      poolSize: this.enginePool.getPoolSize(),
      available: this.enginePool.getAvailableCount(),
      waiting: this.enginePool.getWaitQueueLength(),
    };
  }
}
