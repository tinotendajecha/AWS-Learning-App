import type { PropsWithChildren } from 'react';

type PillProps = PropsWithChildren<{
  tone?: 'neutral' | 'success' | 'warning';
}>;

export function Pill({ children, tone = 'neutral' }: PillProps) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
