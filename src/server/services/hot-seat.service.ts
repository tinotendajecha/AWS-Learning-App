import { HotSeatSessionStatus, type HotSeatSession } from '@prisma/client';

import type {
  CreateHotSeatSessionRequest,
  HotSeatCurrentQuestionDto,
  HotSeatParticipantDto,
  HotSeatReviewItemDto,
  HotSeatSessionDto,
  JoinHotSeatSessionRequest,
  SubmitHotSeatResponseRequest
} from '@/contracts/api';
import { env } from '@/lib/env';
import { AppError } from '@/lib/http';
import type { AppLogger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { findQuestionsForLearner } from '@/server/repositories/question.repository';
import {
  assignHotSeatSessionQuestion,
  createHotSeatResponse,
  createHotSeatSession as createHotSeatSessionRecord,
  findHotSeatSessionByCode,
  markHotSeatQuestionAnswered,
  updateHotSeatParticipantStats,
  updateHotSeatSession,
  upsertHotSeatParticipant,
  type HotSeatSessionRecord
} from '@/server/repositories/hot-seat.repository';
import {
  calculateHotSeatPoints,
  getElapsedSeconds,
  getQuestionExpiration,
  isHotSeatAnswerExpired,
  selectHotSeatParticipant
} from '@/server/services/hot-seat.logic';
import {
  isCorrectSelection,
  normalizeOptionLetters,
  selectQuizQuestions
} from '@/server/services/quiz.logic';

function getCurrentSessionQuestion(session: HotSeatSessionRecord) {
  if (
    session.currentQuestionIndex < 0 ||
    session.currentQuestionIndex >= session.sessionQuestions.length
  ) {
    return null;
  }

  return session.sessionQuestions[session.currentQuestionIndex] ?? null;
}

function getViewerParticipant(session: HotSeatSessionRecord, learnerId: string) {
  return (
    session.participants.find((participant) => participant.learnerId === learnerId) ?? null
  );
}

function assertTeacher(session: HotSeatSession, learnerId: string) {
  if (session.teacherLearnerId !== learnerId) {
    throw new AppError(403, 'HOT_SEAT_TEACHER_ONLY', 'Only the teacher can do that.');
  }
}

function mapParticipants(
  session: HotSeatSessionRecord,
  learnerId: string,
  currentAssignedParticipantId: string | null
): HotSeatParticipantDto[] {
  return session.participants.map((participant) => ({
    id: participant.id,
    displayName: participant.displayName,
    score: participant.score,
    correctAnswers: participant.correctAnswers,
    timesSelected: participant.timesSelected,
    joinedAt: participant.joinedAt.toISOString(),
    isCurrentLearner: participant.learnerId === learnerId,
    isAssignedForCurrentQuestion: currentAssignedParticipantId === participant.id
  }));
}

function mapCurrentQuestion(
  session: HotSeatSessionRecord,
  learnerId: string
): HotSeatCurrentQuestionDto | null {
  if (session.status !== 'ACTIVE') {
    return null;
  }

  const currentQuestion = getCurrentSessionQuestion(session);

  if (!currentQuestion) {
    return null;
  }

  const viewerParticipant = getViewerParticipant(session, learnerId);
  const response = currentQuestion.response;
  const startedAt = currentQuestion.askedAt ?? session.currentQuestionStartedAt;
  const expiresAt = getQuestionExpiration(startedAt, session.timerSeconds);
  const viewerIsAssigned = viewerParticipant?.id === currentQuestion.assignedParticipantId;
  const viewerHasAnswered = viewerIsAssigned && response?.participantId === viewerParticipant?.id;
  const isExpired = isHotSeatAnswerExpired(startedAt, session.timerSeconds, new Date());

  return {
    orderIndex: currentQuestion.orderIndex,
    totalQuestions: session.actualCount,
    questionNumber: currentQuestion.question.number,
    prompt: currentQuestion.question.prompt,
    selectionType: currentQuestion.question.selectionType,
    options: currentQuestion.question.options.map((option) => ({
      letter: option.letter,
      text: option.text
    })),
    assignedParticipantId: currentQuestion.assignedParticipantId,
    assignedParticipantName: currentQuestion.assignedParticipant?.displayName ?? null,
    startedAt: startedAt?.toISOString() ?? null,
    expiresAt: expiresAt?.toISOString() ?? null,
    responseSubmitted: Boolean(response),
    responseTimedOut: response?.wasTimedOut ?? false,
    viewerCanAnswer:
      Boolean(viewerIsAssigned) && !response && !isExpired && session.status === 'ACTIVE',
    viewerHasAnswered: Boolean(viewerHasAnswered),
    viewerSelectedOptionLetters: viewerHasAnswered ? response?.selectedOptionLetters ?? [] : []
  };
}

function mapReviewItems(session: HotSeatSessionRecord, learnerId: string): HotSeatReviewItemDto[] {
  const isTeacher = session.teacherLearnerId === learnerId;

  if (!isTeacher || session.status !== 'COMPLETED') {
    return [];
  }

  return session.sessionQuestions.map((sessionQuestion) => ({
    orderIndex: sessionQuestion.orderIndex,
    questionNumber: sessionQuestion.question.number,
    prompt: sessionQuestion.question.prompt,
    explanation: sessionQuestion.question.explanation,
    options: sessionQuestion.question.options.map((option) => ({
      letter: option.letter,
      text: option.text
    })),
    correctOptionLetters: sessionQuestion.question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.letter),
    assignedParticipantName: sessionQuestion.assignedParticipant?.displayName ?? null,
    selectedOptionLetters: sessionQuestion.response?.selectedOptionLetters ?? [],
    isCorrect: sessionQuestion.response?.isCorrect ?? false,
    wasTimedOut: sessionQuestion.response?.wasTimedOut ?? false,
    timeTakenSeconds: sessionQuestion.response?.timeTakenSeconds ?? null,
    pointsAwarded: sessionQuestion.response?.pointsAwarded ?? 0,
    speedBonusPoints: sessionQuestion.response?.speedBonusPoints ?? 0,
    answeredAt: sessionQuestion.response?.answeredAt?.toISOString() ?? null
  }));
}

