import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    wide?: boolean;
  }
>;

export function Button({
  children,
  className = '',
  variant = 'primary',
  wide = false,
  ...props
}: ButtonProps) {
  const classes = ['button', `button-${variant}`];

  if (wide) {
    classes.push('button-wide');
  }

  if (className) {
    classes.push(className);
  }

  return (
    <button {...props} className={classes.join(' ')}>
      {children}
    </button>
  );
}
