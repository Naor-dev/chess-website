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

  describe('makeMove', () => {
    const newFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

    it('should make a valid move and update game state', async () => {
      const mockGame = createMockGame();
      const updatedGame = createMockGame({ currentFen: newFen, movesHistory: ['e4'] });

      mockGameRepository.findByIdAndUserId.mockResolvedValue(mockGame);
      mockGameRepository.addMove.mockResolvedValue(updatedGame);
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
        isDraw: jest.fn().mockReturnValue(false),
        isInsufficientMaterial: jest.fn().mockReturnValue(false),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      const result = await gameService.makeMove(mockGameId, mockUserId, { from: 'e2', to: 'e4' });

      expect(result.success).toBe(true);
      expect(mockGameRepository.findByIdAndUserId).toHaveBeenCalledWith(mockGameId, mockUserId);
      expect(mockGameRepository.addMove).toHaveBeenCalledWith(mockGameId, 'e4', newFen);
    });

    it('should throw error when game not found', async () => {
      mockGameRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        gameService.makeMove(mockGameId, mockUserId, { from: 'e2', to: 'e4' })
      ).rejects.toThrow('Game not found');
    });

    it('should throw error when game is not active', async () => {
      const finishedGame = createMockGame({ status: GameStatus.FINISHED });
      mockGameRepository.findByIdAndUserId.mockResolvedValue(finishedGame);

      await expect(
        gameService.makeMove(mockGameId, mockUserId, { from: 'e2', to: 'e4' })
      ).rejects.toThrow('Game is not active');
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
      ).rejects.toThrow('Not your turn');
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
      ).rejects.toThrow('Invalid move');
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
        isDraw: jest.fn().mockReturnValue(false),
        isInsufficientMaterial: jest.fn().mockReturnValue(false),
      };
      (Chess as jest.MockedClass<typeof Chess>).mockImplementation(
        () => mockChessInstance as unknown as Chess
      );

      const result = await gameService.makeMove(mockGameId, mockUserId, { from: 'h5', to: 'f7' });

      expect(result.success).toBe(true);
      expect(mockGameRepository.finishGame).toHaveBeenCalledWith(mockGameId, 'user_win_checkmate');
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
        isDraw: jest.fn().mockReturnValue(false),
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
  });
});
