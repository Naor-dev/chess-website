import { Chess } from 'chess.js';
import { GameService } from '../gameService';
import { GameRepository, Game, GameStatus } from '../../repositories/GameRepository';
import { STARTING_FEN, TIME_CONTROL_CONFIGS } from '@chess-website/shared';
import type { EngineService } from '../engineService';
import {
  GameNotFoundError,
  GameNotActiveError,
  NotYourTurnError,
  InvalidMoveError,
  CannotSaveFinishedGameError,
  CannotResignFinishedGameError,
  ConcurrentModificationError,
} from '../../errors';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
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
    turnStartedAt: null, // null by default to skip timeout checks in most tests
    result: null,
    version: 1, // Optimistic locking version
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
      // Version-aware methods for optimistic locking - default to success
      updateWithVersion: jest.fn().mockImplementation(async (_gameId, version, data) => ({
        success: true,
        game: createMockGame({ version: version + 1, ...data }),
      })),
      addMoveWithVersion: jest.fn().mockImplementation(async (_gameId, version, move, newFen) => ({
        success: true,
        game: createMockGame({
          version: version + 1,
          currentFen: newFen,
          movesHistory: [move],
        }),
      })),
      finishGameWithVersion: jest.fn().mockImplementation(async (_gameId, version, result) => ({
        success: true,
        game: createMockGame({
          version: version + 1,
          status: GameStatus.FINISHED,
          result,
        }),
      })),
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
          isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
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
        turnStartedAt: expect.any(Date), // Clock starts immediately for timed games
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
        isInsufficientMaterial: jest.fn().mockReturnValue(false),
        isDrawByFiftyMoves: jest.fn().mockReturnValue(true),
      } as unknown as Chess;

      const result = gameService.checkGameEnd(mockChess);

      expect(result).toEqual({ isOver: true, result: 'draw_fifty_moves' });
    });

    it('should detect insufficient material', () => {
      const mockChess = {
        isCheckmate: jest.fn().mockReturnValue(false),
        isStalemate: jest.fn().mockReturnValue(false),
        isThreefoldRepetition: jest.fn().mockReturnValue(false),
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
        isInsufficientMaterial: jest.fn().mockReturnValue(false),
        isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
      } as unknown as Chess;

      const result = gameService.checkGameEnd(mockChess);

      expect(result).toEqual({ isOver: false });
    });
  });

  describe('saveGame', () => {
    it('should save game and return timestamp', async () => {
      const mockGame = createMockGame();

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

      const result = await gameService.saveGame(mockGameId, mockUserId);

      expect(mockGameRepository.findByIdAndUserId).toHaveBeenCalledWith(mockGameId, mockUserId);
      expect(mockGameRepository.updateWithVersion).toHaveBeenCalledWith(mockGameId, 1, {});
      expect(result.savedAt).toBeDefined();
      expect(typeof result.savedAt).toBe('string');
      // Verify it's a valid ISO date
      expect(() => new Date(result.savedAt)).not.toThrow();
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(gameService.saveGame(mockGameId, mockUserId)).rejects.toThrow(GameNotFoundError);
    });

    it('should throw error when game is not active (finished)', async () => {
      const finishedGame = createMockGame({
        status: GameStatus.FINISHED,
        result: 'user_win_checkmate',
      });
      mockGameRepository.findByIdAndUserId.mockResolvedValue(finishedGame);

      await expect(gameService.saveGame(mockGameId, mockUserId)).rejects.toThrow(
        CannotSaveFinishedGameError
      );
    });

    it('should throw error when game owned by different user', async () => {
      mockGameRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(gameService.saveGame(mockGameId, 'different-user')).rejects.toThrow(
        GameNotFoundError
      );

      expect(mockGameRepository.findByIdAndUserId).toHaveBeenCalledWith(
        mockGameId,
        'different-user'
      );
    });

    it('should sync time on save when it is user turn', async () => {
      // Setup: User's turn with 5 minutes left, 30 seconds elapsed
      const turnStarted = new Date(Date.now() - 30000); // 30 seconds ago
      const mockGame = createMockGame({
        timeControlType: 'blitz_5min',
        timeLeftUser: 300000, // 5 minutes
        timeLeftEngine: 300000,
        turnStartedAt: turnStarted,
      });

      // Mock Chess to return white's turn (user)
      const mockChessInstance = {
        turn: jest.fn().mockReturnValue('w'),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

      await gameService.saveGame(mockGameId, mockUserId);

      // Should deduct elapsed time from user and reset turnStartedAt
      expect(mockGameRepository.updateWithVersion).toHaveBeenCalledWith(
        mockGameId,
        1, // version
        expect.objectContaining({
          timeLeftUser: expect.any(Number),
          turnStartedAt: expect.any(Date),
        })
      );

      // Verify the time was deducted (approximately 30 seconds)
      const updateCall = mockGameRepository.updateWithVersion.mock.calls[0];
      const timeLeftUser = updateCall[2].timeLeftUser;
      // Should be around 270000 (300000 - 30000), allow some tolerance for test execution time
      expect(timeLeftUser).toBeLessThan(300000);
      expect(timeLeftUser).toBeGreaterThan(260000);
    });

    it('should sync time on save when it is engine turn', async () => {
      // Setup: Engine's turn with 5 minutes left, 10 seconds elapsed
      const turnStarted = new Date(Date.now() - 10000); // 10 seconds ago
      const mockGame = createMockGame({
        timeControlType: 'blitz_5min',
        timeLeftUser: 300000,
        timeLeftEngine: 300000, // 5 minutes
        turnStartedAt: turnStarted,
      });

      // Mock Chess to return black's turn (engine)
      const mockChessInstance = {
        turn: jest.fn().mockReturnValue('b'),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

      await gameService.saveGame(mockGameId, mockUserId);

      // Should deduct elapsed time from engine and reset turnStartedAt
      expect(mockGameRepository.updateWithVersion).toHaveBeenCalledWith(
        mockGameId,
        1, // version
        expect.objectContaining({
          timeLeftEngine: expect.any(Number),
          turnStartedAt: expect.any(Date),
        })
      );

      // Verify the time was deducted (approximately 10 seconds)
      const updateCall = mockGameRepository.updateWithVersion.mock.calls[0];
      const timeLeftEngine = updateCall[2].timeLeftEngine;
      // Should be around 290000 (300000 - 10000), allow some tolerance
      expect(timeLeftEngine).toBeLessThan(300000);
      expect(timeLeftEngine).toBeGreaterThan(280000);
    });

    it('should not sync time for games without time control', async () => {
      const mockGame = createMockGame({
        timeControlType: 'none',
        timeLeftUser: 0,
        timeLeftEngine: 0,
        turnStartedAt: null,
      });

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

      await gameService.saveGame(mockGameId, mockUserId);

      // Should just touch updatedAt without syncing time
      expect(mockGameRepository.updateWithVersion).toHaveBeenCalledWith(mockGameId, 1, {});
    });

    it('should not sync time when turnStartedAt is null', async () => {
      const mockGame = createMockGame({
        timeControlType: 'blitz_5min',
        timeLeftUser: 300000,
        timeLeftEngine: 300000,
        turnStartedAt: null, // No active turn
      });

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

      await gameService.saveGame(mockGameId, mockUserId);

      // Should just touch updatedAt without syncing time
      expect(mockGameRepository.updateWithVersion).toHaveBeenCalledWith(mockGameId, 1, {});
    });

    it('should not reduce time below zero', async () => {
      // Setup: User's turn with only 5 seconds left, but 10 seconds elapsed
      const turnStarted = new Date(Date.now() - 10000); // 10 seconds ago
      const mockGame = createMockGame({
        timeControlType: 'blitz_5min',
        timeLeftUser: 5000, // Only 5 seconds left
        timeLeftEngine: 300000,
        turnStartedAt: turnStarted,
      });

      // Mock Chess to return white's turn (user)
      const mockChessInstance = {
        turn: jest.fn().mockReturnValue('w'),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

      await gameService.saveGame(mockGameId, mockUserId);

      // Time should be clamped to 0, not negative
      const updateCall = mockGameRepository.updateWithVersion.mock.calls[0];
      const timeLeftUser = updateCall[2].timeLeftUser;
      expect(timeLeftUser).toBe(0);
    });
  });

  describe('resignGame', () => {
    it('should resign an active game successfully', async () => {
      const mockGame = createMockGame();
      const resignedGame = createMockGame({
        status: GameStatus.FINISHED,
        result: 'user_resigned',
      });

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
      mockGameRepository.finishGame.mockResolvedValue(resignedGame);
      mockGameRepository.update.mockResolvedValue(resignedGame);

      const result = await gameService.resignGame(mockGameId, mockUserId);

      expect(mockGameRepository.findByIdAndUserId).toHaveBeenCalledWith(mockGameId, mockUserId);
      expect(mockGameRepository.finishGame).toHaveBeenCalledWith(mockGameId, 'user_resigned');
      expect(mockGameRepository.update).toHaveBeenCalledWith(mockGameId, { turnStartedAt: null });
      expect(result.status).toBe('finished');
      expect(result.result).toBe('user_resigned');
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(gameService.resignGame(mockGameId, mockUserId)).rejects.toThrow(
        GameNotFoundError
      );
    });

    it('should throw error when game owned by different user', async () => {
      mockGameRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(gameService.resignGame(mockGameId, 'different-user')).rejects.toThrow(
        GameNotFoundError
      );

      expect(mockGameRepository.findByIdAndUserId).toHaveBeenCalledWith(
        mockGameId,
        'different-user'
      );
    });

    it('should throw error when game is already finished', async () => {
      const finishedGame = createMockGame({
        status: GameStatus.FINISHED,
        result: 'user_win_checkmate',
      });
      mockGameRepository.findByIdAndUserId.mockResolvedValue(finishedGame);

      await expect(gameService.resignGame(mockGameId, mockUserId)).rejects.toThrow(
        CannotResignFinishedGameError
      );
    });

    it('should throw error when game is abandoned', async () => {
      const abandonedGame = createMockGame({
        status: GameStatus.ABANDONED,
      });
      mockGameRepository.findByIdAndUserId.mockResolvedValue(abandonedGame);

      await expect(gameService.resignGame(mockGameId, mockUserId)).rejects.toThrow(
        CannotResignFinishedGameError
      );
    });

    it('should clear turnStartedAt when resigning', async () => {
      const mockGame = createMockGame({
        turnStartedAt: new Date('2026-01-18T10:00:00Z'),
      });
      const resignedGame = createMockGame({
        status: GameStatus.FINISHED,
        result: 'user_resigned',
        turnStartedAt: null,
      });

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
      mockGameRepository.finishGame.mockResolvedValue(resignedGame);
      mockGameRepository.update.mockResolvedValue(resignedGame);

      await gameService.resignGame(mockGameId, mockUserId);

      expect(mockGameRepository.update).toHaveBeenCalledWith(mockGameId, { turnStartedAt: null });
    });
  });

  describe('makeMove', () => {
    const newFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

    it('should make a valid move and update game state', async () => {
      const mockGame = createMockGame();
      const updatedGame = createMockGame({ currentFen: newFen, movesHistory: ['e4'], version: 2 });

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
      mockGameRepository.findById.mockResolvedValue(updatedGame);

      // Mock Chess for the service
      const mockChessInstance = {
        turn: jest.fn().mockReturnValue('w'),
        move: jest.fn().mockReturnValue({ san: 'e4', from: 'e2', to: 'e4' }),
        fen: jest.fn().mockReturnValue(newFen),
        isCheck: jest.fn().mockReturnValue(false),
        isGameOver: jest.fn().mockReturnValue(false),
        isCheckmate: jest.fn().mockReturnValue(false),
        isStalemate: jest.fn().mockReturnValue(false),
        isThreefoldRepetition: jest.fn().mockReturnValue(false),
        isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
        isInsufficientMaterial: jest.fn().mockReturnValue(false),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      const result = await gameService.makeMove(mockGameId, mockUserId, { from: 'e2', to: 'e4' });

      expect(result.success).toBe(true);
      expect(mockGameRepository.findByIdAndUserId).toHaveBeenCalledWith(mockGameId, mockUserId);
      expect(mockGameRepository.addMoveWithVersion).toHaveBeenCalledWith(
        mockGameId,
        1, // version
        'e4',
        newFen
      );
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        gameService.makeMove(mockGameId, mockUserId, { from: 'e2', to: 'e4' })
      ).rejects.toThrow(GameNotFoundError);
    });

    it('should throw error when game is not active', async () => {
      const finishedGame = createMockGame({ status: GameStatus.FINISHED });
      mockGameRepository.findByIdAndUserId.mockResolvedValue(finishedGame);

      await expect(
        gameService.makeMove(mockGameId, mockUserId, { from: 'e2', to: 'e4' })
      ).rejects.toThrow(GameNotActiveError);
    });

    it('should throw error when not user turn', async () => {
      const mockGame = createMockGame();
      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

      // Mock Chess to return black's turn
      const mockChessInstance = {
        turn: jest.fn().mockReturnValue('b'),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      await expect(
        gameService.makeMove(mockGameId, mockUserId, { from: 'e7', to: 'e5' })
      ).rejects.toThrow(NotYourTurnError);
    });

    it('should throw error for invalid move', async () => {
      const mockGame = createMockGame();
      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

      // Mock Chess for invalid move
      const mockChessInstance = {
        turn: jest.fn().mockReturnValue('w'),
        move: jest.fn().mockReturnValue(null), // Invalid move returns null
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      await expect(
        gameService.makeMove(mockGameId, mockUserId, { from: 'e2', to: 'e5' })
      ).rejects.toThrow(InvalidMoveError);
    });

    it('should finish game on checkmate', async () => {
      const mockGame = createMockGame();
      const checkmatedFen = 'some-checkmate-fen';
      const finishedGame = createMockGame({
        status: GameStatus.FINISHED,
        result: 'user_win_checkmate',
        currentFen: checkmatedFen,
        movesHistory: ['Qh5', 'Qxf7#'],
      });

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
      mockGameRepository.finishGame.mockResolvedValue(finishedGame);
      mockGameRepository.addMove.mockResolvedValue(finishedGame);

      // Mock Chess for checkmate
      // After white (user) checkmates black (engine), it's black's turn but they're checkmated
      // The initial turn check passes (white to move), then after the move black is checkmated
      let turnCallCount = 0;
      const mockChessInstance = {
        turn: jest.fn().mockImplementation(() => {
          turnCallCount++;
          // First call: before move (white's turn)
          // Second call: after move for checkGameEnd (black's turn, but checkmated)
          return turnCallCount === 1 ? 'w' : 'b';
        }),
        move: jest.fn().mockReturnValue({ san: 'Qxf7#', from: 'h5', to: 'f7' }),
        fen: jest.fn().mockReturnValue(checkmatedFen),
        isCheck: jest.fn().mockReturnValue(true),
        isGameOver: jest.fn().mockReturnValue(true),
        isCheckmate: jest.fn().mockReturnValue(true),
        isStalemate: jest.fn().mockReturnValue(false),
        isThreefoldRepetition: jest.fn().mockReturnValue(false),
        isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
        isInsufficientMaterial: jest.fn().mockReturnValue(false),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      const result = await gameService.makeMove(mockGameId, mockUserId, { from: 'h5', to: 'f7' });

      expect(result.success).toBe(true);
      expect(mockGameRepository.finishGameWithVersion).toHaveBeenCalledWith(
        mockGameId,
        1, // version
        'user_win_checkmate'
      );
    });

    it('should handle promotion moves', async () => {
      const mockGame = createMockGame({
        currentFen: 'rnbqkbnr/Pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1',
      });
      const promotedFen = 'Qnbqkbnr/1ppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR b KQkq - 0 1';
      const updatedGame = createMockGame({
        currentFen: promotedFen,
        movesHistory: ['a8=Q'],
      });

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
      mockGameRepository.addMove.mockResolvedValue(updatedGame);
      mockGameRepository.findById.mockResolvedValue(updatedGame);

      // Mock Chess for promotion
      const mockChessInstance = {
        turn: jest.fn().mockReturnValue('w'),
        move: jest.fn().mockReturnValue({ san: 'a8=Q', from: 'a7', to: 'a8', promotion: 'q' }),
        fen: jest.fn().mockReturnValue(promotedFen),
        isCheck: jest.fn().mockReturnValue(false),
        isGameOver: jest.fn().mockReturnValue(false),
        isCheckmate: jest.fn().mockReturnValue(false),
        isStalemate: jest.fn().mockReturnValue(false),
        isThreefoldRepetition: jest.fn().mockReturnValue(false),
        isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
        isInsufficientMaterial: jest.fn().mockReturnValue(false),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      const result = await gameService.makeMove(mockGameId, mockUserId, {
        from: 'a7',
        to: 'a8',
        promotion: 'q',
      });

      expect(result.success).toBe(true);
      expect(mockChessInstance.move).toHaveBeenCalledWith({
        from: 'a7',
        to: 'a8',
        promotion: 'q',
      });
    });

    describe('with engine service', () => {
      let gameServiceWithEngine: GameService;
      let mockEngineService: jest.Mocked<EngineService>;

      beforeEach(() => {
        mockEngineService = {
          getEngineMove: jest.fn(),
          isReady: jest.fn().mockReturnValue(true),
          dispose: jest.fn(),
          setPlayStyle: jest.fn(),
          switchProvider: jest.fn(),
          registerProvider: jest.fn(),
        } as unknown as jest.Mocked<EngineService>;

        gameServiceWithEngine = new GameService(mockGameRepository, mockEngineService);
      });

      it('should get engine move after user move', async () => {
        const mockGame = createMockGame();
        const fenAfterUserMove = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
        const fenAfterEngineMove = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
        const updatedGame = createMockGame({
          currentFen: fenAfterEngineMove,
          movesHistory: ['e4', 'e5'],
        });

        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
        mockGameRepository.addMove.mockResolvedValue(updatedGame);
        mockGameRepository.findById.mockResolvedValue(updatedGame);
        mockGameRepository.update.mockResolvedValue(updatedGame);

        mockEngineService.getEngineMove.mockResolvedValue({
          move: { from: 'e7', to: 'e5' },
          depth: 5,
          score: 0,
        });

        // Track how many times move() was called to determine which FEN to return
        let moveCallCount = 0;
        const mockChessInstance = {
          turn: jest.fn().mockReturnValue('w'), // User's turn initially
          move: jest.fn().mockImplementation(() => {
            moveCallCount++;
            if (moveCallCount === 1) {
              return { san: 'e4', from: 'e2', to: 'e4' }; // User move
            }
            return { san: 'e5', from: 'e7', to: 'e5' }; // Engine move
          }),
          fen: jest.fn().mockImplementation(() => {
            // After first move (user's move), return fenAfterUserMove
            // After second move (engine's move), return fenAfterEngineMove
            return moveCallCount === 0
              ? STARTING_FEN
              : moveCallCount === 1
                ? fenAfterUserMove
                : fenAfterEngineMove;
          }),
          isCheck: jest.fn().mockReturnValue(false),
          isGameOver: jest.fn().mockReturnValue(false),
          isCheckmate: jest.fn().mockReturnValue(false),
          isStalemate: jest.fn().mockReturnValue(false),
          isThreefoldRepetition: jest.fn().mockReturnValue(false),
          isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
          isInsufficientMaterial: jest.fn().mockReturnValue(false),
        };
        (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
          () => mockChessInstance as unknown as Chess
        );

        const result = await gameServiceWithEngine.makeMove(mockGameId, mockUserId, {
          from: 'e2',
          to: 'e4',
        });

        expect(result.success).toBe(true);
        expect(mockEngineService.getEngineMove).toHaveBeenCalledWith(
          fenAfterUserMove,
          3, // difficulty level
          ['e4']
        );
        expect(result.engineMove).toBeDefined();
        expect(result.engineMove?.from).toBe('e7');
        expect(result.engineMove?.to).toBe('e5');
        expect(result.engineMove?.san).toBe('e5');
      });

      it('should handle engine error gracefully and still return user move', async () => {
        const mockGame = createMockGame();
        const fenAfterUserMove = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
        const updatedGame = createMockGame({
          currentFen: fenAfterUserMove,
          movesHistory: ['e4'],
        });

        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
        mockGameRepository.addMove.mockResolvedValue(updatedGame);
        mockGameRepository.findById.mockResolvedValue(updatedGame);
        mockGameRepository.update.mockResolvedValue(updatedGame);

        // Engine throws an error
        mockEngineService.getEngineMove.mockRejectedValue(new Error('Engine timeout'));

        const mockChessInstance = {
          turn: jest.fn().mockReturnValue('w'),
          move: jest.fn().mockReturnValue({ san: 'e4', from: 'e2', to: 'e4' }),
          fen: jest.fn().mockReturnValue(fenAfterUserMove),
          isCheck: jest.fn().mockReturnValue(false),
          isGameOver: jest.fn().mockReturnValue(false),
          isCheckmate: jest.fn().mockReturnValue(false),
          isStalemate: jest.fn().mockReturnValue(false),
          isThreefoldRepetition: jest.fn().mockReturnValue(false),
          isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
          isInsufficientMaterial: jest.fn().mockReturnValue(false),
        };
        (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
          () => mockChessInstance as unknown as Chess
        );

        const result = await gameServiceWithEngine.makeMove(mockGameId, mockUserId, {
          from: 'e2',
          to: 'e4',
        });

        // User's move should still succeed
        expect(result.success).toBe(true);
        // No engine move
        expect(result.engineMove).toBeUndefined();
      });

      it('should finish game when engine checkmates user', async () => {
        const mockGame = createMockGame();
        const fenAfterUserMove = 'some-position-fen';
        const checkmatedFen = 'checkmate-fen';
        const finishedGame = createMockGame({
          status: GameStatus.FINISHED,
          result: 'engine_win_checkmate',
          currentFen: checkmatedFen,
          movesHistory: ['f3', 'e5', 'g4', 'Qh4#'],
        });

        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
        mockGameRepository.addMoveWithVersion.mockResolvedValue({
          success: true,
          game: finishedGame,
        });
        mockGameRepository.finishGameWithVersion.mockResolvedValue({
          success: true,
          game: finishedGame,
        });
        mockGameRepository.updateWithVersion.mockResolvedValue({
          success: true,
          game: finishedGame,
        });
        mockGameRepository.findById.mockResolvedValue(finishedGame);

        mockEngineService.getEngineMove.mockResolvedValue({
          move: { from: 'd8', to: 'h4' },
          depth: 5,
        });

        // Track how many times move() is called
        let moveCallCount = 0;
        const mockChessInstance = {
          turn: jest.fn().mockReturnValue('w'), // User's turn
          move: jest.fn().mockImplementation(() => {
            moveCallCount++;
            if (moveCallCount === 1) {
              return { san: 'g4', from: 'g2', to: 'g4' }; // User move
            }
            return { san: 'Qh4#', from: 'd8', to: 'h4' }; // Engine checkmate
          }),
          fen: jest.fn().mockImplementation(() => {
            // After engine move, return checkmated position
            return moveCallCount >= 2 ? checkmatedFen : fenAfterUserMove;
          }),
          isCheck: jest.fn().mockReturnValue(false),
          isGameOver: jest.fn().mockReturnValue(false),
          isCheckmate: jest.fn().mockImplementation(() => {
            // After engine move (second move), it's checkmate
            return moveCallCount >= 2;
          }),
          isStalemate: jest.fn().mockReturnValue(false),
          isThreefoldRepetition: jest.fn().mockReturnValue(false),
          isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
          isInsufficientMaterial: jest.fn().mockReturnValue(false),
        };

        (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
          () => mockChessInstance as unknown as Chess
        );

        const result = await gameServiceWithEngine.makeMove(mockGameId, mockUserId, {
          from: 'g2',
          to: 'g4',
        });

        expect(result.success).toBe(true);
        expect(result.engineMove).toBeDefined();
        expect(result.engineMove?.san).toBe('Qh4#');
        // Now uses versioned finish for atomicity
        expect(mockGameRepository.finishGameWithVersion).toHaveBeenCalled();
      });

      it('should handle engine returning invalid move', async () => {
        const mockGame = createMockGame();
        const fenAfterUserMove = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
        const updatedGame = createMockGame({
          currentFen: fenAfterUserMove,
          movesHistory: ['e4'],
        });

        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
        mockGameRepository.addMove.mockResolvedValue(updatedGame);
        mockGameRepository.findById.mockResolvedValue(updatedGame);
        mockGameRepository.update.mockResolvedValue(updatedGame);

        // Engine returns a move
        mockEngineService.getEngineMove.mockResolvedValue({
          move: { from: 'a1', to: 'a8' }, // Invalid move
          depth: 5,
        });

        let moveCallCount = 0;
        const mockChessInstance = {
          turn: jest.fn().mockReturnValue('w'),
          move: jest.fn().mockImplementation(() => {
            moveCallCount++;
            if (moveCallCount === 1) {
              // User move succeeds
              return { san: 'e4', from: 'e2', to: 'e4' };
            }
            // Engine move fails
            return null;
          }),
          fen: jest.fn().mockReturnValue(fenAfterUserMove),
          isCheck: jest.fn().mockReturnValue(false),
          isGameOver: jest.fn().mockReturnValue(false),
          isCheckmate: jest.fn().mockReturnValue(false),
          isStalemate: jest.fn().mockReturnValue(false),
          isThreefoldRepetition: jest.fn().mockReturnValue(false),
          isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
          isInsufficientMaterial: jest.fn().mockReturnValue(false),
        };
        (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
          () => mockChessInstance as unknown as Chess
        );

        const result = await gameServiceWithEngine.makeMove(mockGameId, mockUserId, {
          from: 'e2',
          to: 'e4',
        });

        // User's move should still succeed
        expect(result.success).toBe(true);
        // No engine move (error was handled gracefully)
        expect(result.engineMove).toBeUndefined();
      });

      it('should include promotion in engine move', async () => {
        const mockGame = createMockGame({
          currentFen: 'some-position-with-promotable-pawn',
        });
        const fenAfterUserMove = 'position-after-user-move';
        const fenAfterEnginePromotion = 'position-after-engine-promotion';
        const updatedGame = createMockGame({
          currentFen: fenAfterEnginePromotion,
          movesHistory: ['Kf8', 'e8=Q+'],
        });

        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
        mockGameRepository.addMove.mockResolvedValue(updatedGame);
        mockGameRepository.findById.mockResolvedValue(updatedGame);
        mockGameRepository.update.mockResolvedValue(updatedGame);

        mockEngineService.getEngineMove.mockResolvedValue({
          move: { from: 'e7', to: 'e8', promotion: 'q' },
          depth: 5,
        });

        let fenCallCount = 0;
        const mockChessInstance = {
          turn: jest.fn().mockReturnValue('w'),
          move: jest
            .fn()
            .mockReturnValueOnce({ san: 'Kf8', from: 'e8', to: 'f8' })
            .mockReturnValueOnce({ san: 'e8=Q+', from: 'e7', to: 'e8', promotion: 'q' }),
          fen: jest.fn().mockImplementation(() => {
            fenCallCount++;
            return fenCallCount <= 2 ? fenAfterUserMove : fenAfterEnginePromotion;
          }),
          isCheck: jest.fn().mockReturnValue(false),
          isGameOver: jest.fn().mockReturnValue(false),
          isCheckmate: jest.fn().mockReturnValue(false),
          isStalemate: jest.fn().mockReturnValue(false),
          isThreefoldRepetition: jest.fn().mockReturnValue(false),
          isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
          isInsufficientMaterial: jest.fn().mockReturnValue(false),
        };
        (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
          () => mockChessInstance as unknown as Chess
        );

        const result = await gameServiceWithEngine.makeMove(mockGameId, mockUserId, {
          from: 'e8',
          to: 'f8',
        });

        expect(result.success).toBe(true);
        expect(result.engineMove?.promotion).toBe('q');
        expect(result.engineMove?.san).toBe('e8=Q+');
      });
    });
  });

  describe('Optimistic Locking', () => {
    describe('makeMove with version checking', () => {
      it('should throw ConcurrentModificationError when addMoveWithVersion fails', async () => {
        const mockGame = createMockGame({ version: 1 });
        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

        // Set up Chess mock for valid move
        const mockChessInstance = {
          turn: jest.fn().mockReturnValue('w'),
          move: jest.fn().mockReturnValue({ san: 'e4', from: 'e2', to: 'e4' }),
          fen: jest
            .fn()
            .mockReturnValue('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'),
          isCheck: jest.fn().mockReturnValue(false),
          isGameOver: jest.fn().mockReturnValue(false),
          isCheckmate: jest.fn().mockReturnValue(false),
          isStalemate: jest.fn().mockReturnValue(false),
          isThreefoldRepetition: jest.fn().mockReturnValue(false),
          isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
          isInsufficientMaterial: jest.fn().mockReturnValue(false),
        };
        (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
          () => mockChessInstance as unknown as Chess
        );

        // Simulate version mismatch (concurrent modification)
        mockGameRepository.addMoveWithVersion.mockResolvedValue({ success: false });

        await expect(
          gameService.makeMove(mockGameId, mockUserId, { from: 'e2', to: 'e4' })
        ).rejects.toThrow(ConcurrentModificationError);
      });

      it('should succeed when addMoveWithVersion succeeds', async () => {
        const mockGame = createMockGame({ version: 1 });
        const updatedGame = createMockGame({
          version: 2,
          currentFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
          movesHistory: ['e4'],
        });
        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
        mockGameRepository.findById.mockResolvedValue(updatedGame);

        // Set up Chess mock for valid move
        const mockChessInstance = {
          turn: jest.fn().mockReturnValue('w'),
          move: jest.fn().mockReturnValue({ san: 'e4', from: 'e2', to: 'e4' }),
          fen: jest
            .fn()
            .mockReturnValue('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'),
          isCheck: jest.fn().mockReturnValue(false),
          isGameOver: jest.fn().mockReturnValue(false),
          isCheckmate: jest.fn().mockReturnValue(false),
          isStalemate: jest.fn().mockReturnValue(false),
          isThreefoldRepetition: jest.fn().mockReturnValue(false),
          isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
          isInsufficientMaterial: jest.fn().mockReturnValue(false),
        };
        (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
          () => mockChessInstance as unknown as Chess
        );

        // Simulate successful version check
        mockGameRepository.addMoveWithVersion.mockResolvedValue({
          success: true,
          game: updatedGame,
        });
        mockGameRepository.update.mockResolvedValue(updatedGame);

        const result = await gameService.makeMove(mockGameId, mockUserId, { from: 'e2', to: 'e4' });

        expect(result.success).toBe(true);
        expect(mockGameRepository.addMoveWithVersion).toHaveBeenCalledWith(
          mockGameId,
          1, // Expected version
          'e4',
          expect.any(String)
        );
      });

      it('should throw ConcurrentModificationError when finishGameWithVersion fails during checkmate', async () => {
        const mockGame = createMockGame({ version: 1 });
        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

        // Set up Chess mock for checkmate
        const mockChessInstance = {
          turn: jest.fn().mockReturnValue('w'),
          move: jest.fn().mockReturnValue({ san: 'Qh7#', from: 'd3', to: 'h7' }),
          fen: jest.fn().mockReturnValue('checkmate-fen'),
          isCheck: jest.fn().mockReturnValue(true),
          isGameOver: jest.fn().mockReturnValue(true),
          isCheckmate: jest.fn().mockReturnValue(true),
          isStalemate: jest.fn().mockReturnValue(false),
          isThreefoldRepetition: jest.fn().mockReturnValue(false),
          isDrawByFiftyMoves: jest.fn().mockReturnValue(false),
          isInsufficientMaterial: jest.fn().mockReturnValue(false),
        };
        (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
          () => mockChessInstance as unknown as Chess
        );

        // Simulate version mismatch on finish
        mockGameRepository.finishGameWithVersion.mockResolvedValue({ success: false });

        await expect(
          gameService.makeMove(mockGameId, mockUserId, { from: 'd3', to: 'h7' })
        ).rejects.toThrow(ConcurrentModificationError);
      });
    });

    describe('saveGame with version checking', () => {
      it('should throw ConcurrentModificationError when updateWithVersion fails', async () => {
        const mockGame = createMockGame({
          version: 1,
          timeControlType: 'blitz_5min',
          turnStartedAt: new Date(Date.now() - 10000), // 10 seconds ago
        });
        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

        // Set up Chess mock
        const mockChessInstance = {
          turn: jest.fn().mockReturnValue('w'),
        };
        (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
          () => mockChessInstance as unknown as Chess
        );

        // Simulate version mismatch
        mockGameRepository.updateWithVersion.mockResolvedValue({ success: false });

        await expect(gameService.saveGame(mockGameId, mockUserId)).rejects.toThrow(
          ConcurrentModificationError
        );
      });

      it('should succeed when updateWithVersion succeeds', async () => {
        const mockGame = createMockGame({
          version: 1,
          timeControlType: 'blitz_5min',
          turnStartedAt: new Date(Date.now() - 10000), // 10 seconds ago
        });
        const updatedGame = createMockGame({ version: 2 });
        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

        // Set up Chess mock
        const mockChessInstance = {
          turn: jest.fn().mockReturnValue('w'),
        };
        (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
          () => mockChessInstance as unknown as Chess
        );

        // Simulate successful version check
        mockGameRepository.updateWithVersion.mockResolvedValue({
          success: true,
          game: updatedGame,
        });

        const result = await gameService.saveGame(mockGameId, mockUserId);

        expect(result.savedAt).toBeDefined();
        expect(mockGameRepository.updateWithVersion).toHaveBeenCalledWith(
          mockGameId,
          1, // Expected version
          expect.objectContaining({
            timeLeftUser: expect.any(Number),
            turnStartedAt: expect.any(Date),
          })
        );
      });

      it('should use version checking even for games without time control', async () => {
        const mockGame = createMockGame({
          version: 1,
          timeControlType: 'none',
          turnStartedAt: null,
        });
        const updatedGame = createMockGame({ version: 2 });
        mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);

        mockGameRepository.updateWithVersion.mockResolvedValue({
          success: true,
          game: updatedGame,
        });

        const result = await gameService.saveGame(mockGameId, mockUserId);

        expect(result.savedAt).toBeDefined();
        expect(mockGameRepository.updateWithVersion).toHaveBeenCalledWith(mockGameId, 1, {});
      });
    });
  });
});
