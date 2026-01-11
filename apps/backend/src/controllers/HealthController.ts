import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { config } from '../config/unifiedConfig';
import { verifyConnection } from '../database/prisma';

/**
 * Controller for health check endpoints.
 * Provides system status including database connectivity.
 */
export class HealthController extends BaseController {
  /**
   * Health check endpoint that verifies system components.
   * Tests database connectivity by accessing schema tables.
   */
  async check(_req: Request, res: Response): Promise<void> {
    try {
      const dbStatus = await verifyConnection();

      if (!dbStatus.connected) {
        this.handleSuccess(
          res,
          {
            status: 'degraded',
            timestamp: new Date().toISOString(),
            environment: config.server.nodeEnv,
            database: 'disconnected',
            error: dbStatus.error,
          },
          undefined,
          503
        );
        return;
      }

      this.handleSuccess(res, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.server.nodeEnv,
        database: 'connected',
      });
    } catch (error) {
      this.handleError(error, res, 'HealthController.check', 503);
    }
  }
}
