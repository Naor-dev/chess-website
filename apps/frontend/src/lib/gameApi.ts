import apiClient from './apiClient';
import type {
  CreateGameRequest,
  GameResponse,
  GameListItem,
  MakeMoveRequest,
  MoveResponse,
} from '@chess-website/shared';

/**
 * API service for game operations.
 */
export const gameApi = {
  /**
   * Create a new game.
   * @param input - Game creation parameters
   * @returns Created game data
   */
  async createGame(input: CreateGameRequest): Promise<GameResponse> {
    const response = await apiClient.post<{ success: boolean; data: GameResponse }>(
      '/games',
      input
    );
    return response.data.data;
  },

  /**
   * Get a specific game by ID.
   * @param gameId - The game's unique identifier
   * @returns Game data if found
   */
  async getGame(gameId: string): Promise<GameResponse> {
    const response = await apiClient.get<{ success: boolean; data: GameResponse }>(
      `/games/${gameId}`
    );
    return response.data.data;
  },

  /**
   * List all games for the current user.
   * @returns Array of game list items
   */
  async listGames(): Promise<GameListItem[]> {
    const response = await apiClient.get<{ success: boolean; data: { games: GameListItem[] } }>(
      '/games'
    );
    return response.data.data.games;
  },

  /**
   * Make a move in a game.
   * @param gameId - The game's unique identifier
   * @param move - The move to make (from, to, optional promotion)
   * @returns Move response with updated game state
   */
  async makeMove(gameId: string, move: MakeMoveRequest): Promise<MoveResponse> {
    const response = await apiClient.post<{ success: boolean; data: MoveResponse }>(
      `/games/${gameId}/move`,
      move
    );
    return response.data.data;
  },
};
