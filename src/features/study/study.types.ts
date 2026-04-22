import type { ChallengeItemDto, QuestionCountsDto, QuestionDto } from '@/contracts/api';

export type StudyPageClientProps = {
  initialQuestions: QuestionDto[];
  initialChallenges: ChallengeItemDto[];
  counts: QuestionCountsDto;
};
