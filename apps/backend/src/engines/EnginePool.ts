import * as Sentry from '@sentry/node';
import type { ChessEngine, EngineProvider } from './types';

interface PooledEngine {
  engine: ChessEngine;
  inUse: boolean;
}

/**
 * EnginePool - Manages a pool of chess engine instances.
 *
 * Provides thread-safe access to multiple engine instances,
 * preventing concurrency issues when multiple game operations
 * occur simultaneously.
 */
export class EnginePool {
  private pool: PooledEngine[] = [];
  private provider: EngineProvider;
  private maxSize: number;
  private initializationPromise: Promise<void> | null = null;
  private isDisposed = false;

  // Queue of requests waiting for an engine
  private waitQueue: Array<(engine: ChessEngine) => void> = [];

  constructor(provider: EngineProvider, maxSize: number = 2) {
    this.provider = provider;
    this.maxSize = maxSize;

    Sentry.addBreadcrumb({
      message: `EnginePool created`,
      category: 'engine',
      data: { provider: provider.name, maxSize },
    });
  }

  /**
   * Initialize the pool with engine instances.
   * Creates engines lazily - only creates more when needed up to maxSize.
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    // Create and initialize the first engine
    const engine = this.provider.createEngine();
    await engine.initialize();

    this.pool.push({ engine, inUse: false });

    Sentry.addBreadcrumb({
      message: 'EnginePool initialized',
      category: 'engine',
      data: { poolSize: 1 },
    });
  }

  /**
   * Acquire an engine from the pool.
   * If all engines are busy, either creates a new one (if under max)
   * or waits for one to become available.
   *
   * @returns An engine instance to use
   */
  async acquire(): Promise<ChessEngine> {
    if (this.isDisposed) {
      throw new Error('EnginePool has been disposed');
    }

    // Ensure pool is initialized
    await this.initialize();

    // Try to find an available engine
    for (const pooled of this.pool) {
      if (!pooled.inUse) {
        pooled.inUse = true;
        Sentry.addBreadcrumb({
          message: 'Engine acquired from pool',
          category: 'engine',
          data: { poolSize: this.pool.length, waitQueue: this.waitQueue.length },
        });
        return pooled.engine;
      }
    }

    // All engines busy - try to create a new one if under max
    if (this.pool.length < this.maxSize) {
      const engine = this.provider.createEngine();
      await engine.initialize();

      this.pool.push({ engine, inUse: true });

      Sentry.addBreadcrumb({
        message: 'New engine created in pool',
        category: 'engine',
        data: { poolSize: this.pool.length },
      });

      return engine;
    }

    // At max capacity - wait for an engine to be released
    return new Promise<ChessEngine>((resolve) => {
      this.waitQueue.push(resolve);

      Sentry.addBreadcrumb({
        message: 'Request queued for engine',
        category: 'engine',
        data: { waitQueue: this.waitQueue.length },
      });
    });
  }

  /**
   * Release an engine back to the pool.
   *
   * @param engine - The engine to release
   */
  release(engine: ChessEngine): void {
    const pooled = this.pool.find((p) => p.engine === engine);
    if (!pooled) {
      Sentry.captureMessage('Attempted to release engine not in pool', {
        level: 'warning',
      });
      return;
    }

    // Check if there are waiting requests
    const nextRequest = this.waitQueue.shift();
    if (nextRequest) {
      // Pass directly to waiting request (keep inUse true)
      nextRequest(pooled.engine);
      Sentry.addBreadcrumb({
        message: 'Engine passed to queued request',
        category: 'engine',
        data: { waitQueue: this.waitQueue.length },
      });
    } else {
      // No waiting requests - mark as available
      pooled.inUse = false;
      Sentry.addBreadcrumb({
        message: 'Engine released to pool',
        category: 'engine',
      });
    }
  }

  /**
   * Dispose all engines in the pool.
   * Should be called during graceful shutdown.
   */
  async disposeAll(): Promise<void> {
    this.isDisposed = true;

    // Clear the wait queue - waiting promises will never resolve,
    // but since we're shutting down, that's acceptable
    this.waitQueue = [];

    // Dispose all engines
    const disposePromises = this.pool.map(async (pooled) => {
      try {
        await pooled.engine.dispose();
      } catch (error) {
        Sentry.captureException(error, {
          extra: { context: 'engine pool disposal' },
        });
      }
    });

    await Promise.all(disposePromises);

    Sentry.addBreadcrumb({
      message: 'EnginePool disposed',
      category: 'engine',
      data: { enginesDisposed: this.pool.length },
    });

    this.pool = [];
  }

  /**
   * Get the current pool size.
   */
  getPoolSize(): number {
    return this.pool.length;
  }

  /**
   * Get the number of available engines.
   */
  getAvailableCount(): number {
    return this.pool.filter((p) => !p.inUse).length;
  }

  /**
   * Get the number of waiting requests.
   */
  getWaitQueueLength(): number {
    return this.waitQueue.length;
  }

  /**
   * Check if the pool has been disposed.
   */
  isPoolDisposed(): boolean {
    return this.isDisposed;
  }
}
