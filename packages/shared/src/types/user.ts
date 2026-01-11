export interface User {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token?: string;
}
