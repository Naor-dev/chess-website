import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

const router: Router = Router();
const controller = new HealthController();

router.get('/', (req, res) => controller.check(req, res));

export default router;
