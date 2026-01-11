import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { config } from '../config/unifiedConfig';
import { prisma } from '../database/prisma';

export class HealthController extends BaseController {
  async check(_req: Request, res: Response): Promise<void> {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

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
