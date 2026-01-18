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
   */
  private toGameResponse(game: Game): GameResponse {
    const chess = new Chess(game.currentFen);
    return {
      id: game.id,
      userId: game.userId,
      status: game.status.toLowerCase() as 'active' | 'finished' | 'abandoned',
      difficultyLevel: game.difficultyLevel as 1 | 2 | 3 | 4 | 5,
      timeControlType: game.timeControlType as GameResponse['timeControlType'],
      currentFen: game.currentFen,
      movesHistory: game.movesHistory,
      timeLeftUser: game.timeLeftUser,
      timeLeftEngine: game.timeLeftEngine,
      result: game.result as GameResponse['result'],
      currentTurn: chess.turn(),
      isCheck: chess.isCheck(),
      isGameOver: chess.isGameOver(),
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
    const game = await this.gameRepository.create({
      userId,
      difficultyLevel: input.difficultyLevel,
      timeControlType: input.timeControlType,
      currentFen: STARTING_FEN,
      timeLeftUser: timeConfig.initialTime,
      timeLeftEngine: timeConfig.initialTime,
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

    // 3. Apply move
    const moveResult = chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });

    if (!moveResult) {
      throw new Error('Invalid move');
    }

    // 4. Check for game end after user move
    const gameEndCheck = this.checkGameEnd(chess);

    if (gameEndCheck.isOver) {
      // Game ended after user's move - update and return
      const finishedGame = await this.gameRepository.finishGame(gameId, gameEndCheck.result!);
      // Also update the FEN and moves history
      await this.gameRepository.addMove(gameId, moveResult.san, chess.fen());

      return {
        success: true,
        game: this.toGameResponse({
          ...finishedGame,
          currentFen: chess.fen(),
          movesHistory: [...game.movesHistory, moveResult.san],
        }),
      };
    }

    // 5. Update database with user's move
    await this.gameRepository.addMove(gameId, moveResult.san, chess.fen());

    // 6. Get engine move if engine service is available
    let engineMoveResult: MoveResponse['engineMove'] | undefined;

    if (this.engineService) {
      try {
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

        // 7. Apply engine move
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

        // 8. Check for game end after engine move
        const engineGameEndCheck = this.checkGameEnd(chess);

        if (engineGameEndCheck.isOver) {
          // Game ended after engine's move
          const finishedGame = await this.gameRepository.finishGame(
            gameId,
            engineGameEndCheck.result!
          );
          await this.gameRepository.addMove(gameId, engineMove.san, chess.fen());

          return {
            success: true,
            game: this.toGameResponse({
              ...finishedGame,
              currentFen: chess.fen(),
              movesHistory: [...game.movesHistory, moveResult.san, engineMove.san],
            }),
            engineMove: {
              from: engineResult.move.from,
              to: engineResult.move.to,
              promotion: engineResult.move.promotion,
              san: engineMove.san,
            },
          };
        }

        // 9. Save engine move to database
        await this.gameRepository.addMove(gameId, engineMove.san, chess.fen());

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
        // Continue without engine move - user's move was already saved
      }
    }

    // 10. Return updated game state
    const updatedGame = await this.gameRepository.findById(gameId);
    if (!updatedGame) {
      throw new Error('Failed to fetch updated game');
    }

    return {
      success: true,
      game: this.toGameResponse(updatedGame),
      engineMove: engineMoveResult,
    };
  }

  async saveGame(gameId: string, userId: string): Promise<void> {
    Sentry.addBreadcrumb({
      message: 'Saving game',
      category: 'game',
      data: { gameId, userId },
    });

    // TODO: Implement
    // Game auto-saves on each move, this is just explicit save confirmation

    throw new Error('GameService.saveGame not implemented');
  }

  async resignGame(gameId: string, userId: string): Promise<GameResponse> {
    Sentry.addBreadcrumb({
      message: 'Resigning game',
      category: 'game',
      data: { gameId, userId },
    });

    // TODO: Implement
    // 1. Fetch game, verify ownership
    // 2. Update status to FINISHED
    // 3. Set result to user_resigned

    throw new Error('GameService.resignGame not implemented');
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
    if (chess.isDraw()) {
      return { isOver: true, result: 'draw_fifty_moves' };
    }
    if (chess.isInsufficientMaterial()) {
      return { isOver: true, result: 'draw_insufficient_material' };
    }
    return { isOver: false };
  }
}
