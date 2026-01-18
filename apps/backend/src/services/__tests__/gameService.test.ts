import { Chess } from 'chess.js';
import { GameService } from '../gameService';
import { GameRepository, Game, GameStatus } from '../../repositories/GameRepository';
import { STARTING_FEN, TIME_CONTROL_CONFIGS } from '@chess-website/shared';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  addBreadcrumb: jest.fn(),
}));

// Mock chess.js for controlled testing
jest.mock('chess.js');

describe('GameService', () => {
  let gameService: GameService;
  let mockGameRepository: jest.Mocked<GameRepository>;

  const mockUserId = 'user-123';
  const mockGameId = 'game-456';

  const createMockGame = (overrides: Partial<Game> = {}): Game => ({
    id: mockGameId,
    userId: mockUserId,
    status: GameStatus.ACTIVE,
    difficultyLevel: 3,
    timeControlType: 'blitz_5min',
    currentFen: STARTING_FEN,
    movesHistory: [],
    timeLeftUser: 300000,
    timeLeftEngine: 300000,
    result: null,
    createdAt: new Date('2026-01-18T10:00:00Z'),
    updatedAt: new Date('2026-01-18T10:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    // Create mock repository
    mockGameRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      update: jest.fn(),
      addMove: jest.fn(),
      finishGame: jest.fn(),
      countByStatus: jest.fn(),
    } as unknown as jest.Mocked<GameRepository>;

    gameService = new GameService(mockGameRepository);

    // Mock Chess constructor
    (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
      () =>
        ({
          turn: jest.fn().mockReturnValue('w'),
          isCheck: jest.fn().mockReturnValue(false),
          isGameOver: jest.fn().mockReturnValue(false),
          isCheckmate: jest.fn().mockReturnValue(false),
          isStalemate: jest.fn().mockReturnValue(false),
          isThreefoldRepetition: jest.fn().mockReturnValue(false),
          isDraw: jest.fn().mockReturnValue(false),
          isInsufficientMaterial: jest.fn().mockReturnValue(false),
          move: jest.fn(),
        }) as unknown as Chess
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGame', () => {
    it('should create a game with correct time control config', async () => {
      const mockGame = createMockGame();
      mockGameRepository.create.mockResolvedValue(mockGame);

      const result = await gameService.createGame(mockUserId, {
        difficultyLevel: 3,
        timeControlType: 'blitz_5min',
      });

      expect(mockGameRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        difficultyLevel: 3,
        timeControlType: 'blitz_5min',
        currentFen: STARTING_FEN,
        timeLeftUser: TIME_CONTROL_CONFIGS['blitz_5min'].initialTime,
        timeLeftEngine: TIME_CONTROL_CONFIGS['blitz_5min'].initialTime,
      });

      expect(result).toMatchObject({
        id: mockGameId,
        userId: mockUserId,
        status: 'active',
        difficultyLevel: 3,
        timeControlType: 'blitz_5min',
        currentFen: STARTING_FEN,
      });
    });

    it('should create a game with no time control', async () => {
      const mockGame = createMockGame({
        timeControlType: 'none',
        timeLeftUser: 0,
        timeLeftEngine: 0,
      });
      mockGameRepository.create.mockResolvedValue(mockGame);

      await gameService.createGame(mockUserId, {
        difficultyLevel: 1,
        timeControlType: 'none',
      });

      expect(mockGameRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeControlType: 'none',
          timeLeftUser: TIME_CONTROL_CONFIGS['none'].initialTime,
          timeLeftEngine: TIME_CONTROL_CONFIGS['none'].initialTime,
        })
      );
    });

    it('should create a game with bullet time control', async () => {
      const mockGame = createMockGame({
        timeControlType: 'bullet_1min',
        timeLeftUser: 60000,
        timeLeftEngine: 60000,
      });
      mockGameRepository.create.mockResolvedValue(mockGame);

      await gameService.createGame(mockUserId, {
        difficultyLevel: 5,
        timeControlType: 'bullet_1min',
      });

      expect(mockGameRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeControlType: 'bullet_1min',
          timeLeftUser: 60000,
          timeLeftEngine: 60000,
        })
      );
    });
  });

  describe('getGame', () => {
    it('should return game when found and owned by user', async () => {
      const mockGame = createMockGame();
      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

      const result = await gameService.getGame(mockGameId, mockUserId);

      expect(mockGameRepository.findByIdAndUserId).toHaveBeenCalledWith(mockGameId, mockUserId);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockGameId);
    });

    it('should return null when game not found', async () => {
      mockGameRepository.findByIdAndUserId.mockResolvedValue(null);

      const result = await gameService.getGame('non-existent', mockUserId);

      expect(result).toBeNull();
    });

    it('should return null when game owned by different user', async () => {
      mockGameRepository.findByIdAndUserId.mockResolvedValue(null);

      const result = await gameService.getGame(mockGameId, 'different-user');

      expect(mockGameRepository.findByIdAndUserId).toHaveBeenCalledWith(
        mockGameId,
        'different-user'
      );
      expect(result).toBeNull();
    });
  });

  describe('listGames', () => {
    it('should return list of games for user', async () => {
      const mockGames = [
        createMockGame({ id: 'game-1' }),
        createMockGame({ id: 'game-2', status: GameStatus.FINISHED, result: 'user_win_checkmate' }),
      ];
      mockGameRepository.findByUserId.mockResolvedValue(mockGames);

      const result = await gameService.listGames(mockUserId);

      expect(mockGameRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('game-1');
      expect(result[1].id).toBe('game-2');
    });

    it('should return empty array when user has no games', async () => {
      mockGameRepository.findByUserId.mockResolvedValue([]);

      const result = await gameService.listGames(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('validateMove', () => {
    it('should return true for valid move', () => {
      const mockChessInstance = {
        move: jest.fn().mockReturnValue({ from: 'e2', to: 'e4' }),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      const result = gameService.validateMove(STARTING_FEN, { from: 'e2', to: 'e4' });

      expect(result).toBe(true);
      expect(mockChessInstance.move).toHaveBeenCalledWith({
        from: 'e2',
        to: 'e4',
        promotion: undefined,
      });
    });

    it('should return false for invalid move', () => {
      const mockChessInstance = {
        move: jest.fn().mockReturnValue(null),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      const result = gameService.validateMove(STARTING_FEN, { from: 'e2', to: 'e5' });

      expect(result).toBe(false);
    });

    it('should return false when move throws exception', () => {
      const mockChessInstance = {
        move: jest.fn().mockImplementation(() => {
          throw new Error('Invalid move');
        }),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      const result = gameService.validateMove(STARTING_FEN, { from: 'invalid', to: 'move' });

      expect(result).toBe(false);
    });
  });

  describe('checkGameEnd', () => {
    it('should detect checkmate with engine winning', () => {
      const mockChess = {
        isCheckmate: jest.fn().mockReturnValue(true),
        turn: jest.fn().mockReturnValue('w'), // White's turn = white is checkmated
      } as unknown as Chess;

      const result = gameService.checkGameEnd(mockChess);

      expect(result).toEqual({ isOver: true, result: 'engine_win_checkmate' });
    });

    it('should detect checkmate with user winning', () => {
      const mockChess = {
        isCheckmate: jest.fn().mockReturnValue(true),
        turn: jest.fn().mockReturnValue('b'), // Black's turn = black is checkmated
      } as unknown as Chess;

      const result = gameService.checkGameEnd(mockChess);

      expect(result).toEqual({ isOver: true, result: 'user_win_checkmate' });
    });

    it('should detect stalemate', () => {
      const mockChess = {
        isCheckmate: jest.fn().mockReturnValue(false),
        isStalemate: jest.fn().mockReturnValue(true),
      } as unknown as Chess;

      const result = gameService.checkGameEnd(mockChess);

      expect(result).toEqual({ isOver: true, result: 'draw_stalemate' });
    });

    it('should detect threefold repetition', () => {
      const mockChess = {
        isCheckmate: jest.fn().mockReturnValue(false),
        isStalemate: jest.fn().mockReturnValue(false),
        isThreefoldRepetition: jest.fn().mockReturnValue(true),
      } as unknown as Chess;

      const result = gameService.checkGameEnd(mockChess);

      expect(result).toEqual({ isOver: true, result: 'draw_repetition' });
    });

    it('should detect fifty move rule', () => {
      const mockChess = {
        isCheckmate: jest.fn().mockReturnValue(false),
        isStalemate: jest.fn().mockReturnValue(false),
        isThreefoldRepetition: jest.fn().mockReturnValue(false),
        isDraw: jest.fn().mockReturnValue(true),
      } as unknown as Chess;

      const result = gameService.checkGameEnd(mockChess);

      expect(result).toEqual({ isOver: true, result: 'draw_fifty_moves' });
    });

    it('should detect insufficient material', () => {
      const mockChess = {
        isCheckmate: jest.fn().mockReturnValue(false),
        isStalemate: jest.fn().mockReturnValue(false),
        isThreefoldRepetition: jest.fn().mockReturnValue(false),
        isDraw: jest.fn().mockReturnValue(false),
        isInsufficientMaterial: jest.fn().mockReturnValue(true),
      } as unknown as Chess;

      const result = gameService.checkGameEnd(mockChess);

      expect(result).toEqual({ isOver: true, result: 'draw_insufficient_material' });
    });

    it('should return not over when game continues', () => {
      const mockChess = {
        isCheckmate: jest.fn().mockReturnValue(false),
        isStalemate: jest.fn().mockReturnValue(false),
        isThreefoldRepetition: jest.fn().mockReturnValue(false),
        isDraw: jest.fn().mockReturnValue(false),
        isInsufficientMaterial: jest.fn().mockReturnValue(false),
      } as unknown as Chess;

      const result = gameService.checkGameEnd(mockChess);

      expect(result).toEqual({ isOver: false });
    });
  });
});
