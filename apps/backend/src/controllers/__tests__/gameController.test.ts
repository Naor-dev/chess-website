import request from 'supertest';
import { STARTING_FEN, TIME_CONTROL_CONFIGS } from '@chess-website/shared';

// Mock instrument module before anything else
jest.mock('../../instrument', () => ({
  Sentry: {
    init: jest.fn(),
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
    setUser: jest.fn(),
    setupExpressErrorHandler: jest.fn((app) => app),
  },
}));

// Mock Sentry before importing app
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  setUser: jest.fn(),
  setupExpressErrorHandler: jest.fn((app) => app),
  expressIntegration: jest.fn(),
  httpIntegration: jest.fn(),
  prismaIntegration: jest.fn(),
}));

// Mock services before importing app
const mockVerifyToken = jest.fn();
const mockCreateGame = jest.fn();
const mockGetGame = jest.fn();
const mockListGames = jest.fn();
const mockMakeMove = jest.fn();

jest.mock('../../services/serviceContainer', () => ({
  services: {
    authService: {
      verifyToken: mockVerifyToken,
    },
    gameService: {
      createGame: mockCreateGame,
      getGame: mockGetGame,
      listGames: mockListGames,
      makeMove: mockMakeMove,
    },
    userService: {},
  },
}));

// Import app after mocks are set up
import app from '../../app';

