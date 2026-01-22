// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

  // Explicit debug setting - only enable in development
  debug: process.env.NODE_ENV === 'development',

  // Server-side integrations
  integrations: [
    // HTTP tracing for API routes
    Sentry.httpIntegration(),
  ],
});
