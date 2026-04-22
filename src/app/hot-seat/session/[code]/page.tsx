import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import HotSeatSessionClient from '@/features/hot-seat/components/hot-seat-session-client';
import { getServerRequestContext } from '@/lib/request-context';
import { getHotSeatSession } from '@/server/services/hot-seat.service';

type HotSeatSessionPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function HotSeatSessionPage({
  params
}: HotSeatSessionPageProps) {
  const { code } = await params;
  const context = await getServerRequestContext();

  try {
    const session = await getHotSeatSession(context.learner.id, code, context.logger);

    return (
      <AppShell
        title="Live Hot Seat Session"
        description="Poll the session state, keep the countdown on the client, and let only the assigned student answer each turn."
        actions={
          <div className="row gap-sm row-wrap">
            <Link href="/hot-seat" className="button button-primary">
              New Session
            </Link>
            <Link href="/quiz" className="button button-secondary">
              Standard Quiz
            </Link>
          </div>
        }
      >
        <HotSeatSessionClient initialSession={session} />
      </AppShell>
    );
  } catch {
    notFound();
  }
}
