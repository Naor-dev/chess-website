import { Response } from 'express';
import * as Sentry from '@sentry/node';
import type { ApiResponse, ApiError } from '@chess-website/shared';
import { config } from '../config/unifiedConfig';

export abstract class BaseController {
  protected handleSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
    };
    res.status(statusCode).json(response);
  }

  protected handleError(
    error: unknown,
    res: Response,
    operation: string,
    statusCode: number = 500
  ): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Capture to Sentry with context
    Sentry.captureException(error, {
      tags: { operation },
      extra: { statusCode },
    });

    const response: ApiError = {
      success: false,
      error: config.server.nodeEnv === 'production' ? 'Internal server error' : errorMessage,
      code: 'INTERNAL_ERROR',
    };

    res.status(statusCode).json(response);
  }

  protected handleValidationError(
    res: Response,
    details: Record<string, string[]>
  ): void {
    const response: ApiError = {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
    };
    res.status(400).json(response);
  }

  protected handleNotFound(res: Response, resource: string): void {
    const response: ApiError = {
      success: false,
      error: `${resource} not found`,
      code: 'NOT_FOUND',
    };
    res.status(404).json(response);
  }

  protected handleUnauthorized(res: Response, message: string = 'Unauthorized'): void {
    const response: ApiError = {
      success: false,
      error: message,
      code: 'UNAUTHORIZED',
    };
    res.status(401).json(response);
  }

  protected addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, unknown>
  ): void {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  }
}
