import { Prisma } from '@prisma/client';

import { prisma, type DatabaseClient } from '@/lib/prisma';

function getDb(db?: DatabaseClient) {
  return db ?? prisma;
}

export const hotSeatSessionRecordArgs =
  Prisma.validator<Prisma.HotSeatSessionDefaultArgs>()({
    include: {
      teacher: true,
      participants: {
        orderBy: [
          {
            score: 'desc'
          },
          {
            joinedAt: 'asc'
          }
        ]
      },
      sessionQuestions: {
        orderBy: {
          orderIndex: 'asc'
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
          },
          assignedParticipant: true,
          response: {
            include: {
              participant: true
            }
          }
        }
      }
    }
  });

export type HotSeatSessionRecord = Prisma.HotSeatSessionGetPayload<
  typeof hotSeatSessionRecordArgs
>;

export async function findHotSeatSessionByCode(code: string, db?: DatabaseClient) {
  return getDb(db).hotSeatSession.findUnique({
    where: {
      code
    },
    include: hotSeatSessionRecordArgs.include
  });
}

export async function createHotSeatSession(
  input: {
    code: string;
    teacherLearnerId: string;
    examCode: string;
    title: string | null;
    source: Prisma.HotSeatSessionCreateInput['source'];
    order: Prisma.HotSeatSessionCreateInput['order'];
    filterQuery: string;
    requestedCount: number;
    actualCount: number;
    timerSeconds: number;
    selectionMode: Prisma.HotSeatSessionCreateInput['selectionMode'];
    basePoints: number;
    speedBonusEnabled: boolean;
    maxSpeedBonus: number;
    questionIds: string[];
  },
  db?: DatabaseClient
) {
  const created = await getDb(db).hotSeatSession.create({
    data: {
      code: input.code,
      teacherLearnerId: input.teacherLearnerId,
      examCode: input.examCode,
      title: input.title,
      source: input.source,
      order: input.order,
      filterQuery: input.filterQuery,
      requestedCount: input.requestedCount,
      actualCount: input.actualCount,
      timerSeconds: input.timerSeconds,
      selectionMode: input.selectionMode,
      basePoints: input.basePoints,
      speedBonusEnabled: input.speedBonusEnabled,
      maxSpeedBonus: input.maxSpeedBonus,
      sessionQuestions: {
        create: input.questionIds.map((questionId, orderIndex) => ({
          questionId,
          orderIndex
        }))
      }
    }
  });

  return findHotSeatSessionByCode(created.code, db);
}

export async function upsertHotSeatParticipant(
  input: {
    sessionId: string;
    learnerId: string;
    displayName: string;
  },
  db?: DatabaseClient
) {
  return getDb(db).hotSeatParticipant.upsert({
    where: {
      sessionId_learnerId: {
        sessionId: input.sessionId,
        learnerId: input.learnerId
      }
    },
    create: {
      sessionId: input.sessionId,
      learnerId: input.learnerId,
      displayName: input.displayName
    },
    update: {
      displayName: input.displayName
    }
  });
}

export async function updateHotSeatSession(
  sessionId: string,
  data: Prisma.HotSeatSessionUpdateInput,
  db?: DatabaseClient
) {
  return getDb(db).hotSeatSession.update({
    where: {
      id: sessionId
    },
    data
  });
}

export async function assignHotSeatSessionQuestion(
  sessionQuestionId: string,
  input: {
    assignedParticipantId: string;
    askedAt: Date;
  },
  db?: DatabaseClient
) {
  return getDb(db).hotSeatSessionQuestion.update({
    where: {
      id: sessionQuestionId
    },
    data: {
      assignedParticipantId: input.assignedParticipantId,
      askedAt: input.askedAt
    }
  });
}

export async function createHotSeatResponse(
  input: {
    sessionId: string;
    sessionQuestionId: string;
    participantId: string;
    questionId: string;
    selectedOptionLetters: string[];
    isCorrect: boolean;
    wasTimedOut: boolean;
    timeTakenSeconds: number | null;
    pointsAwarded: number;
    speedBonusPoints: number;
    answeredAt: Date | null;
  },
  db?: DatabaseClient
) {
  return getDb(db).hotSeatResponse.create({
    data: {
      sessionId: input.sessionId,
      sessionQuestionId: input.sessionQuestionId,
      participantId: input.participantId,
      questionId: input.questionId,
      selectedOptionLetters: input.selectedOptionLetters,
      isCorrect: input.isCorrect,
      wasTimedOut: input.wasTimedOut,
      timeTakenSeconds: input.timeTakenSeconds,
      pointsAwarded: input.pointsAwarded,
      speedBonusPoints: input.speedBonusPoints,
      answeredAt: input.answeredAt
    }
  });
}

export async function markHotSeatQuestionAnswered(
  sessionQuestionId: string,
  answeredAt: Date,
  db?: DatabaseClient
) {
  return getDb(db).hotSeatSessionQuestion.update({
    where: {
      id: sessionQuestionId
    },
    data: {
      answeredAt
    }
  });
}

export async function updateHotSeatParticipantStats(
  participantId: string,
  data: Prisma.HotSeatParticipantUpdateInput,
  db?: DatabaseClient
) {
  return getDb(db).hotSeatParticipant.update({
    where: {
      id: participantId
    },
    data
  });
}
