import dotenv from 'dotenv';

dotenv.config();

export interface UnifiedConfig {
  server: {
    port: number;
    nodeEnv: string;
  };
  database: {
    url: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bffExchangeSecret: string;
    google: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
  };
  stockfish: {
    depths: Record<number, number>;
  };
  cors: {
    origin: string;
  };
  sentry: {
    dsn: string;
    environment: string;
    enabled: boolean;
  };
}

export const config: UnifiedConfig = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/chess_db',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bffExchangeSecret: process.env.BFF_EXCHANGE_SECRET || 'dev-bff-secret-change-in-production',
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
    },
  },
  stockfish: {
    depths: {
      1: 1,
      2: 3,
      3: 5,
      4: 10,
      5: 15,
    },
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    enabled: !!process.env.SENTRY_DSN,
  },
};

// Validate critical config at startup
export function validateConfig(): void {
  if (config.server.nodeEnv === 'production') {
    if (!config.auth.google.clientId) {
      console.warn('WARNING: GOOGLE_CLIENT_ID not set - Google OAuth login will not work');
    }
    if (config.auth.jwtSecret === 'dev-secret-change-in-production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    if (config.auth.bffExchangeSecret === 'dev-bff-secret-change-in-production') {
      throw new Error('BFF_EXCHANGE_SECRET must be set in production');
    }
  }
}
