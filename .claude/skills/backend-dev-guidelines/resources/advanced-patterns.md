# Advanced Backend Patterns

Patterns for caching, rate limiting, background jobs, and resilience.

## Caching Strategies

### Redis Caching Layer

```typescript
class CachedRepository<T> {
  constructor(
    private baseRepo: BaseRepository<T>,
    private redis: RedisClient,
    private prefix: string,
    private ttl: number = 300 // 5 minutes
  ) {}

  async findById(id: string): Promise<T | null> {
    const cacheKey = `${this.prefix}:${id}`;

    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss - fetch from database
    const entity = await this.baseRepo.findById(id);

    if (entity) {
      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(entity));
    }

    return entity;
  }

  async invalidate(id: string): Promise<void> {
    await this.redis.del(`${this.prefix}:${id}`);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`${this.prefix}:${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Cache-Aside Pattern

```typescript
async function getWithCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Try cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Cache miss - fetch from source
  const data = await fetchFn();

  // Update cache
  await redis.setex(cacheKey, ttl, JSON.stringify(data));

  return data;
}

// Usage
const game = await getWithCache(
  `game:${gameId}`,
  () => gameRepository.findById(gameId),
  600 // 10 minutes
);
```

## Rate Limiting

### In-Memory Rate Limiter

```typescript
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests = new Map<string, number[]>();

  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get requests in current window
    const requests = (this.requests.get(identifier) || []).filter((time) => time > windowStart);

    const allowed = requests.length < config.maxRequests;

    if (allowed) {
      requests.push(now);
      this.requests.set(identifier, requests);
    }

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - requests.length),
      resetMs: requests.length > 0 ? requests[0] + config.windowMs - now : 0,
    };
  }
}

// Middleware
export function rateLimitMiddleware(config: RateLimitConfig) {
  const limiter = new RateLimiter();

  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const result = await limiter.checkLimit(String(identifier), config);

    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(result.resetMs / 1000),
      });
    }

    next();
  };
}

// Usage
app.use('/api/games', rateLimitMiddleware({ maxRequests: 100, windowMs: 60000 }));
```

## Background Jobs

### Simple Job Queue

```typescript
interface Job<T = unknown> {
  id: string;
  type: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

class JobQueue {
  private queue: Job[] = [];
  private processing = false;
  private handlers = new Map<string, (data: unknown) => Promise<void>>();

  register<T>(type: string, handler: (data: T) => Promise<void>): void {
    this.handlers.set(type, handler as (data: unknown) => Promise<void>);
  }

  async add<T>(type: string, data: T, maxAttempts = 3): Promise<string> {
    const job: Job<T> = {
      id: crypto.randomUUID(),
      type,
      data,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
    };

    this.queue.push(job);

    if (!this.processing) {
      this.process();
    }

    return job.id;
  }

  private async process(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      const handler = this.handlers.get(job.type);

      if (!handler) {
        console.error(`No handler for job type: ${job.type}`);
        continue;
      }

      try {
        job.attempts++;
        await handler(job.data);
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);

        if (job.attempts < job.maxAttempts) {
          // Re-queue with delay
          setTimeout(() => this.queue.push(job), 1000 * job.attempts);
        } else {
          Sentry.captureException(error, {
            tags: { jobType: job.type, jobId: job.id },
          });
        }
      }
    }

    this.processing = false;
  }
}

// Usage
const jobQueue = new JobQueue();

jobQueue.register('email:send', async (data: { to: string; subject: string }) => {
  await emailService.send(data.to, data.subject);
});

jobQueue.register('game:analyze', async (data: { gameId: string }) => {
  await analysisService.analyzeGame(data.gameId);
});

// Add job
await jobQueue.add('email:send', { to: 'user@example.com', subject: 'Welcome!' });
```

## Retry with Exponential Backoff

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (error: Error) => boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (config.shouldRetry && !config.shouldRetry(lastError)) {
        throw lastError;
      }

      if (attempt < config.maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(
          config.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
          config.maxDelayMs
        );

        console.log(`Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// Usage
const result = await withRetry(() => externalApi.fetchData(), {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  shouldRetry: (error) => error.message.includes('timeout'),
});
```

## Structured Logging

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

class StructuredLogger {
  constructor(private serviceName: string) {}

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...context,
    };

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      console[level](message, context || '');
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error: Error, context?: LogContext): void {
    this.log('error', message, {
      ...context,
      error: error.message,
      stack: error.stack,
    });
  }

  // Request logging middleware
  requestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = crypto.randomUUID();
      const start = Date.now();

      req.requestId = requestId;
      res.setHeader('X-Request-ID', requestId);

      res.on('finish', () => {
        this.info('Request completed', {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: Date.now() - start,
          userId: req.user?.id,
        });
      });

      next();
    };
  }
}

// Usage
const logger = new StructuredLogger('chess-backend');

logger.info('Game created', {
  gameId: game.id,
  userId: user.id,
  difficulty: game.difficultyLevel,
});
```

## N+1 Query Prevention

```typescript
// ❌ BAD: N+1 queries
const games = await gameRepository.findByUserId(userId);
for (const game of games) {
  game.moves = await moveRepository.findByGameId(game.id); // N queries!
}

// ✅ GOOD: Batch fetch with DataLoader
import DataLoader from 'dataloader';

const moveLoader = new DataLoader<string, Move[]>(async (gameIds) => {
  const moves = await moveRepository.findByGameIds(gameIds);
  const movesByGame = new Map<string, Move[]>();

  for (const move of moves) {
    const existing = movesByGame.get(move.gameId) || [];
    existing.push(move);
    movesByGame.set(move.gameId, existing);
  }

  return gameIds.map((id) => movesByGame.get(id) || []);
});

// Now uses batching automatically
const games = await gameRepository.findByUserId(userId);
await Promise.all(
  games.map(async (game) => {
    game.moves = await moveLoader.load(game.id);
  })
);
```

---

**Related Resources:**

- [services-and-repositories.md](services-and-repositories.md) - Base patterns
- [async-and-errors.md](async-and-errors.md) - Error handling
- [middleware-guide.md](middleware-guide.md) - Middleware patterns
