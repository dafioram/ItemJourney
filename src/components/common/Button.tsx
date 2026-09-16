import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-teal text-cream hover:bg-teal-dark disabled:bg-teal/50',
  secondary: 'border border-line-strong bg-panel-raised text-ink hover:border-teal hover:text-teal-dark',
  ghost: 'text-ink-soft hover:bg-panel hover:text-ink',
  danger: 'border border-brick text-brick-dark hover:bg-brick-soft',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'secondary', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}