function toHotSeatSessionDto(
  session: HotSeatSessionRecord,
  learnerId: string
): HotSeatSessionDto {
  const currentQuestion = mapCurrentQuestion(session, learnerId);
  const participant = getViewerParticipant(session, learnerId);

  return {
    id: session.id,
    code: session.code,
    examCode: session.examCode,
    title: session.title,
    status: session.status,
    source: session.source,
    order: session.order,
    filterQuery: session.filterQuery ?? '',
    requestedCount: session.requestedCount,
    actualCount: session.actualCount,
    timerSeconds: session.timerSeconds,
    selectionMode: session.selectionMode,
    basePoints: session.basePoints,
    speedBonusEnabled: session.speedBonusEnabled,
    maxSpeedBonus: session.maxSpeedBonus,
    currentQuestionIndex: session.currentQuestionIndex,
    createdAt: session.createdAt.toISOString(),
    startedAt: session.startedAt?.toISOString() ?? null,
    completedAt: session.completedAt?.toISOString() ?? null,
    isTeacher: session.teacherLearnerId === learnerId,
    isParticipant: Boolean(participant),
    participantId: participant?.id ?? null,
    participants: mapParticipants(session, learnerId, currentQuestion?.assignedParticipantId ?? null),
    currentQuestion,
    reviewItems: mapReviewItems(session, learnerId)
  };
}

async function loadHotSeatSessionOrThrow(code: string) {
  const session = await findHotSeatSessionByCode(code.toUpperCase());

  if (!session) {
    throw new AppError(404, 'HOT_SEAT_NOT_FOUND', 'Hot Seat session was not found.');
  }

  return session;
}

async function refreshHotSeatSessionDto(code: string, learnerId: string) {
  const session = await loadHotSeatSessionOrThrow(code);
  return toHotSeatSessionDto(session, learnerId);
}

