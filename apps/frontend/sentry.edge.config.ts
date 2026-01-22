// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment must be explicitly set - don't rely on auto-detection
  environment: process.env.NODE_ENV,

  // Disable Sentry in development unless DSN is explicitly set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Explicitly set tracesSampleRate - don't rely on defaults
  // Lower rate for edge since it handles many requests
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Explicit debug setting - only enable in development
  debug: process.env.NODE_ENV === 'development',
});