describe('GameController API', () => {
  const mockUserId = 'user-123';
  const mockUserEmail = 'test@example.com';
  const validToken = 'valid-test-token';

  const mockGameResponse = {
    id: 'game-456',
    userId: mockUserId,
    status: 'active' as const,
    difficultyLevel: 3 as const,
    timeControlType: 'blitz_5min' as const,
    currentFen: STARTING_FEN,
    movesHistory: [],
    timeLeftUser: TIME_CONTROL_CONFIGS['blitz_5min'].initialTime,
    timeLeftEngine: TIME_CONTROL_CONFIGS['blitz_5min'].initialTime,
    result: null,
    currentTurn: 'w' as const,
    isCheck: false,
    isGameOver: false,
    createdAt: '2026-01-18T10:00:00.000Z',
    updatedAt: '2026-01-18T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: auth succeeds
    mockVerifyToken.mockResolvedValue({ userId: mockUserId, email: mockUserEmail });
  });

  describe('POST /api/games', () => {
    it('should create a new game with valid input', async () => {
      mockCreateGame.mockResolvedValue(mockGameResponse);

      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          difficultyLevel: 3,
          timeControlType: 'blitz_5min',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 'game-456',
        status: 'active',
        difficultyLevel: 3,
        timeControlType: 'blitz_5min',
      });
      expect(mockCreateGame).toHaveBeenCalledWith(mockUserId, {
        difficultyLevel: 3,
        timeControlType: 'blitz_5min',
      });
    });

    it('should create a game with minimum difficulty', async () => {
      const gameWithMinDifficulty = { ...mockGameResponse, difficultyLevel: 1 };
      mockCreateGame.mockResolvedValue(gameWithMinDifficulty);

      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          difficultyLevel: 1,
          timeControlType: 'none',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.difficultyLevel).toBe(1);
    });

    it('should create a game with maximum difficulty', async () => {
      const gameWithMaxDifficulty = { ...mockGameResponse, difficultyLevel: 5 };
      mockCreateGame.mockResolvedValue(gameWithMaxDifficulty);

      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          difficultyLevel: 5,
          timeControlType: 'classical_30min',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.difficultyLevel).toBe(5);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/api/games').send({
        difficultyLevel: 3,
        timeControlType: 'blitz_5min',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      mockVerifyToken.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/games')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          difficultyLevel: 3,
          timeControlType: 'blitz_5min',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid difficulty level (too low)', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          difficultyLevel: 0,
          timeControlType: 'blitz_5min',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid difficulty level (too high)', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          difficultyLevel: 6,
          timeControlType: 'blitz_5min',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid time control type', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          difficultyLevel: 3,
          timeControlType: 'invalid_time_control',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when missing difficultyLevel', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          timeControlType: 'blitz_5min',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when missing timeControlType', async () => {
      const response = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          difficultyLevel: 3,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/games', () => {
    it('should return list of games for authenticated user', async () => {
      const mockGameList = [
        {
          id: 'game-1',
          status: 'active',
          difficultyLevel: 2,
          timeControlType: 'blitz_3min',
          result: null,
          currentTurn: 'w',
          createdAt: '2026-01-18T10:00:00.000Z',
          updatedAt: '2026-01-18T10:00:00.000Z',
        },
        {
          id: 'game-2',
          status: 'finished',
          difficultyLevel: 4,
          timeControlType: 'rapid_10min',
          result: 'user_win_checkmate',
          currentTurn: 'b',
          createdAt: '2026-01-17T10:00:00.000Z',
          updatedAt: '2026-01-17T12:00:00.000Z',
        },
      ];
      mockListGames.mockResolvedValue(mockGameList);

      const response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.games).toHaveLength(2);
      expect(response.body.data.games[0].id).toBe('game-1');
      expect(mockListGames).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array when user has no games', async () => {
      mockListGames.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/games')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.games).toEqual([]);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/games');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/games/:gameId', () => {
    it('should return game details for valid game owned by user', async () => {
      mockGetGame.mockResolvedValue(mockGameResponse);

      const response = await request(app)
        .get('/api/games/game-456')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 'game-456',
        status: 'active',
        currentFen: STARTING_FEN,
      });
      expect(mockGetGame).toHaveBeenCalledWith('game-456', mockUserId);
    });

    it('should return 404 when game not found', async () => {
      mockGetGame.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/games/non-existent-game')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return 404 when game owned by different user', async () => {
      mockGetGame.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/games/other-users-game')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/games/game-456');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication via cookie', () => {
    it('should accept authentication via cookie', async () => {
      mockCreateGame.mockResolvedValue(mockGameResponse);

      const response = await request(app)
        .post('/api/games')
        .set('Cookie', `token=${validToken}`)
        .send({
          difficultyLevel: 3,
          timeControlType: 'blitz_5min',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/games/:gameId/move', () => {
    const newFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

    const mockMoveResponse = {
      success: true,
      game: {
        ...mockGameResponse,
        currentFen: newFen,
        movesHistory: ['e4'],
        currentTurn: 'b' as const,
      },
    };

    it('should make a valid move', async () => {
      mockMakeMove.mockResolvedValue(mockMoveResponse);

      const response = await request(app)
        .post('/api/games/game-456/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          from: 'e2',
          to: 'e4',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.game.currentFen).toBe(newFen);
      expect(mockMakeMove).toHaveBeenCalledWith('game-456', mockUserId, {
        from: 'e2',
        to: 'e4',
      });
    });

    it('should make a promotion move', async () => {
      const promotionResponse = {
        success: true,
        game: {
          ...mockGameResponse,
          currentFen: 'Qnbqkbnr/1ppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR b KQkq - 0 1',
          movesHistory: ['a8=Q'],
        },
      };
      mockMakeMove.mockResolvedValue(promotionResponse);

      const response = await request(app)
        .post('/api/games/game-456/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          from: 'a7',
          to: 'a8',
          promotion: 'q',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockMakeMove).toHaveBeenCalledWith('game-456', mockUserId, {
        from: 'a7',
        to: 'a8',
        promotion: 'q',
      });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/api/games/game-456/move').send({
        from: 'e2',
        to: 'e4',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 when game not found', async () => {
      mockMakeMove.mockRejectedValue(new Error('Game not found'));

      const response = await request(app)
        .post('/api/games/non-existent/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          from: 'e2',
          to: 'e4',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when game is not active', async () => {
      mockMakeMove.mockRejectedValue(new Error('Game is not active'));

      const response = await request(app)
        .post('/api/games/game-456/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          from: 'e2',
          to: 'e4',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Game is not active');
    });

    it('should return 400 when not user turn', async () => {
      mockMakeMove.mockRejectedValue(new Error('Not your turn'));

      const response = await request(app)
        .post('/api/games/game-456/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          from: 'e7',
          to: 'e5',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not your turn');
    });

    it('should return 400 for invalid move', async () => {
      mockMakeMove.mockRejectedValue(new Error('Invalid move'));

      const response = await request(app)
        .post('/api/games/game-456/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          from: 'e2',
          to: 'e5',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid move');
    });

    it('should return 400 for invalid square format (from)', async () => {
      const response = await request(app)
        .post('/api/games/game-456/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          from: 'e9', // Invalid rank
          to: 'e4',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid square format (to)', async () => {
      const response = await request(app)
        .post('/api/games/game-456/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          from: 'e2',
          to: 'z4', // Invalid file
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid promotion piece', async () => {
      const response = await request(app)
        .post('/api/games/game-456/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          from: 'a7',
          to: 'a8',
          promotion: 'k', // Invalid - can't promote to king
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when missing from square', async () => {
      const response = await request(app)
        .post('/api/games/game-456/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          to: 'e4',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when missing to square', async () => {
      const response = await request(app)
        .post('/api/games/game-456/move')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          from: 'e2',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
