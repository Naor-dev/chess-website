import * as Sentry from '@sentry/nextjs';

/**
 * Next.js instrumentation hook for Sentry initialization.
 * This is called when the Next.js server starts up.
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Capture request errors automatically.
 * This provides server-side error tracking for API routes and server components.
 */
export const onRequestError = Sentry.captureRequestError;
