// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment must be explicitly set - don't rely on auto-detection
  environment: process.env.NODE_ENV,

  // Disable Sentry in development unless DSN is explicitly set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Explicitly set tracesSampleRate - don't rely on defaults
  // Adjust this value in production to control the volume of traces
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay configuration - explicit settings
  // Only capture replays on errors in production
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // Explicit debug setting - only enable in development
  debug: process.env.NODE_ENV === 'development',

  // Integrations must be explicitly configured
  integrations: [
    // Session Replay for error debugging
    Sentry.replayIntegration({
      // Explicit masking settings for PII protection
      maskAllText: false,
      maskAllInputs: true, // Protect user input
      blockAllMedia: false,
    }),
    // Browser tracing for performance monitoring
    Sentry.browserTracingIntegration({
      // Explicit configuration - don't rely on defaults
      enableInp: true,
    }),
  ],

  // Explicitly configure what errors to ignore
  ignoreErrors: [
    // Browser extension errors
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Network errors that are not actionable
    'Failed to fetch',
    'Load failed',
    'NetworkError',
  ],
});
