import apiClient from './apiClient';
import type { UserStatsResponse } from '@chess-website/shared';

export const statsApi = {
  async getUserStats(): Promise<UserStatsResponse> {
    const response = await apiClient.get<{ success: boolean; data: UserStatsResponse }>(
      '/users/stats'
    );
    return response.data.data;
  },
};
