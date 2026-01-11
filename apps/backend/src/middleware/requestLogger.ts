import morgan from 'morgan';
import { config } from '../config/unifiedConfig';

export const requestLogger =
  config.server.nodeEnv !== 'test'
    ? morgan('combined')
    : (_req: unknown, _res: unknown, next: () => void) => next();
