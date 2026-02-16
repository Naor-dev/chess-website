import { Router } from 'express';
import { StatsController } from '../controllers/StatsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router: Router = Router();
const controller = new StatsController();

// Protect all stats routes - require authentication
router.use(authMiddleware);

// GET /api/users/stats - Get user statistics
router.get('/stats', (req, res) => controller.getUserStats(req, res));

export default router;
