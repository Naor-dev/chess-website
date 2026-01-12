import rateLimit from 'express-rate-limit';
import { config } from '../config/unifiedConfig';
import type { ApiError } from '@chess-website/shared';

/**
 * Rate limiter for authentication endpoints.
 * More restrictive to prevent brute force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  } as ApiError,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.server.nodeEnv === 'development',
});

/**
 * General rate limiter for API endpoints.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  } as ApiError,
  standardHeaders: true,
  legacyHeaders: false,
});
