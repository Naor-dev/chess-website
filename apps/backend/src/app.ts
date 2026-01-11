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

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Logging
app.use(requestLogger);

// API Routes
app.use('/api', routes);

// Sentry error handler (must be before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Custom error handling (must be last)
app.use(errorBoundary);

export default app;
