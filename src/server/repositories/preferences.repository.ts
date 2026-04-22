import type { LearnerPreference } from '@prisma/client';

import { prisma, type DatabaseClient } from '@/lib/prisma';

function getDb(db?: DatabaseClient) {
  return db ?? prisma;
}

export async function getOrCreatePreferences(
  learnerId: string,
  db?: DatabaseClient
) {
  return getDb(db).learnerPreference.upsert({
    where: { learnerId },
    create: {
      learnerId,
      noRepeatMode: true,
      removeChallengeOnCorrect: true
    },
    update: {}
  });
}

export async function updatePreferences(
  learnerId: string,
  input: Pick<
    LearnerPreference,
    'noRepeatMode' | 'removeChallengeOnCorrect'
  >,
  db?: DatabaseClient
) {
  return getDb(db).learnerPreference.upsert({
    where: { learnerId },
    create: {
      learnerId,
      ...input
    },
    update: input
  });
}
