import { Router } from 'express';
import { StatsController } from '../controllers/StatsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { generalLimiter } from '../middleware/rateLimiter';

const router: Router = Router();
const controller = new StatsController();

// GET /api/users/stats - Get user statistics
router.get('/stats', generalLimiter, authMiddleware, (req, res) =>
  controller.getUserStats(req, res)
);

export default router;
