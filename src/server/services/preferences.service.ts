import type { PreferencesDto } from '@/contracts/api';
import type { AppLogger } from '@/lib/logger';
import {
  getOrCreatePreferences,
  updatePreferences as persistPreferences
} from '@/server/repositories/preferences.repository';

function toDto(input: {
  noRepeatMode: boolean;
  removeChallengeOnCorrect: boolean;
}): PreferencesDto {
  return {
    noRepeatMode: input.noRepeatMode,
    removeChallengeOnCorrect: input.removeChallengeOnCorrect
  };
}

export async function getPreferences(learnerId: string, log: AppLogger) {
  const preferences = await getOrCreatePreferences(learnerId);
  log.debug({ learnerId }, 'Loaded learner preferences');
  return toDto(preferences);
}

export async function updatePreferences(
  learnerId: string,
  input: PreferencesDto,
  log: AppLogger
) {
  const preferences = await persistPreferences(learnerId, input);
  log.info({ learnerId, preferences: input }, 'Updated learner preferences');
  return toDto(preferences);
}
