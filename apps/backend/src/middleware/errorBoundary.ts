import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import type { ApiError } from '@chess-website/shared';
import { config } from '../config/unifiedConfig';

export function errorBoundary(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Capture to Sentry
  Sentry.captureException(err, {
    tags: { handler: 'errorBoundary' },
  });

  const response: ApiError = {
    success: false,
    error: config.server.nodeEnv === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  };

  res.status(500).json(response);
}
