import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { config } from '../config/unifiedConfig';

export class HealthController extends BaseController {
  check(_req: Request, res: Response): void {
    this.handleSuccess(res, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.server.nodeEnv,
    });
  }
}
