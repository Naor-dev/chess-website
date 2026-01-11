import { Router } from 'express';
import healthRoutes from './healthRoutes';
import gameRoutes from './gameRoutes';

const router: Router = Router();

router.use('/health', healthRoutes);
router.use('/games', gameRoutes);

// TODO: Add auth routes
// router.use('/auth', authRoutes);

export default router;
