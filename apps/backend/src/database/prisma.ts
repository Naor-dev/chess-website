import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as Sentry from '@sentry/node';
import { config } from '../config/unifiedConfig';

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Creates a configured Prisma client instance with logging and PostgreSQL adapter.
 * Prisma 7 requires using an adapter for direct database connections.
 */
function createPrismaClient(): PrismaClient {
  // Create PostgreSQL connection pool
  const pool = new pg.Pool({
    connectionString: config.database.url,
  });

  // Create Prisma adapter
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    log:
      config.server.nodeEnv === 'development'
        ? [
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
    adapter,
  });
}

export const prisma = global.prisma || createPrismaClient();

if (config.server.nodeEnv !== 'production') {
  global.prisma = prisma;
}

/**
 * Connects to the database with retry logic.
 * @param maxRetries - Maximum number of connection attempts
 * @param delayMs - Delay between retries in milliseconds
 */
export async function connectWithRetry(maxRetries = 5, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect();
      // eslint-disable-next-line no-console
      console.log('Database connected successfully');
      return;
    } catch (error) {
      Sentry.addBreadcrumb({
        message: `Database connection attempt ${attempt}/${maxRetries} failed`,
        category: 'database',
        level: 'warning',
        data: { attempt, maxRetries },
      });

      if (attempt === maxRetries) {
        Sentry.captureException(error, {
          tags: { operation: 'database_connection' },
          extra: { attempts: maxRetries },
        });
        throw new Error(
          `Failed to connect to database after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // eslint-disable-next-line no-console
      console.log(
        `Database connection attempt ${attempt}/${maxRetries} failed. Retrying in ${delayMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Verifies database connection by testing schema access.
 * @returns Object with connection status and optional error
 */
export async function verifyConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    // Test actual table access, not just connection
    await prisma.user.count();
    return { connected: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    Sentry.captureException(error, {
      tags: { operation: 'database_verification' },
    });
    return { connected: false, error: errorMessage };
  }
}

/**
 * Disconnects from the database with timeout.
 * @param timeoutMs - Maximum time to wait for disconnect
 */
export async function disconnectWithTimeout(timeoutMs = 5000): Promise<void> {
  const disconnectPromise = prisma.$disconnect();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Disconnect timeout')), timeoutMs)
  );

  try {
    await Promise.race([disconnectPromise, timeoutPromise]);
    // eslint-disable-next-line no-console
    console.log('Database disconnected successfully');
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: 'database_disconnect' },
    });
    console.error('Database disconnect error:', error);
  }
}
