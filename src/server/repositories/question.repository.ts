import { Prisma } from '@prisma/client';

import { env } from '@/lib/env';
import { prisma, type DatabaseClient } from '@/lib/prisma';

export const questionRecordArgs = Prisma.validator<Prisma.QuestionDefaultArgs>()({
  include: {
    options: true,
    learnerStates: true
  }
});

export type QuestionRecord = Prisma.QuestionGetPayload<typeof questionRecordArgs>;

function getDb(db?: DatabaseClient) {
  return db ?? prisma;
}

function buildQuestionWhere(input: {
  learnerId: string;
  query?: string;
  scope?: 'all' | 'challenging';
  questionNumber?: number;
}): Prisma.QuestionWhereInput {
  const where: Prisma.QuestionWhereInput = {
    examCode: env.DEFAULT_EXAM_CODE
  };

  if (input.scope === 'challenging') {
    where.learnerStates = {
      some: {
        learnerId: input.learnerId,
        isChallenging: true
      }
    };
  }

  if (input.questionNumber) {
    where.number = input.questionNumber;
    return where;
  }

  const query = input.query?.trim();
  if (!query) {
    return where;
  }

  const exactQuestionNumber = Number(query);
  const filters: Prisma.QuestionWhereInput[] = [
    {
      prompt: {
        contains: query,
        mode: 'insensitive'
      }
    },
    {
      options: {
        some: {
          text: {
            contains: query,
            mode: 'insensitive'
          }
        }
      }
    }
  ];

  if (Number.isInteger(exactQuestionNumber)) {
    filters.push({
      number: exactQuestionNumber
    });
  }

  where.OR = filters;
  return where;
}

export async function findQuestionsForLearner(
  input: {
    learnerId: string;
    query?: string;
    scope?: 'all' | 'challenging';
    questionNumber?: number;
  },
  db?: DatabaseClient
) {
  return getDb(db).question.findMany({
    where: buildQuestionWhere(input),
    include: {
      options: {
        orderBy: {
          position: 'asc'
        }
      },
      learnerStates: {
        where: {
          learnerId: input.learnerId
        }
      }
    },
    orderBy: {
      number: 'asc'
    }
  });
}

export async function findQuestionByNumberForLearner(
  learnerId: string,
  questionNumber: number,
  db?: DatabaseClient
) {
  const questions = await findQuestionsForLearner(
    {
      learnerId,
      questionNumber
    },
    db
  );

  return questions[0] ?? null;
}

export async function countQuestions(db?: DatabaseClient) {
  return getDb(db).question.count({
    where: {
      examCode: env.DEFAULT_EXAM_CODE
    }
  });
}
