import {
  ChallengeSource,
  Prisma,
  QuizAttemptStatus
} from '@prisma/client';

import type {
  AutoChallengeAction,
  CreateQuizAttemptRequest,
  QuizAnswerResultDto,
  QuizAttemptResultDto,
  QuizAttemptReviewItemDto,
  QuizAttemptSessionDto
} from '@/contracts/api';
import { env } from '@/lib/env';
import { AppError } from '@/lib/http';
import type { AppLogger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  findAttemptForLearner,
  findAttemptItemForQuestion,
  summarizeAttempt,
  updateAttemptItemAnswer,
  updateAttemptSummary,
  createQuizAttempt
} from '@/server/repositories/quiz.repository';
import { findQuestionsForLearner } from '@/server/repositories/question.repository';
import { resetSeenHistory } from '@/server/repositories/challenging.repository';
import { mapQuizQuestionRecord } from '@/server/services/question.service';
import {
  isCorrectSelection,
  normalizeOptionLetters,
  selectQuizQuestions
} from '@/server/services/quiz.logic';

function toQuizSessionDto(
  attemptId: string,
  input: CreateQuizAttemptRequest,
  actualCount: number,
  questions: Awaited<ReturnType<typeof findQuestionsForLearner>>
): QuizAttemptSessionDto {
  return {
    attemptId,
    examCode: env.DEFAULT_EXAM_CODE,
    source: input.source,
    order: input.order,
    filterQuery: input.query ?? '',
    requestedCount: input.count,
    actualCount,
    noRepeatMode: input.noRepeatMode,
    removeChallengeOnCorrect: input.removeChallengeOnCorrect,
    status: 'IN_PROGRESS',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    questions: questions.map(mapQuizQuestionRecord)
  };
}

function mapReviewItem(
  item: NonNullable<Awaited<ReturnType<typeof findAttemptForLearner>>>['items'][number]
): QuizAttemptReviewItemDto {
  return {
    number: item.question.number,
    prompt: item.question.prompt,
    explanation: item.question.explanation,
    options: item.question.options.map((option) => ({
      letter: option.letter,
      text: option.text
    })),
    selectedOptionLetters: item.selectedOptionLetters,
    correctOptionLetters: item.question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.letter),
    isCorrect: item.isCorrect ?? false
  };
}

export async function createAttempt(
  learnerId: string,
  input: CreateQuizAttemptRequest,
  log: AppLogger
) {
  const scope = input.source === 'CHALLENGING' ? 'challenging' : 'all';
  const query = input.source === 'FILTERED' ? input.query : '';

  const pool = await findQuestionsForLearner({
    learnerId,
    scope,
    query
  });

  if (pool.length === 0) {
    throw new AppError(
      400,
      'EMPTY_QUESTION_POOL',
      input.source === 'CHALLENGING'
        ? 'No challenging questions are available yet.'
        : 'No questions matched the selected source.'
    );
  }

  const selection = selectQuizQuestions(
    pool.map((question) => ({
      ...question,
      learnerState: {
        timesSeen: question.learnerStates[0]?.timesSeen ?? 0
      }
    })),
    {
      order: input.order,
      requestedCount: input.count,
      noRepeatMode: input.noRepeatMode
    }
  );

  if (selection.shouldResetSeenHistory) {
    await resetSeenHistory(learnerId);
  }

  if (selection.selectedQuestions.length === 0) {
    throw new AppError(400, 'EMPTY_SELECTION', 'No questions are available for this quiz.');
  }

  const attempt = await createQuizAttempt({
    learnerId,
    examCode: env.DEFAULT_EXAM_CODE,
    source: input.source,
    order: input.order,
    filterQuery: query ?? '',
    requestedCount: input.count,
    actualCount: selection.selectedQuestions.length,
    noRepeatMode: input.noRepeatMode,
    removeChallengeOnCorrect: input.removeChallengeOnCorrect,
    questionIds: selection.selectedQuestions.map((question) => question.id)
  });

  log.info(
    {
      learnerId,
      attemptId: attempt.id,
      actualCount: selection.selectedQuestions.length
    },
    'Created quiz attempt'
  );

  return toQuizSessionDto(
    attempt.id,
    input,
    selection.selectedQuestions.length,
    selection.selectedQuestions
  );
}

