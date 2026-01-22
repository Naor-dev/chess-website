/**
 * Base class for all authentication/authorization errors.
 * Extends Error with a name property for instanceof checking.
 */
export abstract class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace in V8 environments (Node.js)
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Thrown when a JWT token is malformed, has invalid signature,
 * or fails other validation checks.
 */
export class InvalidTokenError extends AuthError {
  constructor(reason?: string) {
    super(`Invalid token${reason ? `: ${reason}` : ''}`);
  }
}

/**
 * Thrown when a JWT token has expired.
 */
export class TokenExpiredError extends AuthError {
  constructor() {
    super('Token has expired');
  }
}

/**
 * Thrown when token version doesn't match (user logged out all sessions).
 */
export class TokenVersionMismatchError extends AuthError {
  constructor(userId: string) {
    super(`Token version mismatch for user: ${userId}`);
  }
}

/**
 * Thrown when attempting to find a user that doesn't exist.
 */
export class UserNotFoundError extends AuthError {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}
