import Link from 'next/link';
import type { PropsWithChildren, ReactNode } from 'react';

type AppShellProps = PropsWithChildren<{
  title: string;
  description: string;
  actions?: ReactNode;
}>;

export function AppShell({
  title,
  description,
  actions,
  children
}: AppShellProps) {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker">AWS Learning App</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="hero-actions">
          <nav className="top-nav" aria-label="Primary">
            <Link href="/study" className="nav-link">
              Study
            </Link>
            <Link href="/quiz" className="nav-link">
              Quiz
            </Link>
            <Link href="/hot-seat" className="nav-link">
              Hot Seat
            </Link>
          </nav>
          {actions}
        </div>
      </section>
      {children}
    </main>
  );
}
