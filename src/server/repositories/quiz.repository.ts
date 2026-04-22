import { Prisma, QuizAttemptStatus } from '@prisma/client';

import { prisma, type DatabaseClient } from '@/lib/prisma';

export const quizAttemptRecordArgs =
  Prisma.validator<Prisma.QuizAttemptDefaultArgs>()({
    include: {
      items: {
        include: {
          question: {
            include: {
              options: true,
              learnerStates: true
            }
          }
        }
      }
    }
  });

export type QuizAttemptRecord = Prisma.QuizAttemptGetPayload<
  typeof quizAttemptRecordArgs
>;

function getDb(db?: DatabaseClient) {
  return db ?? prisma;
}

export async function createQuizAttempt(
  input: {
    learnerId: string;
    examCode: string;
    source: Prisma.QuizAttemptCreateInput['source'];
    order: Prisma.QuizAttemptCreateInput['order'];
    filterQuery: string;
    requestedCount: number;
    actualCount: number;
    noRepeatMode: boolean;
    removeChallengeOnCorrect: boolean;
    questionIds: string[];
  },
  db?: DatabaseClient
) {
  return getDb(db).quizAttempt.create({
    data: {
      learnerId: input.learnerId,
      examCode: input.examCode,
      source: input.source,
      order: input.order,
      filterQuery: input.filterQuery,
      requestedCount: input.requestedCount,
      actualCount: input.actualCount,
      noRepeatMode: input.noRepeatMode,
      removeChallengeOnCorrect: input.removeChallengeOnCorrect,
      items: {
        create: input.questionIds.map((questionId, orderIndex) => ({
          questionId,
          orderIndex
        }))
      }
    }
  });
}

export async function findAttemptForLearner(
  attemptId: string,
  learnerId: string,
  db?: DatabaseClient
) {
  return getDb(db).quizAttempt.findFirst({
    where: {
      id: attemptId,
      learnerId
    },
    include: {
      items: {
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
              },
              learnerStates: {
                where: {
                  learnerId
                }
              }
            }
          }
        }
      }
    }
  });
}

export async function findAttemptItemForQuestion(
  attemptId: string,
  learnerId: string,
  questionNumber: number,
  db?: DatabaseClient
) {
  return getDb(db).quizAttemptItem.findFirst({
    where: {
      attemptId,
      question: {
        number: questionNumber
      },
      attempt: {
        learnerId
      }
    },
    include: {
      attempt: true,
      question: {
        include: {
          options: {
            orderBy: {
              position: 'asc'
            }
          },
          learnerStates: {
            where: {
              learnerId
            }
          }
        }
      }
    }
  });
}

export async function updateAttemptItemAnswer(
  attemptItemId: string,
  input: {
    selectedOptionLetters: string[];
    isCorrect: boolean;
    answeredAt: Date;
  },
  db?: DatabaseClient
) {
  return getDb(db).quizAttemptItem.update({
    where: {
      id: attemptItemId
    },
    data: {
      selectedOptionLetters: input.selectedOptionLetters,
      isCorrect: input.isCorrect,
      answeredAt: input.answeredAt
    }
  });
}

export async function summarizeAttempt(
  attemptId: string,
  db?: DatabaseClient
) {
  const items = await getDb(db).quizAttemptItem.findMany({
    where: {
      attemptId
    },
    select: {
      isCorrect: true
    }
  });

  const answeredCount = items.filter((item) => item.isCorrect !== null).length;
  const correctCount = items.filter((item) => item.isCorrect === true).length;
  const wrongCount = items.filter((item) => item.isCorrect === false).length;

  return {
    answeredCount,
    correctCount,
    wrongCount,
    score: correctCount
  };
}

export async function updateAttemptSummary(
  attemptId: string,
  input: {
    score: number;
    correctCount: number;
    wrongCount: number;
    status?: QuizAttemptStatus;
    completedAt?: Date | null;
  },
  db?: DatabaseClient
) {
  return getDb(db).quizAttempt.update({
    where: {
      id: attemptId
    },
    data: {
      score: input.score,
      correctCount: input.correctCount,
      wrongCount: input.wrongCount,
      ...(input.status ? { status: input.status } : {}),
      ...(input.completedAt !== undefined
        ? {
            completedAt: input.completedAt
          }
        : {})
    }
  });
}
