import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { createGameSchema, makeMoveSchema } from '@chess-website/shared';
import { ZodError } from 'zod';

export class GameController extends BaseController {
  async createGame(req: Request, res: Response): Promise<void> {
    try {
      const input = createGameSchema.parse(req.body);

      // TODO: Implement game creation with GameService
      this.handleSuccess(
        res,
        {
          message: 'Game creation endpoint',
          input,
        },
        'Game created successfully',
        201
      );
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

  async listGames(_req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement with GameService
      this.handleSuccess(res, { games: [] });
    } catch (error) {
      this.handleError(error, res, 'GameController.listGames');
    }
  }

  async getGame(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      // TODO: Implement with GameService
      this.handleSuccess(res, { gameId, message: 'Get game endpoint' });
    } catch (error) {
      this.handleError(error, res, 'GameController.getGame');
    }
  }

  async makeMove(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;
      const moveInput = makeMoveSchema.parse(req.body);

      // TODO: Implement with GameService
      this.handleSuccess(res, {
        gameId,
        move: moveInput,
        message: 'Make move endpoint',
      });
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
      this.handleError(error, res, 'GameController.makeMove');
    }
  }

  async saveGame(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      // TODO: Implement with GameService
      this.handleSuccess(res, { gameId, message: 'Save game endpoint' });
    } catch (error) {
      this.handleError(error, res, 'GameController.saveGame');
    }
  }

  async resignGame(req: Request, res: Response): Promise<void> {
    try {
      const { gameId } = req.params;

      // TODO: Implement with GameService
      this.handleSuccess(res, { gameId, message: 'Resign game endpoint' });
    } catch (error) {
      this.handleError(error, res, 'GameController.resignGame');
    }
  }
}
