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

// Type exports inferred from schemas
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type MakeMoveInput = z.infer<typeof makeMoveSchema>;
