import { describe, expect, it } from 'vitest';

import {
  calculateHotSeatPoints,
  getQuestionExpiration,
  isHotSeatAnswerExpired,
  selectHotSeatParticipant
} from '../src/server/services/hot-seat.logic';

describe('hot seat logic', () => {
  it('prefers the least-selected participant in fair mode', () => {
    const selected = selectHotSeatParticipant(
      [
        { id: 'alpha', timesSelected: 3 },
        { id: 'beta', timesSelected: 1 },
        { id: 'gamma', timesSelected: 2 }
      ],
      'FAIR'
    );

    expect(selected?.id).toBe('beta');
  });

  it('returns some participant in random mode', () => {
    const selected = selectHotSeatParticipant(
      [
        { id: 'alpha', timesSelected: 0 },
        { id: 'beta', timesSelected: 0 }
      ],
      'RANDOM'
    );

    expect(['alpha', 'beta']).toContain(selected?.id);
  });

  it('awards base points plus a speed bonus for fast correct answers', () => {
    expect(
      calculateHotSeatPoints({
        isCorrect: true,
        elapsedSeconds: 10,
        timerSeconds: 50,
        basePoints: 10,
        speedBonusEnabled: true,
        maxSpeedBonus: 5
      })
    ).toEqual({
      pointsAwarded: 14,
      speedBonusPoints: 4
    });
  });

  it('detects when the timer has expired', () => {
    const startedAt = new Date('2026-01-01T00:00:00.000Z');

    expect(getQuestionExpiration(startedAt, 45)?.toISOString()).toBe(
      '2026-01-01T00:00:45.000Z'
    );
    expect(
      isHotSeatAnswerExpired(startedAt, 45, new Date('2026-01-01T00:00:46.000Z'))
    ).toBe(true);
    expect(
      isHotSeatAnswerExpired(startedAt, 45, new Date('2026-01-01T00:00:44.000Z'))
    ).toBe(false);
  });
});
