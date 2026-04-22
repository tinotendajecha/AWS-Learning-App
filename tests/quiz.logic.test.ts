import { describe, expect, it } from 'vitest';

import {
  isCorrectSelection,
  selectQuizQuestions
} from '../src/server/services/quiz.logic';

describe('quiz logic', () => {
  it('matches single-answer selections exactly', () => {
    expect(isCorrectSelection(['B'], ['B'])).toBe(true);
    expect(isCorrectSelection(['B'], ['A'])).toBe(false);
  });

  it('matches multi-answer selections regardless of order', () => {
    expect(isCorrectSelection(['A', 'D'], ['D', 'A'])).toBe(true);
    expect(isCorrectSelection(['A', 'D'], ['A'])).toBe(false);
  });

  it('prefers unseen questions when no-repeat mode is enabled', () => {
    const selection = selectQuizQuestions(
      [
        { number: 1, learnerState: { timesSeen: 2 } },
        { number: 2, learnerState: { timesSeen: 0 } },
        { number: 3, learnerState: { timesSeen: 0 } }
      ],
      {
        order: 'SEQUENTIAL',
        requestedCount: 5,
        noRepeatMode: true
      }
    );

    expect(selection.shouldResetSeenHistory).toBe(false);
    expect(selection.selectedQuestions.map((question) => question.number)).toEqual([2, 3]);
  });

  it('signals when seen history should reset after all questions were seen', () => {
    const selection = selectQuizQuestions(
      [
        { number: 3, learnerState: { timesSeen: 1 } },
        { number: 1, learnerState: { timesSeen: 4 } },
        { number: 2, learnerState: { timesSeen: 2 } }
      ],
      {
        order: 'SEQUENTIAL',
        requestedCount: 2,
        noRepeatMode: true
      }
    );

    expect(selection.shouldResetSeenHistory).toBe(true);
    expect(selection.selectedQuestions.map((question) => question.number)).toEqual([1, 2]);
  });
});