async function generateUniqueSessionCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = '';

    for (let index = 0; index < 6; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    const existingSession = await findHotSeatSessionByCode(code);

    if (!existingSession) {
      return code;
    }
  }

  throw new AppError(
    500,
    'HOT_SEAT_CODE_GENERATION_FAILED',
    'Unable to generate a unique session code.'
  );
}

function ensureSessionHasParticipants(session: HotSeatSessionRecord) {
  if (session.participants.length === 0) {
    throw new AppError(
      400,
      'HOT_SEAT_NO_PARTICIPANTS',
      'Add at least one student before starting the Hot Seat session.'
    );
  }
}

function selectQuestionPool(
  learnerId: string,
  input: CreateHotSeatSessionRequest
) {
  const scope = input.source === 'CHALLENGING' ? 'challenging' : 'all';
  const query = input.source === 'FILTERED' ? input.query ?? '' : '';

  return findQuestionsForLearner({
    learnerId,
    scope,
    query
  });
}

async function assignQuestionTurn(
  session: HotSeatSessionRecord,
  nextQuestionIndex: number,
  db: Parameters<typeof updateHotSeatSession>[2]
) {
  const sessionQuestion = session.sessionQuestions[nextQuestionIndex];

  if (!sessionQuestion) {
    throw new AppError(500, 'HOT_SEAT_INVALID_QUESTION', 'Question turn is unavailable.');
  }

  const participant = selectHotSeatParticipant(
    session.participants.map((item) => ({
      id: item.id,
      timesSelected: item.timesSelected
    })),
    session.selectionMode
  );

  if (!participant) {
    throw new AppError(400, 'HOT_SEAT_NO_PARTICIPANTS', 'No students are available.');
  }

  const askedAt = new Date();

  await updateHotSeatSession(
    session.id,
    {
      status: HotSeatSessionStatus.ACTIVE,
      currentQuestionIndex: nextQuestionIndex,
      currentQuestionStartedAt: askedAt,
      ...(nextQuestionIndex === 0 && !session.startedAt
        ? {
            startedAt: askedAt
          }
        : {})
    },
    db
  );

  await assignHotSeatSessionQuestion(
    sessionQuestion.id,
    {
      assignedParticipantId: participant.id,
      askedAt
    },
    db
  );

  await updateHotSeatParticipantStats(
    participant.id,
    {
      timesSelected: {
        increment: 1
      }
    },
    db
  );
}

async function createTimeoutResponseForCurrentQuestion(
  session: HotSeatSessionRecord,
  db: Parameters<typeof updateHotSeatSession>[2]
) {
  const currentQuestion = getCurrentSessionQuestion(session);

  if (!currentQuestion || currentQuestion.response) {
    return;
  }

  if (!currentQuestion.assignedParticipantId) {
    throw new AppError(
      500,
      'HOT_SEAT_UNASSIGNED_QUESTION',
      'The current question does not have an assigned student.'
    );
  }

  const now = new Date();

  await createHotSeatResponse(
    {
      sessionId: session.id,
      sessionQuestionId: currentQuestion.id,
      participantId: currentQuestion.assignedParticipantId,
      questionId: currentQuestion.questionId,
      selectedOptionLetters: [],
      isCorrect: false,
      wasTimedOut: true,
      timeTakenSeconds: session.timerSeconds,
      pointsAwarded: 0,
      speedBonusPoints: 0,
      answeredAt: now
    },
    db
  );

  await markHotSeatQuestionAnswered(currentQuestion.id, now, db);
}

