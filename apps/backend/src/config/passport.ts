import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import * as Sentry from '@sentry/node';
import { config } from './unifiedConfig';
import { services } from '../services/serviceContainer';

/**
 * Configure Passport with Google OAuth 2.0 strategy.
 * Uses JWT for authentication (not sessions), so serialization is minimal.
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: config.auth.google.clientId,
      clientSecret: config.auth.google.clientSecret,
      callbackURL: config.auth.google.callbackUrl,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ): Promise<void> => {
      try {
        Sentry.addBreadcrumb({
          message: 'Google OAuth callback received',
          category: 'auth',
          level: 'info',
          data: { googleId: profile.id, email: profile.emails?.[0]?.value },
        });

        const email = profile.emails?.[0]?.value;
        if (!email) {
          Sentry.captureMessage('Google OAuth: No email in profile', {
            level: 'warning',
            extra: { profileId: profile.id },
          });
          return done(new Error('No email found in Google profile'));
        }

        const result = await services.userRepository.findOrCreate({
          googleId: profile.id,
          email,
          displayName: profile.displayName || email.split('@')[0],
        });

        Sentry.addBreadcrumb({
          message: 'User authenticated via Google OAuth',
          category: 'auth',
          level: 'info',
          data: { userId: result.user.id, isNewUser: result.isNew },
        });

        return done(null, result.user);
      } catch (error) {
        // Check if it's a database error for better user messaging
        const isDatabaseError =
          error instanceof Error &&
          (error.message.includes('database') ||
            error.message.includes('connection') ||
            error.message.includes('Prisma') ||
            error.message.includes('ECONNREFUSED'));

        Sentry.captureException(error, {
          tags: {
            operation: 'GoogleOAuth.verify',
            errorType: isDatabaseError ? 'database' : 'auth',
          },
        });

        const message = isDatabaseError
          ? 'Service temporarily unavailable. Please try again later.'
          : 'OAuth verification failed';

        return done(error instanceof Error ? error : new Error(message));
      }
    }
  )
);

// We use JWT authentication (session: false), so serialization is not used.
// However, Passport requires these methods to be defined even when not used.
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user as Express.User);
});

export default passport;