export async function submitAnswer(
  learnerId: string,
  attemptId: string,
  questionNumber: number,
  selectedOptionLetters: string[],
  log: AppLogger
) {
  const attemptItem = await findAttemptItemForQuestion(
    attemptId,
    learnerId,
    questionNumber
  );

  if (!attemptItem) {
    throw new AppError(404, 'ATTEMPT_ITEM_NOT_FOUND', 'Quiz question was not found.');
  }

  if (attemptItem.attempt.status !== 'IN_PROGRESS') {
    throw new AppError(409, 'ATTEMPT_NOT_ACTIVE', 'Quiz attempt is no longer active.');
  }

  if (attemptItem.isCorrect !== null) {
    throw new AppError(409, 'QUESTION_ALREADY_ANSWERED', 'Question has already been answered.');
  }

  const correctOptionLetters = attemptItem.question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.letter);
  const normalizedSelection = normalizeOptionLetters(selectedOptionLetters);
  const isCorrect = isCorrectSelection(correctOptionLetters, normalizedSelection);
  const answeredAt = new Date();
  const learnerState = attemptItem.question.learnerStates[0];
  const wasChallenging = learnerState?.isChallenging ?? false;

  let autoChallengeAction: AutoChallengeAction = 'NONE';
  let nextIsChallenging = wasChallenging;
  let nextChallengeSource = learnerState?.challengingSource ?? null;
  let nextChallengeUpdatedAt = learnerState?.challengingUpdatedAt ?? null;

  if (!isCorrect) {
    autoChallengeAction = 'ADDED';
    nextIsChallenging = true;
    nextChallengeSource = ChallengeSource.WRONG_ANSWER;
    nextChallengeUpdatedAt = answeredAt;
  } else if (attemptItem.attempt.removeChallengeOnCorrect && wasChallenging) {
    autoChallengeAction = 'REMOVED';
    nextIsChallenging = false;
    nextChallengeSource = null;
    nextChallengeUpdatedAt = null;
  }

  const summary = await prisma.$transaction(async (tx) => {
    await updateAttemptItemAnswer(
      attemptItem.id,
      {
        selectedOptionLetters: normalizedSelection,
        isCorrect,
        answeredAt
      },
      tx
    );

    await tx.learnerQuestionState.upsert({
      where: {
        learnerId_questionId: {
          learnerId,
          questionId: attemptItem.questionId
        }
      },
      create: {
        learnerId,
        questionId: attemptItem.questionId,
        isChallenging: nextIsChallenging,
        challengingSource: nextChallengeSource,
        challengingUpdatedAt: nextChallengeUpdatedAt,
        timesSeen: 1,
        timesAnswered: 1,
        timesCorrect: isCorrect ? 1 : 0,
        lastSeenAt: answeredAt,
        lastAnsweredAt: answeredAt,
        lastAnsweredCorrectlyAt: isCorrect ? answeredAt : null
      },
      update: {
        isChallenging: nextIsChallenging,
        challengingSource: nextChallengeSource,
        challengingUpdatedAt: nextChallengeUpdatedAt,
        timesSeen: {
          increment: 1
        },
        timesAnswered: {
          increment: 1
        },
        ...(isCorrect
          ? {
              timesCorrect: {
                increment: 1
              }
            }
          : {}),
        lastSeenAt: answeredAt,
        lastAnsweredAt: answeredAt,
        lastAnsweredCorrectlyAt: isCorrect ? answeredAt : learnerState?.lastAnsweredCorrectlyAt ?? null
      }
    });

    const attemptSummary = await summarizeAttempt(attemptId, tx);

    await updateAttemptSummary(
      attemptId,
      {
        score: attemptSummary.score,
        correctCount: attemptSummary.correctCount,
        wrongCount: attemptSummary.wrongCount
      },
      tx
    );

    return attemptSummary;
  });

  log.info(
    {
      learnerId,
      attemptId,
      questionNumber,
      isCorrect,
      autoChallengeAction
    },
    'Submitted quiz answer'
  );

  return {
    questionNumber,
    selectedOptionLetters: normalizedSelection,
    correctOptionLetters,
    explanation: attemptItem.question.explanation,
    isCorrect,
    score: summary.score,
    correctCount: summary.correctCount,
    wrongCount: summary.wrongCount,
    autoChallengeAction,
    attemptCompleted: summary.answeredCount === attemptItem.attempt.actualCount
  } satisfies QuizAnswerResultDto;
}

export async function completeAttempt(
  learnerId: string,
  attemptId: string,
  abandoned: boolean,
  log: AppLogger
) {
  const attempt = await findAttemptForLearner(attemptId, learnerId);

  if (!attempt) {
    throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Quiz attempt not found.');
  }

  const summary = await summarizeAttempt(attemptId);
  const status =
    abandoned || summary.answeredCount < attempt.actualCount
      ? QuizAttemptStatus.ABANDONED
      : QuizAttemptStatus.COMPLETED;

  await updateAttemptSummary(attemptId, {
    score: summary.score,
    correctCount: summary.correctCount,
    wrongCount: summary.wrongCount,
    status,
    completedAt: new Date()
  });

  log.info({ learnerId, attemptId, status }, 'Completed quiz attempt');

  return getAttemptResult(learnerId, attemptId, log);
}

export async function getAttemptResult(
  learnerId: string,
  attemptId: string,
  log: AppLogger
): Promise<QuizAttemptResultDto> {
  const attempt = await findAttemptForLearner(attemptId, learnerId);

  if (!attempt) {
    throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Quiz attempt not found.');
  }

  const answeredCount = attempt.items.filter((item) => item.isCorrect !== null).length;
  const wrongAnswers = attempt.items
    .filter((item) => item.isCorrect === false)
    .map(mapReviewItem);

  log.debug({ learnerId, attemptId }, 'Loaded quiz attempt result');

  return {
    attemptId: attempt.id,
    examCode: attempt.examCode,
    status: attempt.status,
    source: attempt.source,
    order: attempt.order,
    filterQuery: attempt.filterQuery ?? '',
    requestedCount: attempt.requestedCount,
    actualCount: attempt.actualCount,
    score: attempt.score,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    answeredCount,
    unansweredCount: Math.max(attempt.actualCount - answeredCount, 0),
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt?.toISOString() ?? null,
    wrongAnswers
  };
}
