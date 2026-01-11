import * as Sentry from '@sentry/node';
import { Chess } from 'chess.js';
import type {
  CreateGameInput,
  MakeMoveInput,
  GameResponse,
  GameListItem,
  MoveResponse,
} from '@chess-website/shared';
import { GameRepository } from '../repositories/GameRepository';

export class GameService {
  constructor(private readonly gameRepository: GameRepository) {
    // Ensure repository is used (prevents TS6138)
    void this.gameRepository;
  }

  async createGame(userId: string, input: CreateGameInput): Promise<GameResponse> {
    Sentry.addBreadcrumb({
      message: 'Creating new game',
      category: 'game',
      data: { userId, ...input },
    });

    // TODO: Implement actual game creation
    // 1. Get time control config from TIME_CONTROL_CONFIGS
    // 2. Create game record in database
    // 3. Return formatted response

    throw new Error('GameService.createGame not implemented');
  }

  async getGame(gameId: string, userId: string): Promise<GameResponse | null> {
    Sentry.addBreadcrumb({
      message: 'Fetching game',
      category: 'game',
      data: { gameId, userId },
    });

    // TODO: Implement
    // 1. Fetch game from repository
    // 2. Verify ownership
    // 3. Calculate current turn, check status
    // 4. Return formatted response

    throw new Error('GameService.getGame not implemented');
  }

  async listGames(userId: string): Promise<GameListItem[]> {
    Sentry.addBreadcrumb({
      message: 'Listing games',
      category: 'game',
      data: { userId },
    });

    // TODO: Implement
    // 1. Fetch games from repository
    // 2. Map to GameListItem format

    throw new Error('GameService.listGames not implemented');
  }

  async makeMove(gameId: string, userId: string, move: MakeMoveInput): Promise<MoveResponse> {
    Sentry.addBreadcrumb({
      message: 'Making move',
      category: 'game',
      data: { gameId, userId, move },
    });

    // TODO: Implement
    // 1. Fetch game, verify ownership and active status
    // 2. Validate move with chess.js
    // 3. Apply move, update FEN
    // 4. Check for game end conditions
    // 5. If game continues, get engine move
    // 6. Update database
    // 7. Return response with both moves

    throw new Error('GameService.makeMove not implemented');
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
