import type { Learner } from '@prisma/client';
import { headers as nextHeaders } from 'next/headers';

import { logger, type AppLogger } from '@/lib/logger';
import { LEARNER_ID_HEADER, REQUEST_ID_HEADER } from '@/lib/request-headers';
import { resolveLearnerByAnonymousKey } from '@/server/services/learner.service';

type ContextShape = {
  requestId: string;
  anonymousKey: string;
  learner: Learner;
  logger: AppLogger;
};

async function buildContext(headers: Headers): Promise<ContextShape> {
  const requestId = headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  const anonymousKey = headers.get(LEARNER_ID_HEADER) ?? crypto.randomUUID();
  const requestLogger = logger.child({
    requestId,
    anonymousKey
  });

  const learner = await resolveLearnerByAnonymousKey(anonymousKey, requestLogger);

  return {
    requestId,
    anonymousKey,
    learner,
    logger: requestLogger.child({
      learnerId: learner.id
    })
  };
}

export async function getServerRequestContext() {
  const headerStore = await nextHeaders();
  return buildContext(new Headers(headerStore));
}

export async function getRouteRequestContext(request: Request) {
  return buildContext(new Headers(request.headers));
}
