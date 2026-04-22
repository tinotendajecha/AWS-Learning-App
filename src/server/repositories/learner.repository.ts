import type { Learner } from '@prisma/client';

import { prisma, type DatabaseClient } from '@/lib/prisma';

function getDb(db?: DatabaseClient) {
  return db ?? prisma;
}

export async function findLearnerByAnonymousKey(
  anonymousKey: string,
  db?: DatabaseClient
) {
  return getDb(db).learner.findUnique({
    where: { anonymousKey }
  });
}

export async function createAnonymousLearner(
  anonymousKey: string,
  db?: DatabaseClient
) {
  return getDb(db).learner.create({
    data: {
      anonymousKey
    }
  });
}

export async function touchLearner(
  learnerId: Learner['id'],
  db?: DatabaseClient
) {
  return getDb(db).learner.update({
    where: { id: learnerId },
    data: {
      lastSeenAt: new Date()
    }
  });
}
