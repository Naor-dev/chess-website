import jwt from 'jsonwebtoken';
import * as Sentry from '@sentry/node';
import { User } from '@prisma/client';
import { config } from '../config/unifiedConfig';
import { UserRepository, FindOrCreateResult } from '../repositories/UserRepository';

const JWT_ISSUER = 'chess-website-api';

/**
 * Parses a time string like '7d' into seconds.
 * Supports: s (seconds), m (minutes), h (hours), d (days)
 */
function parseExpiresIn(value: string): number {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) {
    // Default to 7 days if format is invalid
    return 7 * 24 * 60 * 60;
  }

  const num = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return num;
    case 'm':
      return num * 60;
    case 'h':
      return num * 60 * 60;
    case 'd':
      return num * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60;
  }
}

/**
 * Parses a time string into milliseconds (for cookie maxAge).
 * @param value - Time string like '7d'
 * @returns Time in milliseconds
 */
export function parseExpiresInToMs(value: string): number {
  return parseExpiresIn(value) * 1000;
}

export interface JwtPayload {
  userId: string;
  email: string;
  tokenVersion: number; // For token revocation
  sub: string; // Subject (standard claim)
  iss: string; // Issuer (standard claim)
  aud: string; // Audience (standard claim)
  iat?: number;
  exp?: number;
}

/**
 * Service for authentication operations.
 * Handles JWT generation, validation, and user retrieval.
 */
export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Generates a JWT token for the authenticated user.
   * @param user - The user to generate token for
   * @returns JWT token string
   */
  generateToken(user: User): string {
    Sentry.addBreadcrumb({
      message: 'Generating JWT token',
      category: 'auth',
      level: 'info',
      data: { userId: user.id },
    });

    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
      sub: user.id,
      iss: JWT_ISSUER,
      aud: config.cors.origin,
    };

    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: parseExpiresIn(config.auth.jwtExpiresIn),
    });
  }

  /**
   * Verifies a JWT token and validates tokenVersion against the database.
   * This ensures revoked tokens (via logout-all) are rejected.
   * @param token - JWT token to verify
   * @returns Decoded payload or null if invalid/revoked
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: config.cors.origin,
      }) as JwtPayload;

      // Validate required claims
      if (!decoded.userId || !decoded.email || decoded.tokenVersion === undefined) {
        Sentry.captureMessage('JWT missing required claims', {
          level: 'warning',
          extra: {
            hasUserId: !!decoded.userId,
            hasEmail: !!decoded.email,
            hasTokenVersion: decoded.tokenVersion !== undefined,
          },
        });
        return null;
      }

      // Validate tokenVersion against database (enables token revocation)
      const user = await this.userRepository.findById(decoded.userId);
      if (!user) {
        Sentry.addBreadcrumb({
          message: 'JWT user not found in database',
          category: 'auth',
          level: 'warning',
          data: { userId: decoded.userId },
        });
        return null;
      }

      if (user.tokenVersion !== decoded.tokenVersion) {
        Sentry.addBreadcrumb({
          message: 'JWT token version mismatch - token revoked',
          category: 'auth',
          level: 'info',
          data: {
            userId: decoded.userId,
            tokenVersion: decoded.tokenVersion,
            currentVersion: user.tokenVersion,
          },
        });
        return null;
      }

      Sentry.addBreadcrumb({
        message: 'JWT token verified',
        category: 'auth',
        level: 'info',
        data: { userId: decoded.userId },
      });

      return decoded;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      Sentry.addBreadcrumb({
        message: 'JWT verification failed',
        category: 'auth',
        level: 'warning',
        data: { error: errorMessage },
      });

      // Don't capture expired tokens as exceptions - they're expected
      if (error instanceof jwt.TokenExpiredError) {
        return null;
      }

      // Capture unexpected JWT errors
      if (!(error instanceof jwt.JsonWebTokenError)) {
        Sentry.captureException(error, {
          tags: { operation: 'AuthService.verifyToken' },
        });
      }

      return null;
    }
  }

  /**
   * Retrieves a user by their ID.
   * @param userId - The user's unique identifier
   * @returns The user or null if not found
   */
  async getUserById(userId: string): Promise<User | null> {
    Sentry.addBreadcrumb({
      message: 'Fetching user by ID',
      category: 'auth',
      level: 'info',
      data: { userId },
    });

    return this.userRepository.findById(userId);
  }

  /**
   * Finds or creates a user from OAuth data.
   * @param googleId - Google OAuth identifier
   * @param email - User's email address
   * @param displayName - User's display name
   * @returns The existing or newly created user with isNew flag
   */
  async findOrCreateUser(
    googleId: string,
    email: string,
    displayName: string
  ): Promise<FindOrCreateResult> {
    Sentry.addBreadcrumb({
      message: 'Finding or creating user',
      category: 'auth',
      level: 'info',
      data: { googleId, email },
    });

    return this.userRepository.findOrCreate({
      googleId,
      email,
      displayName,
    });
  }

  /**
   * Invalidates all existing tokens for a user by incrementing tokenVersion.
   * Used for "logout from all devices" functionality.
   * @param userId - The user's unique identifier
   * @returns The updated user with new tokenVersion
   */
  async invalidateAllTokens(userId: string): Promise<User> {
    Sentry.addBreadcrumb({
      message: 'Invalidating all user tokens',
      category: 'auth',
      level: 'info',
      data: { userId },
    });

    return this.userRepository.incrementTokenVersion(userId);
  }
}
