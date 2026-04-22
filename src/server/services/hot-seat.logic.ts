import type {
  HotSeatParticipantDto,
  HotSeatSelectionMode
} from '@/contracts/api';

type ParticipantLike = Pick<HotSeatParticipantDto, 'id' | 'timesSelected'>;

export function shuffleItems<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[targetIndex]] = [copy[targetIndex], copy[index]];
  }

  return copy;
}

export function selectHotSeatParticipant<T extends ParticipantLike>(
  participants: T[],
  selectionMode: HotSeatSelectionMode
) {
  if (participants.length === 0) {
    return null;
  }

  if (selectionMode === 'RANDOM') {
    return shuffleItems(participants)[0] ?? null;
  }

  const minimumSelections = Math.min(
    ...participants.map((participant) => participant.timesSelected)
  );
  const candidatePool = participants.filter(
    (participant) => participant.timesSelected === minimumSelections
  );

  return shuffleItems(candidatePool)[0] ?? null;
}

export function getQuestionExpiration(startedAt: Date | null, timerSeconds: number) {
  if (!startedAt) {
    return null;
  }

  return new Date(startedAt.getTime() + timerSeconds * 1000);
}

export function getElapsedSeconds(startedAt: Date | null, now: Date) {
  if (!startedAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((now.getTime() - startedAt.getTime()) / 1000));
}

export function isHotSeatAnswerExpired(
  startedAt: Date | null,
  timerSeconds: number,
  now: Date
) {
  const expiresAt = getQuestionExpiration(startedAt, timerSeconds);

  if (!expiresAt) {
    return false;
  }

  return now.getTime() > expiresAt.getTime();
}

export function calculateHotSeatPoints(input: {
  isCorrect: boolean;
  elapsedSeconds: number;
  timerSeconds: number;
  basePoints: number;
  speedBonusEnabled: boolean;
  maxSpeedBonus: number;
}) {
  if (!input.isCorrect) {
    return {
      pointsAwarded: 0,
      speedBonusPoints: 0
    };
  }

  if (!input.speedBonusEnabled || input.maxSpeedBonus <= 0) {
    return {
      pointsAwarded: input.basePoints,
      speedBonusPoints: 0
    };
  }

  const clampedElapsed = Math.min(Math.max(input.elapsedSeconds, 0), input.timerSeconds);
  const remainingRatio = Math.max(input.timerSeconds - clampedElapsed, 0) / input.timerSeconds;
  const speedBonusPoints = Math.round(remainingRatio * input.maxSpeedBonus);

  return {
    pointsAwarded: input.basePoints + speedBonusPoints,
    speedBonusPoints
  };
}
