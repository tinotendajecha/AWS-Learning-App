import { z } from 'zod';

export const challengeSourceSchema = z.enum(['MANUAL', 'WRONG_ANSWER']);
export const quizSourceSchema = z.enum(['ALL', 'FILTERED', 'CHALLENGING']);
export const quizOrderSchema = z.enum(['RANDOM', 'SEQUENTIAL']);
export const hotSeatSelectionModeSchema = z.enum(['RANDOM', 'FAIR']);

export const questionSearchSchema = z.object({
  query: z.string().trim().optional().default(''),
  scope: z.enum(['all', 'challenging']).optional().default('all'),
  questionNumber: z.number().int().positive().optional()
});

export const markChallengeSchema = z.object({
  questionNumber: z.number().int().positive(),
  source: challengeSourceSchema.default('MANUAL')
});

export const preferencesSchema = z.object({
  noRepeatMode: z.boolean(),
  removeChallengeOnCorrect: z.boolean()
});

export const createQuizAttemptSchema = z.object({
  source: quizSourceSchema,
  count: z.number().int().min(1).max(200),
  order: quizOrderSchema,
  query: z.string().trim().max(200).optional().default(''),
  noRepeatMode: z.boolean(),
  removeChallengeOnCorrect: z.boolean()
});

export const submitQuizAnswerSchema = z.object({
  questionNumber: z.number().int().positive(),
  selectedOptionLetters: z.array(z.string().trim().min(1)).min(1)
});

export const completeQuizAttemptSchema = z.object({
  abandoned: z.boolean().optional().default(false)
});

export const createHotSeatSessionSchema = z.object({
  title: z.string().trim().max(120).optional().default(''),
  source: quizSourceSchema,
  count: z.number().int().min(1).max(200),
  order: quizOrderSchema,
  query: z.string().trim().max(200).optional().default(''),
  timerSeconds: z.number().int().min(45).max(60),
  selectionMode: hotSeatSelectionModeSchema.default('FAIR'),
  basePoints: z.number().int().min(1).max(100).default(10),
  speedBonusEnabled: z.boolean().default(false),
  maxSpeedBonus: z.number().int().min(0).max(50).default(5)
});

export const joinHotSeatSessionSchema = z.object({
  code: z.string().trim().min(4).max(12).transform((value) => value.toUpperCase()),
  displayName: z.string().trim().min(2).max(60)
});

export const submitHotSeatResponseSchema = z.object({
  selectedOptionLetters: z.array(z.string().trim().min(1)).min(1),
  timeTakenSeconds: z.number().int().min(0).max(120)
});
