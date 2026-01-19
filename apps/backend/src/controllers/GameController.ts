import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { createGameSchema, makeMoveSchema } from '@chess-website/shared';
import { ZodError } from 'zod';
import { services } from '../services/serviceContainer';

export class GameController extends BaseController {
  private gameService = services.gameService;

  async createGame(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        this.handleUnauthorized(res, 'Not authenticated');
        return;
      }

      const input = createGameSchema.parse(req.body);
      const game = await this.gameService.createGame(userId, input);

      this.handleSuccess(res, game, 'Game created successfully', 201);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(err.message);
        });
        this.handleValidationError(res, details);
        return;
      }
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

      const gameId = req.params.gameId as string;
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

      const gameId = req.params.gameId as string;
      const moveInput = makeMoveSchema.parse(req.body);

      const result = await this.gameService.makeMove(gameId, userId, moveInput);
      this.handleSuccess(res, result);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!details[path]) details[path] = [];
          details[path].push(err.message);
        });
        this.handleValidationError(res, details);
        return;
      }
      // Handle specific game errors
      if (error instanceof Error) {
        if (error.message === 'Game not found') {
          this.handleNotFound(res, 'Game not found');
          return;
        }
        if (
          error.message === 'Game is not active' ||
          error.message === 'Not your turn' ||
          error.message === 'Invalid move'
        ) {
          res.status(400).json({ success: false, error: error.message });
          return;
        }
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

      const gameId = req.params.gameId as string;
      const result = await this.gameService.saveGame(gameId, userId);

      this.handleSuccess(res, result, 'Game saved successfully');
    } catch (error) {
      // Handle specific game errors
      if (error instanceof Error) {
        if (error.message === 'Game not found') {
          this.handleNotFound(res, 'Game not found');
          return;
        }
        if (error.message === 'Cannot save a finished game') {
          res.status(400).json({ success: false, error: error.message });
          return;
        }
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

      const gameId = req.params.gameId as string;
      const result = await this.gameService.resignGame(gameId, userId);

      this.handleSuccess(res, result, 'Game resigned successfully');
    } catch (error) {
      // Handle specific game errors
      if (error instanceof Error) {
        if (error.message === 'Game not found') {
          this.handleNotFound(res, 'Game not found');
          return;
        }
        if (error.message === 'Cannot resign a finished game') {
          res.status(400).json({ success: false, error: error.message });
          return;
        }
      }
      this.handleError(error, res, 'GameController.resignGame');
    }
  }
}
