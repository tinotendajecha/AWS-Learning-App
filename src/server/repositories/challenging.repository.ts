import { Prisma } from '@prisma/client';

import { env } from '@/lib/env';
import { prisma, type DatabaseClient } from '@/lib/prisma';

export const challengingStateArgs =
  Prisma.validator<Prisma.LearnerQuestionStateDefaultArgs>()({
    include: {
      question: {
        include: {
          options: true
        }
      }
    }
  });

export type ChallengingStateRecord = Prisma.LearnerQuestionStateGetPayload<
  typeof challengingStateArgs
>;

function getDb(db?: DatabaseClient) {
  return db ?? prisma;
}

export async function listChallengingStates(
  learnerId: string,
  db?: DatabaseClient
) {
  return getDb(db).learnerQuestionState.findMany({
    where: {
      learnerId,
      isChallenging: true,
      question: {
        examCode: env.DEFAULT_EXAM_CODE
      }
    },
    include: {
      question: {
        include: {
          options: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      }
    },
    orderBy: {
      challengingUpdatedAt: 'desc'
    }
  });
}

export async function countChallengingStates(
  learnerId: string,
  db?: DatabaseClient
) {
  return getDb(db).learnerQuestionState.count({
    where: {
      learnerId,
      isChallenging: true,
      question: {
        examCode: env.DEFAULT_EXAM_CODE
      }
    }
  });
}

export async function upsertChallengingState(
  input: {
    learnerId: string;
    questionId: string;
    source: 'MANUAL' | 'WRONG_ANSWER';
    updatedAt: Date;
  },
  db?: DatabaseClient
) {
  return getDb(db).learnerQuestionState.upsert({
    where: {
      learnerId_questionId: {
        learnerId: input.learnerId,
        questionId: input.questionId
      }
    },
    create: {
      learnerId: input.learnerId,
      questionId: input.questionId,
      isChallenging: true,
      challengingSource: input.source,
      challengingUpdatedAt: input.updatedAt
    },
    update: {
      isChallenging: true,
      challengingSource: input.source,
      challengingUpdatedAt: input.updatedAt
    }
  });
}

export async function removeChallengingState(
  learnerId: string,
  questionId: string,
  db?: DatabaseClient
) {
  return getDb(db).learnerQuestionState.upsert({
    where: {
      learnerId_questionId: {
        learnerId,
        questionId
      }
    },
    create: {
      learnerId,
      questionId,
      isChallenging: false,
      challengingSource: null,
      challengingUpdatedAt: null
    },
    update: {
      isChallenging: false,
      challengingSource: null,
      challengingUpdatedAt: null
    }
  });
}

export async function resetSeenHistory(
  learnerId: string,
  db?: DatabaseClient
) {
  return getDb(db).learnerQuestionState.updateMany({
    where: {
      learnerId,
      question: {
        examCode: env.DEFAULT_EXAM_CODE
      }
    },
    data: {
      timesSeen: 0,
      lastSeenAt: null
    }
  });
}
