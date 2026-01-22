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

  /**
   * Updates a game with optimistic locking.
   * Uses version check to detect concurrent modifications.
   * @param gameId - The game's unique identifier
   * @param expectedVersion - The version expected (from when the game was read)
   * @param data - Fields to update
   * @returns Object with success flag and updated game (if successful)
   */
  async updateWithVersion(
    gameId: string,
    expectedVersion: number,
    data: UpdateGameData
  ): Promise<{ success: boolean; game?: Game }> {
    return this.executeWithErrorHandling(
      'updateWithVersion',
      async () => {
        // Use updateMany with version check for atomic operation
        // Returns count of affected rows (0 if version mismatch)
        const result = await this.prisma.game.updateMany({
          where: {
            id: gameId,
            version: expectedVersion,
          },
          data: {
            ...data,
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          // Version mismatch - concurrent modification detected
          return { success: false };
        }

        // Fetch the updated game to return
        const game = await this.prisma.game.findUnique({
          where: { id: gameId },
        });

        return { success: true, game: game ?? undefined };
      },
      { gameId, expectedVersion }
    );
  }

  /**
   * Atomically adds a move with optimistic locking.
   * Uses version check to prevent concurrent move additions.
   * @param gameId - The game's unique identifier
   * @param expectedVersion - The version expected (from when the game was read)
   * @param move - The move in algebraic notation
   * @param newFen - The new board position after the move
   * @returns Object with success flag and updated game (if successful)
   */
  async addMoveWithVersion(
    gameId: string,
    expectedVersion: number,
    move: string,
    newFen: string
  ): Promise<{ success: boolean; game?: Game }> {
    return this.executeWithErrorHandling(
      'addMoveWithVersion',
      async () => {
        // Use a transaction to ensure atomicity of push + version increment
        const result = await this.prisma.$transaction(async (tx) => {
          // First check if version matches
          const game = await tx.game.findFirst({
            where: { id: gameId, version: expectedVersion },
          });

          if (!game) {
            return { success: false };
          }

          // Update with move and increment version
          const updated = await tx.game.update({
            where: { id: gameId },
            data: {
              movesHistory: { push: move },
              currentFen: newFen,
              version: { increment: 1 },
            },
          });

          return { success: true, game: updated };
        });

        return result;
      },
      { gameId, expectedVersion, move }
    );
  }

  /**
   * Marks a game as finished with optimistic locking.
   * Uses version check to prevent race conditions in game ending.
   * @param gameId - The game's unique identifier
   * @param expectedVersion - The version expected (from when the game was read)
   * @param result - The game result
   * @returns Object with success flag and finished game (if successful)
   */
  async finishGameWithVersion(
    gameId: string,
    expectedVersion: number,
    result: string
  ): Promise<{ success: boolean; game?: Game }> {
    return this.executeWithErrorHandling(
      'finishGameWithVersion',
      async () => {
        const updateResult = await this.prisma.game.updateMany({
          where: {
            id: gameId,
            version: expectedVersion,
          },
          data: {
            status: GameStatus.FINISHED,
            result,
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          return { success: false };
        }

        const game = await this.prisma.game.findUnique({
          where: { id: gameId },
        });

        return { success: true, game: game ?? undefined };
      },
      { gameId, expectedVersion, result }
    );
  }
}
