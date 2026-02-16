import { StatsService } from '../statsService';
import { StatsRepository } from '../../repositories/StatsRepository';
import { GameStatus } from '@prisma/client';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

describe('StatsService', () => {
  let statsService: StatsService;
  let mockStatsRepository: jest.Mocked<StatsRepository>;

  const mockUserId = 'user-123';

  beforeEach(() => {
    mockStatsRepository = {
      getGameCountsByStatus: jest.fn(),
      getResultCounts: jest.fn(),
      getStatsByDifficulty: jest.fn(),
      getStatsByTimeControl: jest.fn(),
      getAvgMoves: jest.fn(),
      getRecentFinishedGames: jest.fn(),
    } as unknown as jest.Mocked<StatsRepository>;

    statsService = new StatsService(mockStatsRepository);
  });

  describe('getUserStats', () => {
    it('should return correct stats for user with games', async () => {
      mockStatsRepository.getGameCountsByStatus.mockResolvedValue([
        { status: GameStatus.ACTIVE, count: 2 },
        { status: GameStatus.FINISHED, count: 10 },
        { status: GameStatus.ABANDONED, count: 1 },
      ]);
      mockStatsRepository.getResultCounts.mockResolvedValue([
        { result: 'user_win_checkmate', count: 4 },
        { result: 'user_win_timeout', count: 1 },
        { result: 'engine_win_checkmate', count: 3 },
        { result: 'draw_stalemate', count: 2 },
      ]);
      mockStatsRepository.getStatsByDifficulty.mockResolvedValue([
        { difficultyLevel: 1, result: 'user_win_checkmate', count: 3 },
        { difficultyLevel: 1, result: 'engine_win_checkmate', count: 1 },
        { difficultyLevel: 3, result: 'user_win_checkmate', count: 1 },
        { difficultyLevel: 3, result: 'user_win_timeout', count: 1 },
        { difficultyLevel: 3, result: 'engine_win_checkmate', count: 2 },
        { difficultyLevel: 3, result: 'draw_stalemate', count: 2 },
      ]);
      mockStatsRepository.getStatsByTimeControl.mockResolvedValue([
        { timeControlType: 'blitz_5min', result: 'user_win_checkmate', count: 3 },
        { timeControlType: 'blitz_5min', result: 'engine_win_checkmate', count: 2 },
        { timeControlType: 'rapid_10min', result: 'user_win_checkmate', count: 1 },
        { timeControlType: 'rapid_10min', result: 'user_win_timeout', count: 1 },
        { timeControlType: 'rapid_10min', result: 'engine_win_checkmate', count: 1 },
        { timeControlType: 'rapid_10min', result: 'draw_stalemate', count: 2 },
      ]);
      mockStatsRepository.getAvgMoves.mockResolvedValue(40); // 40 half-moves = 20 full moves
      mockStatsRepository.getRecentFinishedGames.mockResolvedValue([
        { result: 'user_win_checkmate', updatedAt: new Date() },
        { result: 'user_win_timeout', updatedAt: new Date() },
        { result: 'engine_win_checkmate', updatedAt: new Date() },
      ]);

      const stats = await statsService.getUserStats(mockUserId);

      expect(stats.totalGames).toBe(13); // 2 + 10 + 1
      expect(stats.activeGames).toBe(2);
      expect(stats.finishedGames).toBe(10);
      expect(stats.wins).toBe(5); // 4 + 1
      expect(stats.losses).toBe(3);
      expect(stats.draws).toBe(2);
      expect(stats.winRate).toBe(50); // 5/10 * 100
      expect(stats.avgMovesPerGame).toBe(20); // ceil(40/2)
      expect(stats.currentStreak).toEqual({ type: 'win', count: 2 });
      expect(stats.byDifficulty).toHaveLength(2);
      expect(stats.byDifficulty[0]).toEqual({
        level: 1,
        total: 4,
        wins: 3,
        losses: 1,
        draws: 0,
      });
      expect(stats.byTimeControl).toHaveLength(2);
    });

    it('should return zeros for user with no games', async () => {
      mockStatsRepository.getGameCountsByStatus.mockResolvedValue([]);
      mockStatsRepository.getResultCounts.mockResolvedValue([]);
      mockStatsRepository.getStatsByDifficulty.mockResolvedValue([]);
      mockStatsRepository.getStatsByTimeControl.mockResolvedValue([]);
      mockStatsRepository.getAvgMoves.mockResolvedValue(0);
      mockStatsRepository.getRecentFinishedGames.mockResolvedValue([]);

      const stats = await statsService.getUserStats(mockUserId);

      expect(stats.totalGames).toBe(0);
      expect(stats.activeGames).toBe(0);
      expect(stats.finishedGames).toBe(0);
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.draws).toBe(0);
      expect(stats.winRate).toBe(0);
      expect(stats.avgMovesPerGame).toBe(0);
      expect(stats.currentStreak).toEqual({ type: 'none', count: 0 });
      expect(stats.byDifficulty).toEqual([]);
      expect(stats.byTimeControl).toEqual([]);
    });

    it('should return zeros for user with only active/abandoned games', async () => {
      mockStatsRepository.getGameCountsByStatus.mockResolvedValue([
        { status: GameStatus.ACTIVE, count: 3 },
        { status: GameStatus.ABANDONED, count: 2 },
      ]);
      mockStatsRepository.getResultCounts.mockResolvedValue([]);
      mockStatsRepository.getStatsByDifficulty.mockResolvedValue([]);
      mockStatsRepository.getStatsByTimeControl.mockResolvedValue([]);
      mockStatsRepository.getAvgMoves.mockResolvedValue(0);
      mockStatsRepository.getRecentFinishedGames.mockResolvedValue([]);

      const stats = await statsService.getUserStats(mockUserId);

      expect(stats.totalGames).toBe(5);
      expect(stats.finishedGames).toBe(0);
      expect(stats.winRate).toBe(0);
    });

    it('should handle 100% win rate', async () => {
      mockStatsRepository.getGameCountsByStatus.mockResolvedValue([
        { status: GameStatus.FINISHED, count: 5 },
      ]);
      mockStatsRepository.getResultCounts.mockResolvedValue([
        { result: 'user_win_checkmate', count: 5 },
      ]);
      mockStatsRepository.getStatsByDifficulty.mockResolvedValue([]);
      mockStatsRepository.getStatsByTimeControl.mockResolvedValue([]);
      mockStatsRepository.getAvgMoves.mockResolvedValue(60);
      mockStatsRepository.getRecentFinishedGames.mockResolvedValue([
        { result: 'user_win_checkmate', updatedAt: new Date() },
        { result: 'user_win_checkmate', updatedAt: new Date() },
        { result: 'user_win_checkmate', updatedAt: new Date() },
        { result: 'user_win_checkmate', updatedAt: new Date() },
        { result: 'user_win_checkmate', updatedAt: new Date() },
      ]);

      const stats = await statsService.getUserStats(mockUserId);

      expect(stats.winRate).toBe(100);
      expect(stats.currentStreak).toEqual({ type: 'win', count: 5 });
    });

    it('should handle all draws', async () => {
      mockStatsRepository.getGameCountsByStatus.mockResolvedValue([
        { status: GameStatus.FINISHED, count: 3 },
      ]);
      mockStatsRepository.getResultCounts.mockResolvedValue([
        { result: 'draw_stalemate', count: 2 },
        { result: 'draw_repetition', count: 1 },
      ]);
      mockStatsRepository.getStatsByDifficulty.mockResolvedValue([]);
      mockStatsRepository.getStatsByTimeControl.mockResolvedValue([]);
      mockStatsRepository.getAvgMoves.mockResolvedValue(80);
      mockStatsRepository.getRecentFinishedGames.mockResolvedValue([
        { result: 'draw_stalemate', updatedAt: new Date() },
        { result: 'draw_repetition', updatedAt: new Date() },
      ]);

      const stats = await statsService.getUserStats(mockUserId);

      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.draws).toBe(3);
      expect(stats.winRate).toBe(0);
      // Draw breaks streak
      expect(stats.currentStreak).toEqual({ type: 'none', count: 0 });
    });

    it('should calculate losing streak', async () => {
      mockStatsRepository.getGameCountsByStatus.mockResolvedValue([
        { status: GameStatus.FINISHED, count: 5 },
      ]);
      mockStatsRepository.getResultCounts.mockResolvedValue([
        { result: 'engine_win_checkmate', count: 3 },
        { result: 'user_win_checkmate', count: 2 },
      ]);
      mockStatsRepository.getStatsByDifficulty.mockResolvedValue([]);
      mockStatsRepository.getStatsByTimeControl.mockResolvedValue([]);
      mockStatsRepository.getAvgMoves.mockResolvedValue(30);
      mockStatsRepository.getRecentFinishedGames.mockResolvedValue([
        { result: 'engine_win_checkmate', updatedAt: new Date() },
        { result: 'user_resigned', updatedAt: new Date() },
        { result: 'engine_win_timeout', updatedAt: new Date() },
        { result: 'user_win_checkmate', updatedAt: new Date() },
      ]);

      const stats = await statsService.getUserStats(mockUserId);

      expect(stats.currentStreak).toEqual({ type: 'loss', count: 3 });
    });

    it('should round win rate to one decimal place', async () => {
      mockStatsRepository.getGameCountsByStatus.mockResolvedValue([
        { status: GameStatus.FINISHED, count: 3 },
      ]);
      mockStatsRepository.getResultCounts.mockResolvedValue([
        { result: 'user_win_checkmate', count: 1 },
        { result: 'engine_win_checkmate', count: 2 },
      ]);
      mockStatsRepository.getStatsByDifficulty.mockResolvedValue([]);
      mockStatsRepository.getStatsByTimeControl.mockResolvedValue([]);
      mockStatsRepository.getAvgMoves.mockResolvedValue(0);
      mockStatsRepository.getRecentFinishedGames.mockResolvedValue([]);

      const stats = await statsService.getUserStats(mockUserId);

      // 1/3 * 100 = 33.333... -> 33.3
      expect(stats.winRate).toBe(33.3);
    });

    it('should convert half-moves to full moves (ceiling)', async () => {
      mockStatsRepository.getGameCountsByStatus.mockResolvedValue([
        { status: GameStatus.FINISHED, count: 1 },
      ]);
      mockStatsRepository.getResultCounts.mockResolvedValue([
        { result: 'user_win_checkmate', count: 1 },
      ]);
      mockStatsRepository.getStatsByDifficulty.mockResolvedValue([]);
      mockStatsRepository.getStatsByTimeControl.mockResolvedValue([]);
      mockStatsRepository.getAvgMoves.mockResolvedValue(41); // odd number of half-moves
      mockStatsRepository.getRecentFinishedGames.mockResolvedValue([]);

      const stats = await statsService.getUserStats(mockUserId);

      // ceil(41/2) = 21
      expect(stats.avgMovesPerGame).toBe(21);
    });

    it('should sort difficulty stats by level', async () => {
      mockStatsRepository.getGameCountsByStatus.mockResolvedValue([
        { status: GameStatus.FINISHED, count: 6 },
      ]);
      mockStatsRepository.getResultCounts.mockResolvedValue([
        { result: 'user_win_checkmate', count: 6 },
      ]);
      // Return out of order
      mockStatsRepository.getStatsByDifficulty.mockResolvedValue([
        { difficultyLevel: 5, result: 'user_win_checkmate', count: 2 },
        { difficultyLevel: 1, result: 'user_win_checkmate', count: 2 },
        { difficultyLevel: 3, result: 'user_win_checkmate', count: 2 },
      ]);
      mockStatsRepository.getStatsByTimeControl.mockResolvedValue([]);
      mockStatsRepository.getAvgMoves.mockResolvedValue(0);
      mockStatsRepository.getRecentFinishedGames.mockResolvedValue([]);

      const stats = await statsService.getUserStats(mockUserId);

      expect(stats.byDifficulty[0].level).toBe(1);
      expect(stats.byDifficulty[1].level).toBe(3);
      expect(stats.byDifficulty[2].level).toBe(5);
    });

    it('should correctly classify all result types', async () => {
      mockStatsRepository.getGameCountsByStatus.mockResolvedValue([
        { status: GameStatus.FINISHED, count: 9 },
      ]);
      mockStatsRepository.getResultCounts.mockResolvedValue([
        { result: 'user_win_checkmate', count: 1 },
        { result: 'user_win_timeout', count: 1 },
        { result: 'engine_win_checkmate', count: 1 },
        { result: 'engine_win_timeout', count: 1 },
        { result: 'user_resigned', count: 1 },
        { result: 'draw_stalemate', count: 1 },
        { result: 'draw_repetition', count: 1 },
        { result: 'draw_fifty_moves', count: 1 },
        { result: 'draw_insufficient_material', count: 1 },
      ]);
      mockStatsRepository.getStatsByDifficulty.mockResolvedValue([]);
      mockStatsRepository.getStatsByTimeControl.mockResolvedValue([]);
      mockStatsRepository.getAvgMoves.mockResolvedValue(0);
      mockStatsRepository.getRecentFinishedGames.mockResolvedValue([]);

      const stats = await statsService.getUserStats(mockUserId);

      expect(stats.wins).toBe(2); // checkmate + timeout
      expect(stats.losses).toBe(3); // engine checkmate + engine timeout + resigned
      expect(stats.draws).toBe(4); // stalemate + repetition + fifty + insufficient
    });
  });
});
