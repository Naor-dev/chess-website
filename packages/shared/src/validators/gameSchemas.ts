import { z } from 'zod';

export const difficultyLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const timeControlTypeSchema = z.enum([
  'none',
  'bullet_1min',
  'bullet_2min',
  'blitz_3min',
  'blitz_5min',
  'rapid_10min',
  'rapid_15min',
  'classical_30min',
]);

export const createGameSchema = z.object({
  difficultyLevel: difficultyLevelSchema,
  timeControlType: timeControlTypeSchema,
});

export const squareSchema = z.string().regex(/^[a-h][1-8]$/, 'Invalid chess square');

export const promotionPieceSchema = z.enum(['q', 'r', 'b', 'n']);

export const makeMoveSchema = z.object({
  from: squareSchema,
  to: squareSchema,
  promotion: promotionPieceSchema.optional(),
});

export const gameIdSchema = z.string().uuid();

// Email validation (for BFF exchange)
export const emailSchema = z.string().email().toLowerCase().trim().max(255);

// Google ID validation (numeric string from Google OAuth)
export const googleIdSchema = z.string().regex(/^\d{1,30}$/, 'Invalid Google ID format');

// Display name validation
export const displayNameSchema = z.string().trim().min(1).max(255);

// BFF exchange request body schema
export const bffExchangeSchema = z.object({
  googleId: googleIdSchema,
  email: emailSchema,
  displayName: displayNameSchema,
});

// Type exports inferred from schemas
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type MakeMoveInput = z.infer<typeof makeMoveSchema>;
export type BffExchangeInput = z.infer<typeof bffExchangeSchema>;
