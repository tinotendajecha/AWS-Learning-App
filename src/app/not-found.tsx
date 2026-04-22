import Link from 'next/link';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NotFound() {
  return (
    <AppShell
      title="Page Not Found"
      description="The route you asked for is not available in the rebuilt quiz app."
    >
      <Card elevated>
        <div className="stack">
          <p className="muted">
            Try heading back to study mode or launch a new quiz from the main flow.
          </p>
          <div className="row gap-sm row-wrap">
            <Link href="/study" className="button button-primary">
              Go to Study
            </Link>
            <Link href="/quiz" className="button button-secondary">
              Go to Quiz
            </Link>
            <Link href="/hot-seat" className="button button-ghost">
              Go to Hot Seat
            </Link>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
