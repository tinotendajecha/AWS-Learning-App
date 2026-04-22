import type { AppLogger } from '@/lib/logger';
import {
  createAnonymousLearner,
  findLearnerByAnonymousKey,
  touchLearner
} from '@/server/repositories/learner.repository';

export async function resolveLearnerByAnonymousKey(
  anonymousKey: string,
  log: AppLogger
) {
  const existingLearner = await findLearnerByAnonymousKey(anonymousKey);

  if (existingLearner) {
    const learner = await touchLearner(existingLearner.id);
    log.debug({ learnerId: learner.id }, 'Resolved existing learner');
    return learner;
  }

  const learner = await createAnonymousLearner(anonymousKey);
  log.info({ learnerId: learner.id }, 'Created anonymous learner');
  return learner;
}
