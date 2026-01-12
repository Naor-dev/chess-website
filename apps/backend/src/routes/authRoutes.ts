import { Router } from 'express';
import passport from '../config/passport';
import { AuthController } from '../controllers/AuthController';
import { services } from '../services/serviceContainer';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiter';
import { config } from '../config/unifiedConfig';

const router: Router = Router();

// Initialize controller with singleton service
const controller = new AuthController(services.authService);

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow.
 * Redirects user to Google consent screen.
 *
 * Scopes requested:
 * - profile: Used for displayName
 * - email: Used for email address and account linking
 */
router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback.
 * On success: generates JWT, sets cookie, redirects to frontend.
 * On failure: redirects to frontend with error.
 */
router.get(
  '/google/callback',
  authLimiter,
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.cors.origin}/auth/error?error=auth_failed`,
  }),
  (req, res) => controller.googleCallback(req, res)
);

/**
 * GET /api/auth/me
 * Returns the currently authenticated user.
 * Requires valid JWT token.
 */
router.get('/me', authMiddleware, (req, res) => controller.getCurrentUser(req, res));

/**
 * POST /api/auth/logout
 * Logs out the user by clearing the auth cookie.
 * Uses optional auth to capture user info for audit trail.
 */
router.post('/logout', optionalAuthMiddleware, (req, res) => controller.logout(req, res));

export default router;
