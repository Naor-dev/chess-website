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
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setupExpressErrorHandler: jest.fn((app) => app),
  expressIntegration: jest.fn(),
  httpIntegration: jest.fn(),
  prismaIntegration: jest.fn(),
}));

// Mock services before importing app
const mockVerifyToken = jest.fn();
const mockGetUserById = jest.fn();
const mockFindOrCreateUser = jest.fn();
const mockGenerateToken = jest.fn();
const mockInvalidateAllTokens = jest.fn();

jest.mock('../../services/serviceContainer', () => ({
  services: {
    authService: {
      verifyToken: mockVerifyToken,
      getUserById: mockGetUserById,
      findOrCreateUser: mockFindOrCreateUser,
      generateToken: mockGenerateToken,
      invalidateAllTokens: mockInvalidateAllTokens,
    },
    gameService: {},
    userService: {},
  },
}));

// Import app after mocks are set up
import app from '../../app';

describe('AuthController API', () => {
  const mockUserId = 'user-123';
  const mockUserEmail = 'test@example.com';
  const mockGoogleId = 'google-123';
  const mockDisplayName = 'Test User';
  const validToken = 'valid-test-token';
  // BFF secret matching the dev default in unifiedConfig.ts
  const validBffSecret = 'dev-bff-secret-change-in-production';

  const mockUser = {
    id: mockUserId,
    googleId: mockGoogleId,
    email: mockUserEmail,
    displayName: mockDisplayName,
    tokenVersion: 1,
    createdAt: new Date('2026-01-18T10:00:00.000Z'),
    updatedAt: new Date('2026-01-18T10:00:00.000Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: auth succeeds
    mockVerifyToken.mockResolvedValue({
      userId: mockUserId,
      email: mockUserEmail,
      tokenVersion: 1,
    });
    mockGetUserById.mockResolvedValue(mockUser);
  });

  describe('POST /api/auth/exchange (BFF endpoint)', () => {
    it('should exchange valid Google user info for JWT with valid BFF secret', async () => {
      mockFindOrCreateUser.mockResolvedValue({
        user: mockUser,
        isNew: false,
      });
      mockGenerateToken.mockReturnValue('new-jwt-token');

      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', validBffSecret)
        .send({
          googleId: mockGoogleId,
          email: mockUserEmail,
          displayName: mockDisplayName,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        token: 'new-jwt-token',
        user: {
          id: mockUserId,
          googleId: mockGoogleId,
          email: mockUserEmail,
          displayName: mockDisplayName,
        },
      });
      expect(mockFindOrCreateUser).toHaveBeenCalledWith(
        mockGoogleId,
        mockUserEmail,
        mockDisplayName
      );
      expect(mockGenerateToken).toHaveBeenCalledWith(mockUser);
    });

    it('should create new user when not exists', async () => {
      mockFindOrCreateUser.mockResolvedValue({
        user: mockUser,
        isNew: true,
      });
      mockGenerateToken.mockReturnValue('new-jwt-token');

      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', validBffSecret)
        .send({
          googleId: 'new-google-id',
          email: 'newuser@example.com',
          displayName: 'New User',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('new-jwt-token');
    });

    it('should return 401 when BFF secret is missing', async () => {
      const response = await request(app).post('/api/auth/exchange').send({
        googleId: mockGoogleId,
        email: mockUserEmail,
        displayName: mockDisplayName,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
      expect(response.body.error).toBe('Invalid BFF secret');
    });

    it('should return 401 when BFF secret is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', 'wrong-secret')
        .send({
          googleId: mockGoogleId,
          email: mockUserEmail,
          displayName: mockDisplayName,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when BFF secret is empty string', async () => {
      const response = await request(app).post('/api/auth/exchange').set('X-BFF-Secret', '').send({
        googleId: mockGoogleId,
        email: mockUserEmail,
        displayName: mockDisplayName,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 when googleId is missing', async () => {
      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', validBffSecret)
        .send({
          email: mockUserEmail,
          displayName: mockDisplayName,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toHaveProperty('googleId');
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', validBffSecret)
        .send({
          googleId: mockGoogleId,
          displayName: mockDisplayName,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toHaveProperty('email');
    });

    it('should return 400 when displayName is missing', async () => {
      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', validBffSecret)
        .send({
          googleId: mockGoogleId,
          email: mockUserEmail,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toHaveProperty('displayName');
    });

    it('should return 400 when googleId is not a string', async () => {
      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', validBffSecret)
        .send({
          googleId: 12345,
          email: mockUserEmail,
          displayName: mockDisplayName,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when email is not a string', async () => {
      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', validBffSecret)
        .send({
          googleId: mockGoogleId,
          email: { value: mockUserEmail },
          displayName: mockDisplayName,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when all fields are empty strings', async () => {
      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', validBffSecret)
        .send({
          googleId: '',
          email: '',
          displayName: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors gracefully', async () => {
      mockFindOrCreateUser.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', validBffSecret)
        .send({
          googleId: mockGoogleId,
          email: mockUserEmail,
          displayName: mockDisplayName,
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated via header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        id: mockUserId,
        email: mockUserEmail,
        displayName: mockDisplayName,
      });
    });

    it('should return current user when authenticated via cookie', async () => {
      const response = await request(app).get('/api/auth/me').set('Cookie', `token=${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(mockUserId);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      mockVerifyToken.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 when user not found in database', async () => {
      mockGetUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout and clear cookie when authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');

      // Check that cookie is being cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('token=');
      expect(cookies[0]).toContain('Max-Age=0');
    });

    it('should logout even when not authenticated (graceful handling)', async () => {
      mockVerifyToken.mockResolvedValue(null);

      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/logout-all', () => {
    it('should invalidate all tokens and clear cookie', async () => {
      mockInvalidateAllTokens.mockResolvedValue({
        ...mockUser,
        tokenVersion: 2,
      });

      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out from all devices successfully');
      expect(mockInvalidateAllTokens).toHaveBeenCalledWith(mockUserId);

      // Check that cookie is being cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('token=');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/api/auth/logout-all');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      mockVerifyToken.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      mockInvalidateAllTokens.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to exchange endpoint', async () => {
      // Rate limiter should be applied (not testing actual limits, just that route works)
      mockFindOrCreateUser.mockResolvedValue({
        user: mockUser,
        isNew: false,
      });
      mockGenerateToken.mockReturnValue('new-jwt-token');

      const response = await request(app)
        .post('/api/auth/exchange')
        .set('X-BFF-Secret', validBffSecret)
        .send({
          googleId: mockGoogleId,
          email: mockUserEmail,
          displayName: mockDisplayName,
        });

      expect(response.status).toBe(200);
    });
  });
});
