import { PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { config } from '../config/unifiedConfig';

/**
 * Base repository class providing common database operations and error handling.
 * All repositories should extend this class to ensure consistent error tracking
 * and Sentry integration.
 */
export abstract class BaseRepository {
  protected readonly repositoryName: string;

  constructor(
    protected readonly prisma: PrismaClient,
    repositoryName: string
  ) {
    this.repositoryName = repositoryName;
  }

  /**
   * Wraps a database operation with error handling and Sentry tracking.
   * @param operation - Name of the operation being performed
   * @param fn - The database operation to execute
   * @param context - Additional context for error tracking
   */
  protected async executeWithErrorHandling<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const fullOperation = `${this.repositoryName}.${operation}`;

    Sentry.addBreadcrumb({
      message: `Executing ${fullOperation}`,
      category: 'database',
      level: 'info',
      data: context,
    });

    const startTime = Date.now();

    try {
      const result = await fn();

      // Log slow queries in development
      const duration = Date.now() - startTime;
      if (duration > 100 && config.server.nodeEnv === 'development') {
        // eslint-disable-next-line no-console
        console.log(`[SLOW QUERY] ${fullOperation} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      Sentry.captureException(error, {
        tags: {
          repository: this.repositoryName,
          operation: fullOperation,
        },
        extra: {
          ...context,
          durationMs: duration,
        },
      });

      // Re-throw with more context
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`${fullOperation} failed: ${message}`);
    }
  }

  /**
   * Adds a Sentry breadcrumb for database operations.
   * @param message - Description of the operation
   * @param data - Additional data to include
   */
  protected addBreadcrumb(message: string, data?: Record<string, unknown>): void {
    Sentry.addBreadcrumb({
      message,
      category: 'database',
      level: 'info',
      data: {
        repository: this.repositoryName,
        ...data,
      },
    });
  }
}