export async function createHotSeatSession(
  learnerId: string,
  input: CreateHotSeatSessionRequest,
  log: AppLogger
) {
  const pool = await selectQuestionPool(learnerId, input);

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
        timesSeen: 0
      }
    })),
    {
      order: input.order,
      requestedCount: input.count,
      noRepeatMode: false
    }
  );

  if (selection.selectedQuestions.length === 0) {
    throw new AppError(
      400,
      'EMPTY_SELECTION',
      'No questions are available for this Hot Seat session.'
    );
  }

  const code = await generateUniqueSessionCode();
  const session = await createHotSeatSessionRecord({
    code,
    teacherLearnerId: learnerId,
    examCode: env.DEFAULT_EXAM_CODE,
    title: input.title?.trim() ? input.title.trim() : null,
    source: input.source,
    order: input.order,
    filterQuery: input.source === 'FILTERED' ? input.query?.trim() ?? '' : '',
    requestedCount: input.count,
    actualCount: selection.selectedQuestions.length,
    timerSeconds: input.timerSeconds,
    selectionMode: input.selectionMode,
    basePoints: input.basePoints,
    speedBonusEnabled: input.speedBonusEnabled,
    maxSpeedBonus: input.maxSpeedBonus,
    questionIds: selection.selectedQuestions.map((question) => question.id)
  });

  if (!session) {
    throw new AppError(
      500,
      'HOT_SEAT_CREATE_FAILED',
      'Unable to create the Hot Seat session.'
    );
  }

  log.info(
    {
      learnerId,
      code,
      actualCount: session.actualCount
    },
    'Created Hot Seat session'
  );

  return toHotSeatSessionDto(session, learnerId);
}

export async function joinHotSeatSession(
  learnerId: string,
  input: JoinHotSeatSessionRequest,
  log: AppLogger
) {
  const code = input.code.toUpperCase();
  const session = await loadHotSeatSessionOrThrow(code);

  if (session.teacherLearnerId === learnerId) {
    throw new AppError(
      409,
      'HOT_SEAT_TEACHER_CANNOT_JOIN',
      'The teacher already owns this Hot Seat session.'
    );
  }

  if (session.status === 'COMPLETED') {
    throw new AppError(
      409,
      'HOT_SEAT_COMPLETED',
      'This Hot Seat session has already ended.'
    );
  }

  await upsertHotSeatParticipant({
    sessionId: session.id,
    learnerId,
    displayName: input.displayName
  });

  log.info({ learnerId, code, displayName: input.displayName }, 'Joined Hot Seat session');

  return refreshHotSeatSessionDto(code, learnerId);
}

export async function getHotSeatSession(
  learnerId: string,
  code: string,
  log: AppLogger
) {
  const session = await loadHotSeatSessionOrThrow(code.toUpperCase());

  log.debug({ learnerId, code: session.code, status: session.status }, 'Loaded Hot Seat session');

  return toHotSeatSessionDto(session, learnerId);
}

export async function startHotSeatSession(
  learnerId: string,
  code: string,
  log: AppLogger
) {
  const session = await loadHotSeatSessionOrThrow(code.toUpperCase());

  assertTeacher(session, learnerId);

  if (session.status !== 'LOBBY') {
    throw new AppError(
      409,
      'HOT_SEAT_ALREADY_STARTED',
      'This Hot Seat session has already started.'
    );
  }

  ensureSessionHasParticipants(session);

  await prisma.$transaction(async (tx) => {
    await assignQuestionTurn(session, 0, tx);
  });

  log.info({ learnerId, code: session.code }, 'Started Hot Seat session');

  return refreshHotSeatSessionDto(session.code, learnerId);
}

