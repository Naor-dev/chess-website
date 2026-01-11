import { Router } from 'express';
import { GameController } from '../controllers/GameController';
// import { authMiddleware } from '../middleware/authMiddleware';

const router: Router = Router();
const controller = new GameController();

// TODO: Add authMiddleware when implemented
// router.use(authMiddleware);

// POST /api/games - Create new game
router.post('/', (req, res) => controller.createGame(req, res));

// GET /api/games - List user's games
router.get('/', (req, res) => controller.listGames(req, res));

// GET /api/games/:gameId - Get specific game
router.get('/:gameId', (req, res) => controller.getGame(req, res));

// POST /api/games/:gameId/move - Make a move
router.post('/:gameId/move', (req, res) => controller.makeMove(req, res));

// POST /api/games/:gameId/save - Save game state
router.post('/:gameId/save', (req, res) => controller.saveGame(req, res));

// POST /api/games/:gameId/resign - Resign game
router.post('/:gameId/resign', (req, res) => controller.resignGame(req, res));

export default router;
