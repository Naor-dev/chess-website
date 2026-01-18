import { PrismaClient, Game, GameStatus } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

/** Data required to create a new game */
export type CreateGameData = {
  userId: string;
  difficultyLevel: number;
  timeControlType: string;
  currentFen: string;
  timeLeftUser: number;
  timeLeftEngine: number;
  turnStartedAt?: Date | null;
};

/** Data that can be updated on an existing game */
export type UpdateGameData = Partial<
  Pick<
    Game,
    | 'currentFen'
    | 'movesHistory'
    | 'timeLeftUser'
    | 'timeLeftEngine'
    | 'turnStartedAt'
    | 'status'
    | 'result'
  >
>;

// Re-export Prisma types for use by services
export { Game, GameStatus };

/**
 * Repository for game database operations.
 * Handles all CRUD operations for chess games with proper error tracking.
 */
export class GameRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma, 'GameRepository');
  }

  /**
   * Creates a new game in the database.
   * @param data - Game creation data
   * @returns The created game
   */
  async create(data: CreateGameData): Promise<Game> {
    return this.executeWithErrorHandling(
      'create',
      () =>
        this.prisma.game.create({
          data: {
            ...data,
            movesHistory: [],
            status: GameStatus.ACTIVE,
          },
        }),
      { userId: data.userId, difficultyLevel: data.difficultyLevel }
    );
  }

  /**
   * Finds a game by its ID.
   * @param gameId - The game's unique identifier
   * @returns The game or null if not found
   */
  async findById(gameId: string): Promise<Game | null> {
    return this.executeWithErrorHandling(
      'findById',
      () =>
        this.prisma.game.findUnique({
          where: { id: gameId },
        }),
      { gameId }
    );
  }

  /**
   * Finds a game by ID and verifies user ownership.
   * @param gameId - The game's unique identifier
   * @param userId - The user's unique identifier
   * @returns The game or null if not found or not owned by user
   */
  async findByIdAndUserId(gameId: string, userId: string): Promise<Game | null> {
    return this.executeWithErrorHandling(
      'findByIdAndUserId',
      () =>
        this.prisma.game.findFirst({
          where: {
            id: gameId,
            userId,
          },
        }),
      { gameId, userId }
    );
  }

  /**
   * Finds all games for a user, ordered by last update.
   * @param userId - The user's unique identifier
   * @returns Array of games
   */
  async findByUserId(userId: string): Promise<Game[]> {
    return this.executeWithErrorHandling(
      'findByUserId',
      () =>
        this.prisma.game.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
        }),
      { userId }
    );
  }

  /**
   * Finds all active games for a user.
   * @param userId - The user's unique identifier
   * @returns Array of active games
   */
  async findActiveByUserId(userId: string): Promise<Game[]> {
    return this.executeWithErrorHandling(
      'findActiveByUserId',
      () =>
        this.prisma.game.findMany({
          where: {
            userId,
            status: GameStatus.ACTIVE,
          },
          orderBy: { updatedAt: 'desc' },
        }),
      { userId }
    );
  }

  /**
   * Updates a game with new data.
   * @param gameId - The game's unique identifier
   * @param data - Fields to update
   * @returns The updated game
   */
  async update(gameId: string, data: UpdateGameData): Promise<Game> {
    return this.executeWithErrorHandling(
      'update',
      () =>
        this.prisma.game.update({
          where: { id: gameId },
          data,
        }),
      { gameId, fields: Object.keys(data) }
    );
  }

  /**
   * Atomically adds a move to the game's history.
   * Uses Prisma's push operation to avoid race conditions.
   * @param gameId - The game's unique identifier
   * @param move - The move in algebraic notation
   * @param newFen - The new board position after the move
   * @returns The updated game
   */
  async addMove(gameId: string, move: string, newFen: string): Promise<Game> {
    return this.executeWithErrorHandling(
      'addMove',
      () =>
        this.prisma.game.update({
          where: { id: gameId },
          data: {
            movesHistory: {
              push: move,
            },
            currentFen: newFen,
          },
        }),
      { gameId, move }
    );
  }

  /**
   * Marks a game as finished with a result.
   * @param gameId - The game's unique identifier
   * @param result - The game result (e.g., 'user_win_checkmate', 'draw_stalemate')
   * @returns The finished game
   */
  async finishGame(gameId: string, result: string): Promise<Game> {
    return this.executeWithErrorHandling(
      'finishGame',
      () =>
        this.prisma.game.update({
          where: { id: gameId },
          data: {
            status: GameStatus.FINISHED,
            result,
          },
        }),
      { gameId, result }
    );
  }

  /**
   * Counts games by status for a user.
   * @param userId - The user's unique identifier
   * @returns Count of games grouped by status
   */
  async countByStatus(userId: string): Promise<{ status: GameStatus; count: number }[]> {
    return this.executeWithErrorHandling(
      'countByStatus',
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
}
