import { Request, Response, CookieOptions } from 'express';
import crypto from 'crypto';
import { User as PrismaUser } from '@prisma/client';
import { BaseController } from './BaseController';
import { AuthService, parseExpiresInToMs } from '../services/authService';
import { config } from '../config/unifiedConfig';
import type { User, AuthResponse } from '@chess-website/shared';

/**
 * Controller for authentication endpoints.
 * Handles Google OAuth callback, user retrieval, and logout.
 */
export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  /**
   * Returns cookie options with proper security configuration.
   * @param maxAge - Cookie max age in milliseconds (0 to expire immediately)
   */
  private getAuthCookieOptions(maxAge?: number): CookieOptions {
    const isProduction = config.server.nodeEnv === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      path: '/',
      maxAge: maxAge ?? parseExpiresInToMs(config.auth.jwtExpiresIn),
    };
  }

  /**
   * Converts Prisma User to shared User type.
   * @param prismaUser - User from Prisma
   * @returns User object for API response
   */
  private toUserResponse(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      googleId: prismaUser.googleId,
      email: prismaUser.email,
      displayName: prismaUser.displayName,
      createdAt: prismaUser.createdAt.toISOString(),
      updatedAt: prismaUser.updatedAt.toISOString(),
    };
  }

  /**
   * Handles Google OAuth callback.
   * Generates JWT token, sets cookie, and redirects to frontend.
   * GET /api/auth/google/callback
   */
  async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      this.addBreadcrumb('Google OAuth callback', 'auth', { hasUser: !!req.user });

      const user = req.user as PrismaUser;
      if (!user) {
        this.handleUnauthorized(res, 'Authentication failed');
        return;
      }

      const token = this.authService.generateToken(user);

      // Set HTTP-only cookie with proper security
      res.cookie('token', token, this.getAuthCookieOptions());

      // Redirect to frontend
      const redirectUrl = `${config.cors.origin}/auth/callback`;
      res.redirect(redirectUrl);
    } catch (error) {
      this.handleError(error, res, 'AuthController.googleCallback');
    }
  }

  /**
   * Returns the currently authenticated user.
   * GET /api/auth/me
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      this.addBreadcrumb('Get current user', 'auth', { userId: req.userId });

      const userId = req.userId;
      if (!userId) {
        this.handleUnauthorized(res, 'Not authenticated');
        return;
      }

      const user = await this.authService.getUserById(userId);
      if (!user) {
        this.handleNotFound(res, 'User');
        return;
      }

      const response: AuthResponse = {
        success: true,
        user: this.toUserResponse(user),
      };

      this.handleSuccess(res, response);
    } catch (error) {
      this.handleError(error, res, 'AuthController.getCurrentUser');
    }
  }

  /**
   * Logs out the user by clearing the auth cookie.
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // Capture user info before clearing (for audit trail)
      this.addBreadcrumb('User logout', 'auth', {
        userId: req.userId,
        userEmail: req.userEmail,
        wasAuthenticated: !!req.userId,
      });

      // Clear the auth cookie
      res.cookie('token', '', this.getAuthCookieOptions(0));

      this.handleSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      this.handleError(error, res, 'AuthController.logout');
    }
  }

  /**
   * Logs out from all devices by invalidating all tokens.
   * Increments tokenVersion, making all existing tokens invalid.
   * POST /api/auth/logout-all
   */
  async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        this.handleUnauthorized(res, 'Not authenticated');
        return;
      }

      this.addBreadcrumb('User logout from all devices', 'auth', {
        userId,
        userEmail: req.userEmail,
      });

      // Invalidate all existing tokens by incrementing tokenVersion
      await this.authService.invalidateAllTokens(userId);

      // Clear the current cookie as well
      res.cookie('token', '', this.getAuthCookieOptions(0));

      this.handleSuccess(res, { message: 'Logged out from all devices successfully' });
    } catch (error) {
      this.handleError(error, res, 'AuthController.logoutAll');
    }
  }

  /**
   * Verifies the BFF exchange secret using constant-time comparison.
   * @param providedSecret - The secret from the request header
   * @returns true if the secret is valid
   */
  private verifyBffSecret(providedSecret: string | undefined): boolean {
    if (!providedSecret) {
      return false;
    }

    const expectedSecret = config.auth.bffExchangeSecret;

    // Use constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedSecret, 'utf8'),
        Buffer.from(expectedSecret, 'utf8')
      );
    } catch {
      // If buffers have different lengths, timingSafeEqual throws
      return false;
    }
  }

  /**
   * BFF endpoint: exchanges verified Google user info for a JWT.
   * Called by the frontend server (Next.js) after it verifies the OAuth code with Google.
   * Requires X-BFF-Secret header for authentication.
   * POST /api/auth/exchange
   */
  async exchange(req: Request, res: Response): Promise<void> {
    try {
      // Verify BFF secret - prevents direct access from browsers/attackers
      const bffSecret = req.headers['x-bff-secret'] as string | undefined;
      if (!this.verifyBffSecret(bffSecret)) {
        this.addBreadcrumb('BFF exchange rejected - invalid secret', 'auth', {
          hasSecret: !!bffSecret,
        });
        this.handleUnauthorized(res, 'Invalid BFF secret');
        return;
      }

      const { googleId, email, displayName } = req.body;

      // Validate required fields
      if (!googleId || typeof googleId !== 'string') {
        this.handleValidationError(res, { googleId: ['Google ID is required'] });
        return;
      }

      if (!email || typeof email !== 'string') {
        this.handleValidationError(res, { email: ['Email is required'] });
        return;
      }

      if (!displayName || typeof displayName !== 'string') {
        this.handleValidationError(res, { displayName: ['Display name is required'] });
        return;
      }

      this.addBreadcrumb('BFF token exchange', 'auth', { googleId, email });

      // Find or create user
      const { user, isNew } = await this.authService.findOrCreateUser(googleId, email, displayName);

      this.addBreadcrumb(`User ${isNew ? 'created' : 'found'} via BFF exchange`, 'auth', {
        userId: user.id,
        isNew,
      });

      // Generate JWT
      const token = this.authService.generateToken(user);

      // Return token and user info (cookie is set by the frontend BFF)
      this.handleSuccess(res, {
        token,
        user: this.toUserResponse(user),
      });
    } catch (error) {
      this.handleError(error, res, 'AuthController.exchange');
    }
  }
}
