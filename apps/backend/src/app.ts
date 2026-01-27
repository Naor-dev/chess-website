// IMPORTANT: Sentry must be imported first
import './instrument';

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';

import { config } from './config/unifiedConfig';
import { errorBoundary } from './middleware/errorBoundary';
import { requestLogger } from './middleware/requestLogger';
import routes from './routes';
import passport from './config/passport';

const app: Application = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", '*.ingest.sentry.io'],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: config.server.nodeEnv === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
  })
);
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Request parsing (10kb limit - chess moves are ~200 bytes, this blocks large payload attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(compression());

// Passport initialization (for OAuth)
app.use(passport.initialize());

// Logging
app.use(requestLogger);

// API Routes
app.use('/api', routes);

// Sentry error handler (must be before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Custom error handling (must be last)
app.use(errorBoundary);

export default app;
