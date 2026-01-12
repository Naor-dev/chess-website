// IMPORTANT: This file must be imported FIRST before any other imports
import * as Sentry from '@sentry/node';
import { config } from './config/unifiedConfig';

Sentry.init({
  dsn: config.sentry.dsn,
  environment: config.sentry.environment,
  enabled: config.sentry.enabled,
  tracesSampleRate: config.server.nodeEnv === 'production' ? 0.1 : 1.0,
  integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
});

export { Sentry };
