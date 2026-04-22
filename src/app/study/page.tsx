import { AppShell } from '@/components/layout/app-shell';
import StudyPageClient from '@/features/study/components/study-page-client';
import { getServerRequestContext } from '@/lib/request-context';
import { listChallenges } from '@/server/services/challenging.service';
import { getQuestionMetrics, listQuestions } from '@/server/services/question.service';

export default async function StudyPage() {
  const context = await getServerRequestContext();
  const [questions, challenges, counts] = await Promise.all([
    listQuestions(context.learner.id, { scope: 'all' }, context.logger),
    listChallenges(context.learner.id, context.logger),
    getQuestionMetrics(context.learner.id, context.logger)
  ]);

  return (
    <AppShell
      title="Study Mode"
      description="Search the AWS bank, reveal explanations on demand, and mark the concepts that still need work."
    >
      <StudyPageClient
        initialQuestions={questions}
        initialChallenges={challenges}
        counts={counts}
      />
    </AppShell>
  );
}
