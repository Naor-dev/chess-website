import * as Sentry from '@sentry/node';
import type { UserStatsResponse, DifficultyStats, TimeControlStats } from '@chess-website/shared';
import { StatsRepository, WIN_RESULTS, LOSS_RESULTS } from '../repositories/StatsRepository';

export class StatsService {
  constructor(private readonly statsRepository: StatsRepository) {}

  async getUserStats(userId: string): Promise<UserStatsResponse> {
    Sentry.addBreadcrumb({
      category: 'stats',
      message: 'Calculating user statistics',
      data: { userId },
    });

    const [statusCounts, resultCounts, difficultyData, timeControlData, avgMovesRaw, recentGames] =
      await Promise.all([
        this.statsRepository.getGameCountsByStatus(userId),
        this.statsRepository.getResultCounts(userId),
        this.statsRepository.getStatsByDifficulty(userId),
        this.statsRepository.getStatsByTimeControl(userId),
        this.statsRepository.getAvgMoves(userId),
        this.statsRepository.getRecentFinishedGames(userId),
      ]);

    // Count by status
    const totalGames = statusCounts.reduce((sum, s) => sum + s.count, 0);
    const activeGames = statusCounts.find((s) => s.status === 'ACTIVE')?.count ?? 0;
    const finishedGames = statusCounts.find((s) => s.status === 'FINISHED')?.count ?? 0;

    // Count wins/losses/draws from result grouping
    let wins = 0;
    let losses = 0;
    let draws = 0;
    for (const rc of resultCounts) {
      if (WIN_RESULTS.includes(rc.result)) {
        wins += rc.count;
      } else if (LOSS_RESULTS.includes(rc.result)) {
        losses += rc.count;
      } else {
        draws += rc.count;
      }
    }

    const winRate = finishedGames > 0 ? (wins / finishedGames) * 100 : 0;

    // movesHistory stores half-moves (plies), convert to full moves
    const avgMovesPerGame = avgMovesRaw > 0 ? Math.ceil(avgMovesRaw / 2) : 0;

    // Calculate streak from recent finished games
    const currentStreak = this.calculateStreak(recentGames.map((g) => g.result));

    // Aggregate by difficulty
    const byDifficulty = this.aggregateByDifficulty(difficultyData);

    // Aggregate by time control
    const byTimeControl = this.aggregateByTimeControl(timeControlData);

    Sentry.addBreadcrumb({
      category: 'stats',
      message: 'Calculated user statistics',
      data: { userId, totalGames },
    });

    return {
      totalGames,
      activeGames,
      finishedGames,
      wins,
      losses,
      draws,
      winRate: Math.round(winRate * 10) / 10,
      avgMovesPerGame,
      currentStreak,
      byDifficulty,
      byTimeControl,
    };
  }

  private calculateStreak(results: (string | null)[]): {
    type: 'win' | 'loss' | 'none';
    count: number;
  } {
    if (results.length === 0) {
      return { type: 'none', count: 0 };
    }

    const firstResult = results[0];
    if (!firstResult) {
      return { type: 'none', count: 0 };
    }

    const isWin = WIN_RESULTS.includes(firstResult);
    const isLoss = LOSS_RESULTS.includes(firstResult);

    if (!isWin && !isLoss) {
      // Most recent game was a draw - no streak
      return { type: 'none', count: 0 };
    }

    const streakType = isWin ? 'win' : 'loss';
    const streakResults = isWin ? WIN_RESULTS : LOSS_RESULTS;
    let count = 0;

    for (const result of results) {
      if (result && streakResults.includes(result)) {
        count++;
      } else {
        break;
      }
    }

    return { type: streakType, count };
  }

  private aggregateByDifficulty(
    data: { difficultyLevel: number; result: string; count: number }[]
  ): DifficultyStats[] {
    const map = new Map<number, DifficultyStats>();

    for (const row of data) {
      if (!map.has(row.difficultyLevel)) {
        map.set(row.difficultyLevel, {
          level: row.difficultyLevel,
          total: 0,
          wins: 0,
          losses: 0,
          draws: 0,
        });
      }
      const entry = map.get(row.difficultyLevel)!;
      entry.total += row.count;
      if (WIN_RESULTS.includes(row.result)) {
        entry.wins += row.count;
      } else if (LOSS_RESULTS.includes(row.result)) {
        entry.losses += row.count;
      } else {
        entry.draws += row.count;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.level - b.level);
  }

  private aggregateByTimeControl(
    data: { timeControlType: string; result: string; count: number }[]
  ): TimeControlStats[] {
    const map = new Map<string, TimeControlStats>();

    for (const row of data) {
      if (!map.has(row.timeControlType)) {
        map.set(row.timeControlType, {
          type: row.timeControlType,
          total: 0,
          wins: 0,
        });
      }
      const entry = map.get(row.timeControlType)!;
      entry.total += row.count;
      if (WIN_RESULTS.includes(row.result)) {
        entry.wins += row.count;
      }
    }

    return Array.from(map.values());
  }
}
