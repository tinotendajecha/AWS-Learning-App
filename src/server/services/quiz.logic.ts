import type { QuizOrder } from '@/contracts/api';

type PoolQuestion = {
  number: number;
  learnerState: {
    timesSeen: number;
  };
};

export function normalizeOptionLetters(optionLetters: string[]) {
  return [...new Set(optionLetters.map((option) => option.trim().toUpperCase()))].sort();
}

export function isCorrectSelection(
  correctOptionLetters: string[],
  selectedOptionLetters: string[]
) {
  const normalizedCorrect = normalizeOptionLetters(correctOptionLetters);
  const normalizedSelected = normalizeOptionLetters(selectedOptionLetters);

  return normalizedCorrect.join(',') === normalizedSelected.join(',');
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
  }

  return copy;
}

export function selectQuizQuestions<T extends PoolQuestion>(
  pool: T[],
  input: {
    order: QuizOrder;
    requestedCount: number;
    noRepeatMode: boolean;
  }
) {
  let workingPool = [...pool];
  let shouldResetSeenHistory = false;

  if (input.noRepeatMode) {
    const unseenQuestions = workingPool.filter(
      (question) => (question.learnerState?.timesSeen ?? 0) === 0
    );

    if (unseenQuestions.length > 0) {
      workingPool = unseenQuestions;
    } else {
      shouldResetSeenHistory = true;
    }
  }

  if (input.order === 'RANDOM') {
    workingPool = shuffle(workingPool);
  } else {
    workingPool = [...workingPool].sort((left, right) => left.number - right.number);
  }

  return {
    selectedQuestions: workingPool.slice(
      0,
      Math.min(input.requestedCount, workingPool.length)
    ),
    shouldResetSeenHistory
  };
}
