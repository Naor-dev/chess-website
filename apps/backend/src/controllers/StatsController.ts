import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { services } from '../services/serviceContainer';

export class StatsController extends BaseController {
  private statsService = services.statsService;

  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        this.handleUnauthorized(res, 'Not authenticated');
        return;
      }

      this.addBreadcrumb('Fetching user statistics', 'stats', { userId });

      const stats = await this.statsService.getUserStats(userId);

      res.setHeader('Cache-Control', 'private, max-age=60');
      this.handleSuccess(res, stats);
    } catch (error) {
      this.handleError(error, res, 'StatsController.getUserStats');
    }
  }
}
