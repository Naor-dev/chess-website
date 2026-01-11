import { PrismaClient, Game, GameStatus } from '@prisma/client';
import * as Sentry from '@sentry/node';

// Type aliases for cleaner API
export type CreateGameData = {
  userId: string;
  difficultyLevel: number;
  timeControlType: string;
  currentFen: string;
  timeLeftUser: number;
  timeLeftEngine: number;
};

export type UpdateGameData = Partial<
  Pick<
    Game,
    | 'currentFen'
    | 'movesHistory'
    | 'timeLeftUser'
    | 'timeLeftEngine'
    | 'status'
    | 'result'
  >
>;

// Re-export Prisma types for use by services
export { Game, GameStatus };

export class GameRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateGameData): Promise<Game> {
    Sentry.addBreadcrumb({
      message: 'Creating game in database',
      category: 'database',
      data: { userId: data.userId },
    });

    return this.prisma.game.create({
      data: {
        ...data,
        movesHistory: [],
        status: GameStatus.ACTIVE,
      },
    });
  }

  async findById(gameId: string): Promise<Game | null> {
    return this.prisma.game.findUnique({
      where: { id: gameId },
    });
  }

  async findByIdAndUserId(
    gameId: string,
    userId: string
  ): Promise<Game | null> {
    return this.prisma.game.findFirst({
      where: {
        id: gameId,
        userId,
      },
    });
  }

  async findByUserId(userId: string): Promise<Game[]> {
    return this.prisma.game.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findActiveByUserId(userId: string): Promise<Game[]> {
    return this.prisma.game.findMany({
      where: {
        userId,
        status: GameStatus.ACTIVE,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async update(gameId: string, data: UpdateGameData): Promise<Game> {
    Sentry.addBreadcrumb({
      message: 'Updating game in database',
      category: 'database',
      data: { gameId, fields: Object.keys(data) },
    });

    return this.prisma.game.update({
      where: { id: gameId },
      data,
    });
  }

  async addMove(gameId: string, move: string, newFen: string): Promise<Game> {
    const game = await this.findById(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    return this.prisma.game.update({
      where: { id: gameId },
      data: {
        movesHistory: [...game.movesHistory, move],
        currentFen: newFen,
      },
    });
  }

  async finishGame(gameId: string, result: string): Promise<Game> {
    Sentry.addBreadcrumb({
      message: 'Finishing game',
      category: 'database',
      data: { gameId, result },
    });

    return this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.FINISHED,
        result,
      },
    });
  }
}
