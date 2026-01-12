import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { services } from '../services/serviceContainer';
import type { ApiError } from '@chess-website/shared';

// Extend Express Request type to include user info
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Middleware to protect routes requiring authentication.
 * Extracts and validates JWT from Authorization header or cookie.
 * Attaches userId and userEmail to request object.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;

    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

    if (!token) {
      const response: ApiError = {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      };
      res.status(401).json(response);
      return;
    }

    const payload = services.authService.verifyToken(token);

    if (!payload) {
      const response: ApiError = {
        success: false,
        error: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
      };
      res.status(401).json(response);
      return;
    }

    // Attach user info to request
    req.userId = payload.userId;
    req.userEmail = payload.email;

    // Set Sentry user context for error tracking
    Sentry.setUser({
      id: payload.userId,
      email: payload.email,
    });

    next();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { middleware: 'authMiddleware' },
    });

    const response: ApiError = {
      success: false,
      error: 'Authentication failed',
      code: 'UNAUTHORIZED',
    };
    res.status(401).json(response);
  }
}

/**
 * Optional auth middleware that attaches user info if token exists
 * but doesn't require authentication.
 * Useful for endpoints that behave differently for authenticated users.
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;

    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

    if (token) {
      const payload = services.authService.verifyToken(token);
      if (payload) {
        req.userId = payload.userId;
        req.userEmail = payload.email;

        Sentry.setUser({
          id: payload.userId,
          email: payload.email,
        });
      }
    }

    next();
  } catch {
    // Silently continue without auth - this is optional middleware
    next();
  }
}
