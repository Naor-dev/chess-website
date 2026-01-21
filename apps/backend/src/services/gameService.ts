import * as Sentry from '@sentry/node';
import { Chess } from 'chess.js';
import type {
  CreateGameInput,
  MakeMoveInput,
  GameResponse,
  GameListItem,
  MoveResponse,
  DifficultyLevel,
} from '@chess-website/shared';
import { TIME_CONTROL_CONFIGS, STARTING_FEN } from '@chess-website/shared';
import { GameRepository, Game } from '../repositories/GameRepository';
import type { EngineService } from './engineService';

export class GameService {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly engineService?: EngineService
  ) {}

  /**
   * Converts a database Game entity to a GameResponse.
   * Optionally accepts overridden time values for real-time calculations.
   */
  private toGameResponse(
    game: Game,
    overrides?: { timeLeftUser?: number; timeLeftEngine?: number }
  ): GameResponse {
    const chess = new Chess(game.currentFen);
    return {
      id: game.id,
      userId: game.userId,
      status: game.status.toLowerCase() as 'active' | 'finished' | 'abandoned',
      difficultyLevel: game.difficultyLevel as 1 | 2 | 3 | 4 | 5,
      timeControlType: game.timeControlType as GameResponse['timeControlType'],
      currentFen: game.currentFen,
      movesHistory: game.movesHistory,
      timeLeftUser: overrides?.timeLeftUser ?? game.timeLeftUser,
      timeLeftEngine: overrides?.timeLeftEngine ?? game.timeLeftEngine,
      turnStartedAt: game.turnStartedAt?.toISOString() ?? null,
      result: game.result as GameResponse['result'],
      currentTurn: chess.turn(),
      isCheck: chess.isCheck(),
      isGameOver: chess.isGameOver() || game.status !== 'ACTIVE',
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
    };
  }

  /**
   * Converts a database Game entity to a GameListItem.
   */
  private toGameListItem(game: Game): GameListItem {
    const chess = new Chess(game.currentFen);
    return {
      id: game.id,
      status: game.status.toLowerCase() as 'active' | 'finished' | 'abandoned',
      difficultyLevel: game.difficultyLevel as 1 | 2 | 3 | 4 | 5,
      timeControlType: game.timeControlType as GameListItem['timeControlType'],
      result: game.result as GameListItem['result'],
      currentTurn: chess.turn(),
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
    };
  }

  async createGame(userId: string, input: CreateGameInput): Promise<GameResponse> {
    Sentry.addBreadcrumb({
      message: 'Creating new game',
      category: 'game',
      data: { userId, ...input },
    });

    // Get time control config
    const timeConfig = TIME_CONTROL_CONFIGS[input.timeControlType];

    // Create game in database
    // Set turnStartedAt for games with time control (user moves first)
    const game = await this.gameRepository.create({
      userId,
      difficultyLevel: input.difficultyLevel,
      timeControlType: input.timeControlType,
      currentFen: STARTING_FEN,
      timeLeftUser: timeConfig.initialTime,
      timeLeftEngine: timeConfig.initialTime,
      turnStartedAt: input.timeControlType !== 'none' ? new Date() : null,
    });

    return this.toGameResponse(game);
  }

  async getGame(gameId: string, userId: string): Promise<GameResponse | null> {
    Sentry.addBreadcrumb({
      message: 'Fetching game',
      category: 'game',
      data: { gameId, userId },
    });

    // Fetch game with ownership verification
    const game = await this.gameRepository.findByIdAndUserId(gameId, userId);
    if (!game) {
      return null;
    }

    // For active games with time control, check for timeout
    if (game.status === 'ACTIVE' && game.timeControlType !== 'none' && game.turnStartedAt) {
      const chess = new Chess(game.currentFen);
      const currentTurn = chess.turn();
      const timeoutCheck = this.checkTimeout(game, currentTurn);

      if (timeoutCheck.isTimeout) {
        // Auto-finish the game due to timeout
        Sentry.addBreadcrumb({
          message: 'Game timeout detected on fetch',
          category: 'game',
          data: { gameId, result: timeoutCheck.result },
        });

        const finishedGame = await this.gameRepository.finishGame(gameId, timeoutCheck.result!);
        await this.gameRepository.update(gameId, {
          timeLeftUser: timeoutCheck.timeLeftUser,
          timeLeftEngine: timeoutCheck.timeLeftEngine,
          turnStartedAt: null,
        });

        return this.toGameResponse(finishedGame, {
          timeLeftUser: timeoutCheck.timeLeftUser,
          timeLeftEngine: timeoutCheck.timeLeftEngine,
        });
      }

      // Return game with calculated current times
      return this.toGameResponse(game, {
        timeLeftUser: timeoutCheck.timeLeftUser,
        timeLeftEngine: timeoutCheck.timeLeftEngine,
      });
    }

    return this.toGameResponse(game);
  }

  async listGames(userId: string): Promise<GameListItem[]> {
    Sentry.addBreadcrumb({
      message: 'Listing games',
      category: 'game',
      data: { userId },
    });

    const games = await this.gameRepository.findByUserId(userId);
    return games.map((game) => this.toGameListItem(game));
  }

  async makeMove(gameId: string, userId: string, move: MakeMoveInput): Promise<MoveResponse> {
    Sentry.addBreadcrumb({
      message: 'Making move',
      category: 'game',
      data: { gameId, userId, move },
    });

    // 1. Fetch game, verify ownership and active status
    const game = await this.gameRepository.findByIdAndUserId(gameId, userId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'ACTIVE') {
      throw new Error('Game is not active');
    }

    // 2. Validate move with chess.js
    const chess = new Chess(game.currentFen);

    // Verify it's the user's turn (white)
    if (chess.turn() !== 'w') {
      throw new Error('Not your turn');
    }

    // 3. Check for timeout BEFORE processing move
    const timeoutCheck = this.checkTimeout(game, 'w');
    if (timeoutCheck.isTimeout) {
      // User ran out of time before making their move
      Sentry.addBreadcrumb({
        message: 'User timeout detected on move',
        category: 'game',
        data: { gameId, result: timeoutCheck.result },
      });

      const finishedGame = await this.gameRepository.finishGame(gameId, timeoutCheck.result!);
      await this.gameRepository.update(gameId, {
        timeLeftUser: 0,
        turnStartedAt: null,
      });

      return {
        success: true,
        game: this.toGameResponse(finishedGame, {
          timeLeftUser: 0,
          timeLeftEngine: timeoutCheck.timeLeftEngine,
        }),
      };
    }

    // 4. Apply move
    const moveResult = chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });

    if (!moveResult) {
      throw new Error('Invalid move');
    }

    // 5. Calculate new time for user (deduct elapsed + add increment)
    let newTimeLeftUser = timeoutCheck.timeLeftUser;
    newTimeLeftUser = this.applyIncrement(newTimeLeftUser, game.timeControlType);

    // 6. Check for game end after user move
    const gameEndCheck = this.checkGameEnd(chess);

    if (gameEndCheck.isOver) {
      // Game ended after user's move - update and return
      const finishedGame = await this.gameRepository.finishGame(gameId, gameEndCheck.result!);
      await this.gameRepository.addMove(gameId, moveResult.san, chess.fen());
      await this.gameRepository.update(gameId, {
        timeLeftUser: newTimeLeftUser,
        turnStartedAt: null, // Game over, no turn
      });

      return {
        success: true,
        game: this.toGameResponse(
          {
            ...finishedGame,
            currentFen: chess.fen(),
            movesHistory: [...game.movesHistory, moveResult.san],
          },
          { timeLeftUser: newTimeLeftUser }
        ),
      };
    }

    // 7. Update database with user's move and switch turn to engine
    const engineTurnStartedAt = game.timeControlType !== 'none' ? new Date() : null;
    await this.gameRepository.addMove(gameId, moveResult.san, chess.fen());
    await this.gameRepository.update(gameId, {
      timeLeftUser: newTimeLeftUser,
      turnStartedAt: engineTurnStartedAt,
    });

    // 8. Get engine move if engine service is available
    let engineMoveResult: MoveResponse['engineMove'] | undefined;
    let newTimeLeftEngine = game.timeLeftEngine;

    if (this.engineService) {
      try {
        const engineStartTime = Date.now();

        Sentry.addBreadcrumb({
          message: 'Requesting engine move',
          category: 'game',
          data: { fen: chess.fen(), difficulty: game.difficultyLevel },
        });

        const engineResult = await this.engineService.getEngineMove(
          chess.fen(),
          game.difficultyLevel as DifficultyLevel,
          [...game.movesHistory, moveResult.san]
        );

        // 9. Calculate engine's elapsed time and check for timeout
        if (game.timeControlType !== 'none') {
          const engineElapsed = Date.now() - engineStartTime;
          newTimeLeftEngine = Math.max(0, game.timeLeftEngine - engineElapsed);

          if (newTimeLeftEngine <= 0) {
            // Engine timed out
            Sentry.addBreadcrumb({
              message: 'Engine timeout detected',
              category: 'game',
              data: { gameId, engineElapsed },
            });

            const finishedGame = await this.gameRepository.finishGame(gameId, 'user_win_timeout');
            await this.gameRepository.update(gameId, {
              timeLeftEngine: 0,
              turnStartedAt: null,
            });

            return {
              success: true,
              game: this.toGameResponse(
                {
                  ...finishedGame,
                  currentFen: chess.fen(),
                  movesHistory: [...game.movesHistory, moveResult.san],
                },
                { timeLeftUser: newTimeLeftUser, timeLeftEngine: 0 }
              ),
            };
          }

          // Apply increment to engine
          newTimeLeftEngine = this.applyIncrement(newTimeLeftEngine, game.timeControlType);
        }

        // 10. Apply engine move
        const engineMove = chess.move({
          from: engineResult.move.from,
          to: engineResult.move.to,
          promotion: engineResult.move.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
        });

        if (!engineMove) {
          Sentry.captureMessage('Engine returned invalid move', {
            level: 'error',
            extra: { engineResult, fen: chess.fen() },
          });
          throw new Error('Engine returned invalid move');
        }

        // 11. Check for game end after engine move
        const engineGameEndCheck = this.checkGameEnd(chess);

        if (engineGameEndCheck.isOver) {
          // Game ended after engine's move
          const finishedGame = await this.gameRepository.finishGame(
            gameId,
            engineGameEndCheck.result!
          );
          await this.gameRepository.addMove(gameId, engineMove.san, chess.fen());
          await this.gameRepository.update(gameId, {
            timeLeftEngine: newTimeLeftEngine,
            turnStartedAt: null,
          });

          return {
            success: true,
            game: this.toGameResponse(
              {
                ...finishedGame,
                currentFen: chess.fen(),
                movesHistory: [...game.movesHistory, moveResult.san, engineMove.san],
              },
              { timeLeftUser: newTimeLeftUser, timeLeftEngine: newTimeLeftEngine }
            ),
            engineMove: {
              from: engineResult.move.from,
              to: engineResult.move.to,
              promotion: engineResult.move.promotion,
              san: engineMove.san,
            },
          };
        }

        // 12. Save engine move and switch turn back to user
        const userTurnStartedAt = game.timeControlType !== 'none' ? new Date() : null;
        await this.gameRepository.addMove(gameId, engineMove.san, chess.fen());
        await this.gameRepository.update(gameId, {
          timeLeftEngine: newTimeLeftEngine,
          turnStartedAt: userTurnStartedAt,
        });

        engineMoveResult = {
          from: engineResult.move.from,
          to: engineResult.move.to,
          promotion: engineResult.move.promotion,
          san: engineMove.san,
        };
      } catch (error) {
        // Log engine error but don't fail the user's move
        Sentry.captureException(error, {
          extra: { gameId, fen: chess.fen() },
        });
        // Revert to user's turn since engine failed
        const userTurnStartedAt = game.timeControlType !== 'none' ? new Date() : null;
        await this.gameRepository.update(gameId, {
          turnStartedAt: userTurnStartedAt,
        });
        // Continue without engine move - user's move was already saved
      }
    }

    // 13. Return updated game state
    const updatedGame = await this.gameRepository.findById(gameId);
    if (!updatedGame) {
      throw new Error('Failed to fetch updated game');
    }

    return {
      success: true,
      game: this.toGameResponse(updatedGame, {
        timeLeftUser: newTimeLeftUser,
        timeLeftEngine: newTimeLeftEngine,
      }),
      engineMove: engineMoveResult,
    };
  }

  async saveGame(gameId: string, userId: string): Promise<{ savedAt: string }> {
    Sentry.addBreadcrumb({
      message: 'Saving game',
      category: 'game',
      data: { gameId, userId },
    });

    // Verify game ownership
    const game = await this.gameRepository.findByIdAndUserId(gameId, userId);
    if (!game) {
      throw new Error('Game not found');
    }

    // Verify game is active (can't save a finished game)
    if (game.status !== 'ACTIVE') {
      throw new Error('Cannot save a finished game');
    }

    // Sync time on save for games with time control
    // This ensures accurate time when user explicitly saves or tab becomes visible
    if (game.timeControlType !== 'none' && game.turnStartedAt) {
      const chess = new Chess(game.currentFen);
      const currentTurn = chess.turn();
      const now = new Date();
      const elapsed = now.getTime() - game.turnStartedAt.getTime();

      // Deduct elapsed time from current player and reset turn timer
      if (currentTurn === 'w') {
        await this.gameRepository.update(gameId, {
          timeLeftUser: Math.max(0, game.timeLeftUser - elapsed),
          turnStartedAt: now,
        });
      } else {
        await this.gameRepository.update(gameId, {
          timeLeftEngine: Math.max(0, game.timeLeftEngine - elapsed),
          turnStartedAt: now,
        });
      }
    } else {
      // No time control - just touch the updatedAt timestamp
      await this.gameRepository.update(gameId, {});
    }

    return { savedAt: new Date().toISOString() };
  }

  async resignGame(gameId: string, userId: string): Promise<GameResponse> {
    Sentry.addBreadcrumb({
      message: 'Resigning game',
      category: 'game',
      data: { gameId, userId },
    });

    // 1. Fetch game with ownership verification
    const game = await this.gameRepository.findByIdAndUserId(gameId, userId);
    if (!game) {
      throw new Error('Game not found');
    }

    // 2. Verify game is active (can't resign a finished game)
    if (game.status !== 'ACTIVE') {
      throw new Error('Cannot resign a finished game');
    }

    // 3. Finish game with resign result
    const finishedGame = await this.gameRepository.finishGame(gameId, 'user_resigned');

    // 4. Clear turn timer (game is over, no one's turn)
    await this.gameRepository.update(gameId, { turnStartedAt: null });

    return this.toGameResponse(finishedGame);
  }

  validateMove(fen: string, move: MakeMoveInput): boolean {
    const chess = new Chess(fen);
    try {
      const result = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      return result !== null;
    } catch {
      return false;
    }
  }

  checkGameEnd(chess: Chess): {
    isOver: boolean;
    result?: string;
  } {
    if (chess.isCheckmate()) {
      return {
        isOver: true,
        result: chess.turn() === 'w' ? 'engine_win_checkmate' : 'user_win_checkmate',
      };
    }
    if (chess.isStalemate()) {
      return { isOver: true, result: 'draw_stalemate' };
    }
    if (chess.isThreefoldRepetition()) {
      return { isOver: true, result: 'draw_repetition' };
    }
    if (chess.isInsufficientMaterial()) {
      return { isOver: true, result: 'draw_insufficient_material' };
    }
    if (chess.isDrawByFiftyMoves()) {
      return { isOver: true, result: 'draw_fifty_moves' };
    }
    return { isOver: false };
  }

  /**
   * Checks if the current player has timed out and calculates updated time values.
   * @param game - The game to check
   * @param currentTurn - Whose turn it is ('w' for user, 'b' for engine)
   * @returns Timeout status and updated time values
   */
  private checkTimeout(
    game: Game,
    currentTurn: 'w' | 'b'
  ): {
    isTimeout: boolean;
    result?: string;
    timeLeftUser: number;
    timeLeftEngine: number;
  } {
    // No timeout check for games without time control
    if (game.timeControlType === 'none' || !game.turnStartedAt) {
      return {
        isTimeout: false,
        timeLeftUser: game.timeLeftUser,
        timeLeftEngine: game.timeLeftEngine,
      };
    }

    const now = new Date();
    const elapsed = now.getTime() - game.turnStartedAt.getTime();

    let timeLeftUser = game.timeLeftUser;
    let timeLeftEngine = game.timeLeftEngine;

    // Deduct elapsed time from the current player's clock
    if (currentTurn === 'w') {
      timeLeftUser = Math.max(0, game.timeLeftUser - elapsed);
      if (timeLeftUser <= 0) {
        return {
          isTimeout: true,
          result: 'engine_win_timeout',
          timeLeftUser: 0,
          timeLeftEngine,
        };
      }
    } else {
      timeLeftEngine = Math.max(0, game.timeLeftEngine - elapsed);
      if (timeLeftEngine <= 0) {
        return {
          isTimeout: true,
          result: 'user_win_timeout',
          timeLeftUser,
          timeLeftEngine: 0,
        };
      }
    }

    return { isTimeout: false, timeLeftUser, timeLeftEngine };
  }

  /**
   * Applies time increment to a player's remaining time.
   * @param timeLeft - Current time remaining in milliseconds
   * @param timeControlType - The time control type
   * @returns Updated time with increment added
   */
  private applyIncrement(timeLeft: number, timeControlType: string): number {
    const timeConfig = TIME_CONTROL_CONFIGS[timeControlType as keyof typeof TIME_CONTROL_CONFIGS];
    if (timeConfig && timeConfig.increment > 0) {
      return timeLeft + timeConfig.increment;
    }
    return timeLeft;
  }
}