export async function submitHotSeatResponse(
  learnerId: string,
  code: string,
  input: SubmitHotSeatResponseRequest,
  log: AppLogger
) {
  const session = await loadHotSeatSessionOrThrow(code.toUpperCase());

  if (session.status !== 'ACTIVE') {
    throw new AppError(
      409,
      'HOT_SEAT_NOT_ACTIVE',
      'This Hot Seat session is not currently accepting answers.'
    );
  }

  const currentQuestion = getCurrentSessionQuestion(session);

  if (!currentQuestion || !currentQuestion.assignedParticipant) {
    throw new AppError(
      409,
      'HOT_SEAT_NO_CURRENT_QUESTION',
      'There is no active Hot Seat question right now.'
    );
  }

  if (currentQuestion.assignedParticipant.learnerId !== learnerId) {
    throw new AppError(
      403,
      'HOT_SEAT_NOT_YOUR_TURN',
      'Only the assigned student can answer this question.'
    );
  }

  if (currentQuestion.response) {
    throw new AppError(
      409,
      'HOT_SEAT_ALREADY_ANSWERED',
      'This question has already been answered.'
    );
  }

  const now = new Date();
  const startedAt = currentQuestion.askedAt ?? session.currentQuestionStartedAt;

  if (isHotSeatAnswerExpired(startedAt, session.timerSeconds, now)) {
    throw new AppError(
      409,
      'HOT_SEAT_TIMER_EXPIRED',
      'Time is up for this Hot Seat question.'
    );
  }

  const normalizedSelection = normalizeOptionLetters(input.selectedOptionLetters);
  const correctOptionLetters = currentQuestion.question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.letter);
  const isCorrect = isCorrectSelection(correctOptionLetters, normalizedSelection);
  const elapsedSeconds = Math.min(
    startedAt ? getElapsedSeconds(startedAt, now) : input.timeTakenSeconds,
    session.timerSeconds
  );
  const points = calculateHotSeatPoints({
    isCorrect,
    elapsedSeconds,
    timerSeconds: session.timerSeconds,
    basePoints: session.basePoints,
    speedBonusEnabled: session.speedBonusEnabled,
    maxSpeedBonus: session.maxSpeedBonus
  });

  await prisma.$transaction(async (tx) => {
    await createHotSeatResponse(
      {
        sessionId: session.id,
        sessionQuestionId: currentQuestion.id,
        participantId: currentQuestion.assignedParticipantId as string,
        questionId: currentQuestion.questionId,
        selectedOptionLetters: normalizedSelection,
        isCorrect,
        wasTimedOut: false,
        timeTakenSeconds: elapsedSeconds,
        pointsAwarded: points.pointsAwarded,
        speedBonusPoints: points.speedBonusPoints,
        answeredAt: now
      },
      tx
    );

    await markHotSeatQuestionAnswered(currentQuestion.id, now, tx);

    await updateHotSeatParticipantStats(
      currentQuestion.assignedParticipantId as string,
      {
        score: {
          increment: points.pointsAwarded
        },
        ...(isCorrect
          ? {
              correctAnswers: {
                increment: 1
              }
            }
          : {})
      },
      tx
    );
  });

  log.info(
    {
      learnerId,
      code: session.code,
      questionNumber: currentQuestion.question.number,
      isCorrect,
      elapsedSeconds,
      pointsAwarded: points.pointsAwarded
    },
    'Submitted Hot Seat response'
  );

  return refreshHotSeatSessionDto(session.code, learnerId);
}

export async function advanceHotSeatSession(
  learnerId: string,
  code: string,
  log: AppLogger
) {
  const session = await loadHotSeatSessionOrThrow(code.toUpperCase());

  assertTeacher(session, learnerId);

  if (session.status === 'LOBBY') {
    throw new AppError(
      409,
      'HOT_SEAT_NOT_STARTED',
      'Start the session before advancing questions.'
    );
  }

  if (session.status === 'COMPLETED') {
    throw new AppError(
      409,
      'HOT_SEAT_COMPLETED',
      'This Hot Seat session has already ended.'
    );
  }

  ensureSessionHasParticipants(session);

  const isLastQuestion = session.currentQuestionIndex >= session.actualCount - 1;

  await prisma.$transaction(async (tx) => {
    await createTimeoutResponseForCurrentQuestion(session, tx);

    if (isLastQuestion) {
      await updateHotSeatSession(
        session.id,
        {
          status: HotSeatSessionStatus.COMPLETED,
          completedAt: new Date(),
          currentQuestionStartedAt: null
        },
        tx
      );
      return;
    }

    await assignQuestionTurn(session, session.currentQuestionIndex + 1, tx);
  });

  log.info(
    {
      learnerId,
      code: session.code,
      completed: isLastQuestion
    },
    'Advanced Hot Seat session'
  );

  return refreshHotSeatSessionDto(session.code, learnerId);
}
