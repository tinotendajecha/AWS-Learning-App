import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DEFAULT_EXAM_CODE: z.string().default('AWS-CLF-C02'),
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DEFAULT_EXAM_CODE: process.env.DEFAULT_EXAM_CODE,
  LOG_LEVEL: process.env.LOG_LEVEL,
  NODE_ENV: process.env.NODE_ENV
});
