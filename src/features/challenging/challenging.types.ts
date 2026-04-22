import type { ChallengeItemDto } from '@/contracts/api';

export type ChallengingListProps = {
  items: ChallengeItemDto[];
  isLoading?: boolean;
};
