import type { HTMLAttributes, PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    elevated?: boolean;
  }
>;

export function Card({
  children,
  className = '',
  elevated = false,
  ...props
}: CardProps) {
  const classes = ['card'];

  if (elevated) {
    classes.push('card-elevated');
  }

  if (className) {
    classes.push(className);
  }

  return (
    <div {...props} className={classes.join(' ')}>
      {children}
    </div>
  );
}
