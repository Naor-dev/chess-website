/**
 * Custom error classes for the chess-website backend.
 *
 * These typed errors enable:
 * - Type-safe error handling with instanceof checks
 * - Consistent error messages and formatting
 * - Better Sentry error grouping by error type
 * - Cleaner controller code without string matching
 *
 * @example
 * import { GameNotFoundError, InvalidMoveError } from '../errors';
 *
 * // In service
 * throw new GameNotFoundError(gameId);
 *
 * // In controller
 * if (error instanceof GameNotFoundError) {
 *   this.handleNotFound(res, error.message);
 * }
 */

// Game domain errors
export {
  GameError,
  GameNotFoundError,
  GameNotActiveError,
  NotYourTurnError,
  InvalidMoveError,
  CannotSaveFinishedGameError,
  CannotResignFinishedGameError,
  ConcurrentModificationError,
} from './GameError';

// Auth domain errors
export {
  AuthError,
  InvalidTokenError,
  TokenExpiredError,
  TokenVersionMismatchError,
  UserNotFoundError,
} from './AuthError';

// Engine domain errors
export {
  EngineError,
  EngineNotInitializedError,
  EngineProviderNotFoundError,
  InvalidEngineMoveError,
  EnginePoolTimeoutError,
} from './EngineError';
