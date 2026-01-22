/**
 * Base class for all chess engine related errors.
 * Extends Error with a name property for instanceof checking.
 */
export abstract class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace in V8 environments (Node.js)
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Thrown when the engine fails to initialize.
 */
export class EngineNotInitializedError extends EngineError {
  constructor(reason?: string) {
    super(`Engine failed to initialize${reason ? `: ${reason}` : ''}`);
  }
}

/**
 * Thrown when an unknown engine provider is requested.
 */
export class EngineProviderNotFoundError extends EngineError {
  constructor(providerName: string) {
    super(`Engine provider not found: ${providerName}`);
  }
}

/**
 * Thrown when the engine returns an invalid or illegal move.
 */
export class InvalidEngineMoveError extends EngineError {
  constructor(move: string, fen: string) {
    super(`Engine returned invalid move: ${move} for position: ${fen}`);
  }
}

/**
 * Thrown when the engine pool times out waiting for an available instance.
 */
export class EnginePoolTimeoutError extends EngineError {
  constructor(timeoutMs: number) {
    super(`Engine pool timeout after ${timeoutMs}ms - all engines busy`);
  }
}
