'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="page-shell">
          <div className="card error-card">
            <h1>Something went wrong</h1>
            <p className="muted">
              The application hit an unexpected state. If this keeps happening, use the
              request ID shown by the API response or error log to debug it.
            </p>
            <p className="muted">Error digest: {error.digest ?? 'Unavailable'}</p>
            <Button type="button" onClick={reset}>
              Try again
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
