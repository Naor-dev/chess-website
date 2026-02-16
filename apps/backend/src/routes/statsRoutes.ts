import { Router } from 'express';
import { StatsController } from '../controllers/StatsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { generalLimiter } from '../middleware/rateLimiter';

const router: Router = Router();
const controller = new StatsController();

// Protect all stats routes - require authentication and rate limiting
router.use(authMiddleware);
router.use(generalLimiter);

// GET /api/users/stats - Get user statistics
router.get('/stats', (req, res) => controller.getUserStats(req, res));

export default router;
