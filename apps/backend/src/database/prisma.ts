import { PrismaClient } from '@prisma/client';
import { config } from '../config/unifiedConfig';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      config.server.nodeEnv === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (config.server.nodeEnv !== 'production') {
  global.prisma = prisma;
}
