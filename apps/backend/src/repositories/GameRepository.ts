import { PrismaClient } from '@prisma/client';
import * as Sentry from '@sentry/node';

// Type definitions for Game model (matches Prisma schema)
// These will be replaced by generated Prisma types after prisma generate
export interface Game {
  id: string;
  userId: string;
  status: GameStatus;
  difficultyLevel: number;
  timeControlType: string;
  currentFen: string;
  movesHistory: string[];
  timeLeftUser: number;
  timeLeftEngine: number;
  result: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum GameStatus {
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
  ABANDONED = 'ABANDONED',
}

export interface CreateGameData {
  userId: string;
  difficultyLevel: number;
  timeControlType: string;
  currentFen: string;
  timeLeftUser: number;
  timeLeftEngine: number;
}

export interface UpdateGameData {
  currentFen?: string;
  movesHistory?: string[];
  timeLeftUser?: number;
  timeLeftEngine?: number;
  status?: GameStatus;
  result?: string;
}

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
    }) as Promise<Game>;
  }

  async findById(gameId: string): Promise<Game | null> {
    return this.prisma.game.findUnique({
      where: { id: gameId },
    }) as Promise<Game | null>;
  }

  async findByIdAndUserId(gameId: string, userId: string): Promise<Game | null> {
    return this.prisma.game.findFirst({
      where: {
        id: gameId,
        userId,
      },
    }) as Promise<Game | null>;
  }

  async findByUserId(userId: string): Promise<Game[]> {
    return this.prisma.game.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    }) as Promise<Game[]>;
  }

  async findActiveByUserId(userId: string): Promise<Game[]> {
    return this.prisma.game.findMany({
      where: {
        userId,
        status: GameStatus.ACTIVE,
      },
      orderBy: { updatedAt: 'desc' },
    }) as Promise<Game[]>;
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
    }) as Promise<Game>;
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
    }) as Promise<Game>;
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
    }) as Promise<Game>;
  }
}
