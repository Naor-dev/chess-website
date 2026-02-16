import { PrismaClient, GameStatus, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

interface AvgMovesResult {
  avg: bigint | Prisma.Decimal | null;
}

const WIN_RESULTS = ['user_win_checkmate', 'user_win_timeout'];
const LOSS_RESULTS = ['engine_win_checkmate', 'engine_win_timeout', 'user_resigned'];

export class StatsRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma, 'StatsRepository');
  }

  async getGameCountsByStatus(userId: string): Promise<{ status: GameStatus; count: number }[]> {
    return this.executeWithErrorHandling(
      'getGameCountsByStatus',
      async () => {
        const results = await this.prisma.game.groupBy({
          by: ['status'],
          where: { userId },
          _count: { status: true },
        });
        return results.map((r) => ({
          status: r.status,
          count: r._count.status,
        }));
      },
      { userId }
    );
  }

  async getResultCounts(userId: string): Promise<{ result: string; count: number }[]> {
    return this.executeWithErrorHandling(
      'getResultCounts',
      async () => {
        const results = await this.prisma.game.groupBy({
          by: ['result'],
          where: {
            userId,
            status: GameStatus.FINISHED,
            result: { not: null },
          },
          _count: { result: true },
        });
        return results.map((r) => ({
          result: r.result as string,
          count: r._count.result,
        }));
      },
      { userId }
    );
  }

  async getStatsByDifficulty(
    userId: string
  ): Promise<{ difficultyLevel: number; result: string; count: number }[]> {
    return this.executeWithErrorHandling(
      'getStatsByDifficulty',
      async () => {
        const results = await this.prisma.game.groupBy({
          by: ['difficultyLevel', 'result'],
          where: {
            userId,
            status: GameStatus.FINISHED,
            result: { not: null },
          },
          _count: { _all: true },
        });
        return results.map((r) => ({
          difficultyLevel: r.difficultyLevel,
          result: r.result as string,
          count: r._count._all,
        }));
      },
      { userId }
    );
  }

  async getStatsByTimeControl(
    userId: string
  ): Promise<{ timeControlType: string; result: string; count: number }[]> {
    return this.executeWithErrorHandling(
      'getStatsByTimeControl',
      async () => {
        const results = await this.prisma.game.groupBy({
          by: ['timeControlType', 'result'],
          where: {
            userId,
            status: GameStatus.FINISHED,
            result: { not: null },
          },
          _count: { _all: true },
        });
        return results.map((r) => ({
          timeControlType: r.timeControlType,
          result: r.result as string,
          count: r._count._all,
        }));
      },
      { userId }
    );
  }

  async getAvgMoves(userId: string): Promise<number> {
    return this.executeWithErrorHandling(
      'getAvgMoves',
      async () => {
        // Use @map column/table names in raw SQL, not Prisma model names
        const result = await this.prisma.$queryRaw<AvgMovesResult[]>`
          SELECT AVG(COALESCE(array_length("moves_history", 1), 0)) as avg
          FROM "games"
          WHERE "user_id" = ${userId} AND "status" = 'FINISHED'
        `;
        // $queryRaw returns bigint/Decimal, explicitly convert
        return result[0]?.avg != null ? Number(result[0].avg) : 0;
      },
      { userId }
    );
  }

  async getRecentFinishedGames(
    userId: string,
    limit: number = 50
  ): Promise<{ result: string | null; updatedAt: Date }[]> {
    return this.executeWithErrorHandling(
      'getRecentFinishedGames',
      async () => {
        return this.prisma.game.findMany({
          where: {
            userId,
            status: GameStatus.FINISHED,
            result: { not: null },
          },
          select: { result: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: limit,
        });
      },
      { userId }
    );
  }
}

export { WIN_RESULTS, LOSS_RESULTS };
