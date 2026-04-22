import type {
  LearnerQuestionStateDto,
  QuestionCountsDto,
  QuestionDto,
  QuizQuestionDto
} from '@/contracts/api';
import { env } from '@/lib/env';
import { AppError } from '@/lib/http';
import type { AppLogger } from '@/lib/logger';
import {
  countQuestions,
  findQuestionByNumberForLearner,
  findQuestionsForLearner,
  type QuestionRecord
} from '@/server/repositories/question.repository';
import { countChallengingStates } from '@/server/repositories/challenging.repository';

function mapLearnerState(question: QuestionRecord): LearnerQuestionStateDto {
  const learnerState = question.learnerStates[0];

  return {
    isChallenging: learnerState?.isChallenging ?? false,
    challengingSource: learnerState?.challengingSource ?? null,
    timesSeen: learnerState?.timesSeen ?? 0,
    timesAnswered: learnerState?.timesAnswered ?? 0,
    timesCorrect: learnerState?.timesCorrect ?? 0
  };
}

function mapOptions(question: QuestionRecord) {
  return question.options.map((option) => ({
    letter: option.letter,
    text: option.text
  }));
}

export function mapQuestionRecord(question: QuestionRecord): QuestionDto {
  return {
    examCode: question.examCode,
    number: question.number,
    prompt: question.prompt,
    explanation: question.explanation,
    selectionType: question.selectionType,
    options: mapOptions(question),
    correctOptionLetters: question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.letter),
    learnerState: mapLearnerState(question)
  };
}

export function mapQuizQuestionRecord(question: QuestionRecord): QuizQuestionDto {
  return {
    examCode: question.examCode,
    number: question.number,
    prompt: question.prompt,
    explanation: question.explanation,
    selectionType: question.selectionType,
    options: mapOptions(question),
    learnerState: mapLearnerState(question)
  };
}

export async function listQuestions(
  learnerId: string,
  input: {
    query?: string;
    scope?: 'all' | 'challenging';
    questionNumber?: number;
  },
  log: AppLogger
) {
  const questions = await findQuestionsForLearner({
    learnerId,
    ...input
  });

  log.debug(
    {
      learnerId,
      count: questions.length,
      query: input.query,
      scope: input.scope
    },
    'Loaded questions'
  );

  return questions.map(mapQuestionRecord);
}

export async function getQuestionByNumber(
  learnerId: string,
  questionNumber: number,
  log: AppLogger
) {
  const question = await findQuestionByNumberForLearner(learnerId, questionNumber);

  if (!question) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
  }

  log.debug({ learnerId, questionNumber }, 'Loaded question by number');
  return mapQuestionRecord(question);
}

export async function getQuestionMetrics(
  learnerId: string,
  log: AppLogger
): Promise<QuestionCountsDto> {
  const [totalQuestions, challengingQuestions] = await Promise.all([
    countQuestions(),
    countChallengingStates(learnerId)
  ]);

  log.debug({ learnerId, totalQuestions, challengingQuestions }, 'Loaded question metrics');

  return {
    activeExamCode: env.DEFAULT_EXAM_CODE,
    totalQuestions,
    challengingQuestions
  };
}
