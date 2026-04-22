import pino, { type Logger } from 'pino';

import { env } from '@/lib/env';

const transport =
  env.NODE_ENV === 'development'
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      })
    : undefined;

export const logger: Logger = pino(
  {
    name: 'aws-learning-app',
    level: env.LOG_LEVEL,
    base: undefined
  },
  transport
);

export type AppLogger = Logger;
