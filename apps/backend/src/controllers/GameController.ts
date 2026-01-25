import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { createGameSchema, makeMoveSchema, gameIdSchema } from '@chess-website/shared';
import { services } from '../services/serviceContainer';
import {
  GameNotFoundError,
  GameNotActiveError,
  NotYourTurnError,
  InvalidMoveError,
  CannotSaveFinishedGameError,
  CannotResignFinishedGameError,
  ConcurrentModificationError,
} from '../errors';

export class GameController extends BaseController {
  private gameService = services.gameService;

  async createGame(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        this.handleUnauthorized(res, 'Not authenticated');
        return;
      }

      const inputResult = createGameSchema.safeParse(req.body);
      if (!inputResult.success) {
        const details: Record<string, string[]> = {};
        inputResult.error.issues.forEach((issue) => {
          const path = issue.path.join('.') || 'body';
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        });
        this.handleValidationError(res, details);
        return;
      }

      const game = await this.gameService.createGame(userId, inputResult.data);

      this.handleSuccess(res, game, 'Game created successfully', 201);
    } catch (error) {
      this.handleError(error, res, 'GameController.createGame');
    }
  }

  async listGames(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        this.handleUnauthorized(res, 'Not authenticated');
        return;
      }

      const games = await this.gameService.listGames(userId);
      this.handleSuccess(res, { games });
    } catch (error) {
      this.handleError(error, res, 'GameController.listGames');
    }
  }

  async getGame(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        this.handleUnauthorized(res, 'Not authenticated');
        return;
      }

      const gameIdResult = gameIdSchema.safeParse(req.params.gameId);
      if (!gameIdResult.success) {
        this.handleValidationError(res, { gameId: ['Invalid game ID format'] });
        return;
      }
      const gameId = gameIdResult.data;
      const game = await this.gameService.getGame(gameId, userId);

      if (!game) {
        this.handleNotFound(res, 'Game not found');
        return;
      }

      this.handleSuccess(res, game);
    } catch (error) {
      this.handleError(error, res, 'GameController.getGame');
    }
  }

  async makeMove(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        this.handleUnauthorized(res, 'Not authenticated');
        return;
      }

      const gameIdResult = gameIdSchema.safeParse(req.params.gameId);
      if (!gameIdResult.success) {
        this.handleValidationError(res, { gameId: ['Invalid game ID format'] });
        return;
      }
      const gameId = gameIdResult.data;

      const moveResult = makeMoveSchema.safeParse(req.body);
      if (!moveResult.success) {
        const details: Record<string, string[]> = {};
        moveResult.error.issues.forEach((issue) => {
          const path = issue.path.join('.') || 'body';
          if (!details[path]) details[path] = [];
          details[path].push(issue.message);
        });
        this.handleValidationError(res, details);
        return;
      }

      const result = await this.gameService.makeMove(gameId, userId, moveResult.data);
      this.handleSuccess(res, result);
    } catch (error) {
      // Handle specific game errors using typed error classes
      if (error instanceof GameNotFoundError) {
        this.handleNotFound(res, 'Game');
        return;
      }
      if (error instanceof GameNotActiveError) {
        this.handleBadRequest(res, 'Game is not active');
        return;
      }
      if (error instanceof NotYourTurnError) {
        this.handleBadRequest(res, 'Not your turn');
        return;
      }
      if (error instanceof InvalidMoveError) {
        this.handleBadRequest(res, 'Invalid move');
        return;
      }
      if (error instanceof ConcurrentModificationError) {
        this.handleConflict(res, 'Game was modified. Please refresh and try again.');
        return;
      }
      this.handleError(error, res, 'GameController.makeMove');
    }
  }

  async saveGame(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        this.handleUnauthorized(res, 'Not authenticated');
        return;
      }

      const gameIdResult = gameIdSchema.safeParse(req.params.gameId);
      if (!gameIdResult.success) {
        this.handleValidationError(res, { gameId: ['Invalid game ID format'] });
        return;
      }
      const gameId = gameIdResult.data;
      const result = await this.gameService.saveGame(gameId, userId);

      this.handleSuccess(res, result, 'Game saved successfully');
    } catch (error) {
      // Handle specific game errors using typed error classes
      if (error instanceof GameNotFoundError) {
        this.handleNotFound(res, 'Game');
        return;
      }
      if (error instanceof CannotSaveFinishedGameError) {
        this.handleBadRequest(res, 'Cannot save a finished game');
        return;
      }
      if (error instanceof ConcurrentModificationError) {
        this.handleConflict(res, 'Game was modified. Please refresh and try again.');
        return;
      }
      this.handleError(error, res, 'GameController.saveGame');
    }
  }

  async resignGame(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        this.handleUnauthorized(res, 'Not authenticated');
        return;
      }

      const gameIdResult = gameIdSchema.safeParse(req.params.gameId);
      if (!gameIdResult.success) {
        this.handleValidationError(res, { gameId: ['Invalid game ID format'] });
        return;
      }
      const gameId = gameIdResult.data;
      const result = await this.gameService.resignGame(gameId, userId);

      this.handleSuccess(res, result, 'Game resigned successfully');
    } catch (error) {
      // Handle specific game errors using typed error classes
      if (error instanceof GameNotFoundError) {
        this.handleNotFound(res, 'Game');
        return;
      }
      if (error instanceof CannotResignFinishedGameError) {
        this.handleBadRequest(res, 'Cannot resign a finished game');
        return;
      }
      this.handleError(error, res, 'GameController.resignGame');
    }
  }
}
