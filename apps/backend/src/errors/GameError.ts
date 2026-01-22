/**
 * Base class for all game-related errors.
 * Extends Error with a name property for instanceof checking.
 */
export abstract class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace in V8 environments (Node.js)
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Thrown when attempting to access a game that doesn't exist
 * or the user doesn't have permission to access.
 */
export class GameNotFoundError extends GameError {
  constructor(gameId: string) {
    super(`Game not found: ${gameId}`);
  }
}

/**
 * Thrown when attempting an operation on a game that is not active
 * (e.g., making a move on a finished game).
 */
export class GameNotActiveError extends GameError {
  constructor(gameId: string, status: string) {
    super(`Game ${gameId} is not active (status: ${status})`);
  }
}

/**
 * Thrown when a user attempts to make a move when it's not their turn.
 */
export class NotYourTurnError extends GameError {
  constructor(gameId: string) {
    super(`Not your turn in game ${gameId}`);
  }
}

/**
 * Thrown when a move is illegal according to chess rules.
 */
export class InvalidMoveError extends GameError {
  constructor(move: string, reason?: string) {
    super(`Invalid move: ${move}${reason ? ` (${reason})` : ''}`);
  }
}

/**
 * Thrown when attempting to save a game that has already finished.
 */
export class CannotSaveFinishedGameError extends GameError {
  constructor(gameId: string) {
    super(`Cannot save a finished game: ${gameId}`);
  }
}

/**
 * Thrown when attempting to resign a game that has already finished.
 */
export class CannotResignFinishedGameError extends GameError {
  constructor(gameId: string) {
    super(`Cannot resign a finished game: ${gameId}`);
  }
}

/**
 * Thrown when a concurrent modification is detected during optimistic locking.
 * This indicates the game was modified by another request between read and write.
 */
export class ConcurrentModificationError extends GameError {
  constructor(gameId: string) {
    super(`Game ${gameId} was modified concurrently. Please refresh and try again.`);
  }
}
