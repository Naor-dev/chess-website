import request from 'supertest';

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
const mockGetUserStats = jest.fn();

jest.mock('../../services/serviceContainer', () => ({
  services: {
    authService: {
      verifyToken: mockVerifyToken,
    },
    statsService: {
      getUserStats: mockGetUserStats,
    },
    gameService: {},
    userService: {},
  },
}));

// Import app after mocks are set up
import app from '../../app';

describe('StatsController API', () => {
  const mockUserId = 'user-123';
  const mockUserEmail = 'test@example.com';
  const validToken = 'valid-test-token';

  const mockStatsResponse = {
    totalGames: 10,
    activeGames: 2,
    finishedGames: 8,
    wins: 5,
    losses: 2,
    draws: 1,
    winRate: 62.5,
    avgMovesPerGame: 25,
    currentStreak: { type: 'win' as const, count: 3 },
    byDifficulty: [
      { level: 1, total: 4, wins: 3, losses: 1, draws: 0 },
      { level: 3, total: 4, wins: 2, losses: 1, draws: 1 },
    ],
    byTimeControl: [
      { type: 'blitz_5min', total: 6, wins: 4 },
      { type: 'rapid_10min', total: 2, wins: 1 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyToken.mockResolvedValue({ userId: mockUserId, email: mockUserEmail });
  });

  describe('GET /api/users/stats', () => {
    it('should return user stats when authenticated', async () => {
      mockGetUserStats.mockResolvedValue(mockStatsResponse);

      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatsResponse);
      expect(mockGetUserStats).toHaveBeenCalledWith(mockUserId);
    });

    it('should set Cache-Control header', async () => {
      mockGetUserStats.mockResolvedValue(mockStatsResponse);

      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers['cache-control']).toBe('private, max-age=60');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/users/stats');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(mockGetUserStats).not.toHaveBeenCalled();
    });

    it('should return 401 with invalid token', async () => {
      mockVerifyToken.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(mockGetUserStats).not.toHaveBeenCalled();
    });

    it('should return stats for user with no games (zeros)', async () => {
      const emptyStats = {
        totalGames: 0,
        activeGames: 0,
        finishedGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        avgMovesPerGame: 0,
        currentStreak: { type: 'none' as const, count: 0 },
        byDifficulty: [],
        byTimeControl: [],
      };
      mockGetUserStats.mockResolvedValue(emptyStats);

      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.totalGames).toBe(0);
      expect(response.body.data.byDifficulty).toEqual([]);
    });

    it('should return 500 when service throws', async () => {
      mockGetUserStats.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should only return stats for the authenticated user', async () => {
      mockGetUserStats.mockResolvedValue(mockStatsResponse);

      await request(app).get('/api/users/stats').set('Authorization', `Bearer ${validToken}`);

      // Verify it uses req.userId, not any URL parameter
      expect(mockGetUserStats).toHaveBeenCalledWith(mockUserId);
      expect(mockGetUserStats).toHaveBeenCalledTimes(1);
    });
  });
});
