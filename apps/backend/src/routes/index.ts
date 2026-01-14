import { Router } from 'express';
import healthRoutes from './healthRoutes';
import gameRoutes from './gameRoutes';
import authRoutes from './authRoutes';

const router: Router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/games', gameRoutes);

export default router;
