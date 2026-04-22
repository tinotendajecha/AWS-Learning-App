import Link from 'next/link';

import { AppShell } from '@/components/layout/app-shell';
import HotSeatHomeClient from '@/features/hot-seat/components/hot-seat-home-client';
import { getServerRequestContext } from '@/lib/request-context';
import { getQuestionMetrics } from '@/server/services/question.service';

export default async function HotSeatPage() {
  const context = await getServerRequestContext();
  const counts = await getQuestionMetrics(context.learner.id, context.logger);

  return (
    <AppShell
      title="Hot Seat Quiz Mode"
      description="Run a classroom session with a join code, rotate a single student into the answer seat, and review every response afterward."
      actions={
        <div className="row gap-sm row-wrap">
          <Link href="/quiz" className="button button-secondary">
            Standard Quiz
          </Link>
          <Link href="/study" className="button button-primary">
            Study Mode
          </Link>
        </div>
      }
    >
      <HotSeatHomeClient counts={counts} />
    </AppShell>
  );
}
