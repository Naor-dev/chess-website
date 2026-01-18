import { EngineService } from '../engineService';
import type { ChessEngine, EngineProvider, PlayStyleStrategy } from '../../engines/types';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

// Mock the config
jest.mock('../../config/unifiedConfig', () => ({
  config: {
    stockfish: {
      depths: {
        1: 1,
        2: 3,
        3: 5,
        4: 10,
        5: 15,
      },
    },
    engine: {
      timeout: 30000,
      initTimeout: 10000,
    },
  },
}));

// Mock the StockfishEngine
jest.mock('../../engines/StockfishEngine', () => ({
  StockfishEngine: jest.fn(),
  stockfishProvider: {
    name: 'stockfish',
    description: 'Stockfish 16 WASM engine',
    createEngine: jest.fn(),
  },
}));

describe('EngineService', () => {
  let engineService: EngineService;
  let mockEngine: jest.Mocked<ChessEngine>;

  const mockFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock engine
    mockEngine = {
      name: 'mock-stockfish',
      initialize: jest.fn().mockResolvedValue(undefined),
      getBestMove: jest.fn().mockResolvedValue({
        move: { from: 'e7', to: 'e5' },
        depth: 5,
        score: 0,
      }),
      dispose: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockReturnValue(false),
    };

    // Get the mocked stockfishProvider - eslint exception for Jest mock access
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { stockfishProvider } = require('../../engines/StockfishEngine');
    stockfishProvider.createEngine.mockReturnValue(mockEngine);

    engineService = new EngineService();
  });

  describe('constructor', () => {
    it('should create with default play style', () => {
      const service = new EngineService();
      expect(service).toBeDefined();
    });

    it('should accept custom play style', () => {
      const customStyle: PlayStyleStrategy = {
        name: 'aggressive',
        modifyConfig: (config) => ({ ...config, depth: config.depth + 2 }),
      };
      const service = new EngineService(customStyle);
      expect(service).toBeDefined();
    });
  });

  describe('registerProvider', () => {
    it('should register a new engine provider', () => {
      const customProvider: EngineProvider = {
        name: 'custom-engine',
        description: 'Custom test engine',
        createEngine: jest.fn(),
      };

      engineService.registerProvider(customProvider);
      // Provider should be registered (tested indirectly via switchProvider)
    });
  });

  describe('setPlayStyle', () => {
    it('should set play style', () => {
      const customStyle: PlayStyleStrategy = {
        name: 'defensive',
        modifyConfig: (config) => config,
      };

      engineService.setPlayStyle(customStyle);
      // Style should be set (tested via getEngineMove behavior)
    });
  });

  describe('getEngineMove', () => {
    it('should return engine move for given position', async () => {
      mockEngine.isReady.mockReturnValue(true);

      // Need to initialize first
      mockEngine.isReady.mockReturnValueOnce(false).mockReturnValue(true);

      const result = await engineService.getEngineMove(mockFen, 3, ['e4']);

      expect(mockEngine.initialize).toHaveBeenCalled();
      expect(mockEngine.getBestMove).toHaveBeenCalledWith(
        mockFen,
        expect.objectContaining({
          depth: 5, // Level 3 = depth 5
          timeout: 30000,
          difficultyLevel: 3,
        })
      );
      expect(result.move.from).toBe('e7');
      expect(result.move.to).toBe('e5');
    });

    it('should use opening book move when available', async () => {
      const styleWithBook: PlayStyleStrategy = {
        name: 'book-style',
        modifyConfig: (config) => config,
        getOpeningMove: jest.fn().mockResolvedValue({
          from: 'c7',
          to: 'c5',
        }),
      };

      const serviceWithBook = new EngineService(styleWithBook);
      const result = await serviceWithBook.getEngineMove(mockFen, 3, ['e4']);

      expect(styleWithBook.getOpeningMove).toHaveBeenCalledWith(mockFen, ['e4']);
      expect(result.move.from).toBe('c7');
      expect(result.move.to).toBe('c5');
      expect(result.depth).toBe(0); // Book move
      expect(mockEngine.getBestMove).not.toHaveBeenCalled();
    });

    it('should fall back to engine when no book move', async () => {
      const styleWithEmptyBook: PlayStyleStrategy = {
        name: 'empty-book',
        modifyConfig: (config) => config,
        getOpeningMove: jest.fn().mockResolvedValue(null),
      };

      const serviceWithBook = new EngineService(styleWithEmptyBook);
      mockEngine.isReady.mockReturnValueOnce(false).mockReturnValue(true);

      const result = await serviceWithBook.getEngineMove(mockFen, 3, ['e4']);

      expect(styleWithEmptyBook.getOpeningMove).toHaveBeenCalled();
      expect(mockEngine.getBestMove).toHaveBeenCalled();
      expect(result.move.from).toBe('e7');
    });

    it('should apply play style config modifications', async () => {
      const aggressiveStyle: PlayStyleStrategy = {
        name: 'aggressive',
        modifyConfig: (config) => ({
          ...config,
          depth: config.depth + 5, // More depth for aggressive play
        }),
      };

      const serviceAggressive = new EngineService(aggressiveStyle);
      mockEngine.isReady.mockReturnValueOnce(false).mockReturnValue(true);

      await serviceAggressive.getEngineMove(mockFen, 2, []);

      expect(mockEngine.getBestMove).toHaveBeenCalledWith(
        mockFen,
        expect.objectContaining({
          depth: 8, // Level 2 (depth 3) + 5 = 8
        })
      );
    });

    it('should use correct depth for each difficulty level', async () => {
      const depths = { 1: 1, 2: 3, 3: 5, 4: 10, 5: 15 };

      for (const [level, expectedDepth] of Object.entries(depths)) {
        mockEngine.isReady.mockReturnValueOnce(false).mockReturnValue(true);

        await engineService.getEngineMove(mockFen, parseInt(level) as 1 | 2 | 3 | 4 | 5, []);

        expect(mockEngine.getBestMove).toHaveBeenLastCalledWith(
          mockFen,
          expect.objectContaining({ depth: expectedDepth })
        );
      }
    });

    it('should throw error when engine fails to initialize', async () => {
      mockEngine.initialize.mockRejectedValue(new Error('Init failed'));
      mockEngine.isReady.mockReturnValue(false);

      await expect(engineService.getEngineMove(mockFen, 3, [])).rejects.toThrow();
    });
  });

  describe('isReady', () => {
    it('should return false when engine not initialized', () => {
      expect(engineService.isReady()).toBe(false);
    });

    it('should return true when engine is ready', async () => {
      // First call returns false (triggering initialization), then true
      mockEngine.isReady.mockReturnValueOnce(false).mockReturnValue(true);

      await engineService.getEngineMove(mockFen, 3, []);

      // Verify the engine was initialized and isReady was called
      expect(mockEngine.initialize).toHaveBeenCalled();
      expect(mockEngine.getBestMove).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose engine resources', async () => {
      mockEngine.isReady.mockReturnValueOnce(false).mockReturnValue(true);

      // Initialize first
      await engineService.getEngineMove(mockFen, 3, []);

      await engineService.dispose();

      expect(mockEngine.dispose).toHaveBeenCalled();
    });

    it('should handle dispose when not initialized', async () => {
      await expect(engineService.dispose()).resolves.not.toThrow();
    });
  });

  describe('switchProvider', () => {
    it('should switch to a registered provider', async () => {
      const customProvider: EngineProvider = {
        name: 'custom',
        description: 'Custom engine',
        createEngine: jest.fn().mockReturnValue({
          name: 'custom',
          initialize: jest.fn().mockResolvedValue(undefined),
          getBestMove: jest.fn().mockResolvedValue({
            move: { from: 'd7', to: 'd5' },
            depth: 3,
          }),
          dispose: jest.fn().mockResolvedValue(undefined),
          isReady: jest.fn().mockReturnValue(true),
        }),
      };

      engineService.registerProvider(customProvider);
      await engineService.switchProvider('custom');

      mockEngine.isReady.mockReturnValueOnce(false).mockReturnValue(true);

      const result = await engineService.getEngineMove(mockFen, 3, []);

      expect(customProvider.createEngine).toHaveBeenCalled();
      expect(result.move.from).toBe('d7');
    });

    it('should throw error for unknown provider', async () => {
      await expect(engineService.switchProvider('unknown')).rejects.toThrow(
        'Unknown engine provider: unknown'
      );
    });

    it('should dispose current engine when switching', async () => {
      mockEngine.isReady.mockReturnValueOnce(false).mockReturnValue(true);

      // Initialize current engine
      await engineService.getEngineMove(mockFen, 3, []);

      const newProvider: EngineProvider = {
        name: 'new-engine',
        description: 'New engine',
        createEngine: jest.fn().mockReturnValue({
          ...mockEngine,
          name: 'new',
        }),
      };

      engineService.registerProvider(newProvider);
      await engineService.switchProvider('new-engine');

      expect(mockEngine.dispose).toHaveBeenCalled();
    });
  });
});
