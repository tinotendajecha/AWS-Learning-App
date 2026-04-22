import type { ChallengeItemDto, ChallengeSource } from '@/contracts/api';
import { AppError } from '@/lib/http';
import type { AppLogger } from '@/lib/logger';
import {
  listChallengingStates,
  removeChallengingState,
  upsertChallengingState
} from '@/server/repositories/challenging.repository';
import { findQuestionByNumberForLearner } from '@/server/repositories/question.repository';

function mapChallengeItem(input: Awaited<ReturnType<typeof listChallengingStates>>[number]): ChallengeItemDto {
  return {
    examCode: input.question.examCode,
    questionNumber: input.question.number,
    question: input.question.prompt,
    explanation: input.question.explanation,
    answerList: input.question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.letter),
    addedFrom: input.challengingSource ?? 'MANUAL',
    updatedAt: input.challengingUpdatedAt?.toISOString() ?? input.updatedAt.toISOString()
  };
}

function escapeCsvValue(value: string | number) {
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildChallengesCsv(items: ChallengeItemDto[]) {
  const headers = [
    'exam_code',
    'question_number',
    'question',
    'answer_list',
    'concept_explanation',
    'added_from',
    'updated_at',
    'ai_prompt'
  ];

  const rows = [headers.join(',')];

  for (const item of items) {
    const aiPrompt = `I am preparing for AWS exam. I keep missing this concept. Give me key topics to revise, why this question matters, and 5 targeted practice points. Question: ${item.question}`;
    rows.push(
      [
        item.examCode,
        item.questionNumber,
        item.question,
        item.answerList.join(', '),
        item.explanation,
        item.addedFrom,
        item.updatedAt,
        aiPrompt
      ]
        .map(escapeCsvValue)
        .join(',')
    );
  }

  return rows.join('\n');
}

export async function listChallenges(learnerId: string, log: AppLogger) {
  const items = await listChallengingStates(learnerId);
  log.debug({ learnerId, count: items.length }, 'Loaded challenging questions');
  return items.map(mapChallengeItem);
}

export async function addChallenge(
  learnerId: string,
  questionNumber: number,
  source: ChallengeSource,
  log: AppLogger
) {
  const question = await findQuestionByNumberForLearner(learnerId, questionNumber);

  if (!question) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
  }

  await upsertChallengingState({
    learnerId,
    questionId: question.id,
    source,
    updatedAt: new Date()
  });

  log.info({ learnerId, questionNumber, source }, 'Marked question as challenging');

  return listChallenges(learnerId, log);
}

export async function removeChallenge(
  learnerId: string,
  questionNumber: number,
  log: AppLogger
) {
  const question = await findQuestionByNumberForLearner(learnerId, questionNumber);

  if (!question) {
    throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
  }

  await removeChallengingState(learnerId, question.id);
  log.info({ learnerId, questionNumber }, 'Removed question from challenging list');
  return listChallenges(learnerId, log);
}

export async function exportChallengesCsv(learnerId: string, log: AppLogger) {
  const items = await listChallenges(learnerId, log);
  return buildChallengesCsv(items);
}
