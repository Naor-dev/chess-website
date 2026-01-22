import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  /* config options here */
};

// Wrap Next.js config with Sentry
// Sentry options are explicitly configured (not relying on defaults)
export default withSentryConfig(nextConfig, {
  // Sentry organization and project (for source maps)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs in production builds
  silent: process.env.NODE_ENV !== 'production',

  // Upload source maps but don't expose them publicly
  widenClientFileUpload: true,

  // Source maps configuration
  sourcemaps: {
    deleteSourcemapsAfterUpload: true, // Don't expose source maps in production
  },

  // Disable telemetry for privacy
  telemetry: false,

  // Tunnel route for avoiding ad blockers (optional, disabled by default)
  // tunnelRoute: '/monitoring',
});
