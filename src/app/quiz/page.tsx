import Link from 'next/link';

import { AppShell } from '@/components/layout/app-shell';
import QuizPageClient from '@/features/quiz/components/quiz-page-client';
import { getServerRequestContext } from '@/lib/request-context';
import { getPreferences } from '@/server/services/preferences.service';
import { getQuestionMetrics } from '@/server/services/question.service';

export default async function QuizPage() {
  const context = await getServerRequestContext();
  const [preferences, counts] = await Promise.all([
    getPreferences(context.learner.id, context.logger),
    getQuestionMetrics(context.learner.id, context.logger)
  ]);

  return (
    <AppShell
      title="Quiz Mode"
      description="Run focused quiz sessions, score answers server-side, and send mistakes straight into your challenge list."
      actions={
        <Link href="/study" className="button button-secondary">
          Back to Study
        </Link>
      }
    >
      <QuizPageClient initialPreferences={preferences} counts={counts} />
    </AppShell>
  );
}
