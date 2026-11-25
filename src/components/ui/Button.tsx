import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none';

    const variants = {
      primary: 'rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-[hsl(var(--primary-hover))] hover:shadow-md',
      secondary: 'rounded-lg bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))]',
      outline: 'rounded-lg border border-[hsl(var(--border))] bg-background hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
      ghost: 'rounded-lg hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]',
      destructive: 'rounded-lg bg-destructive text-destructive-foreground shadow-sm hover:bg-[hsl(var(--destructive))/0.9] hover:shadow-md',
      link: 'text-primary underline-offset-4 hover:underline',
    };

    const sizes = {
      sm: 'h-9 px-3 text-xs rounded-md gap-1.5',
      md: 'h-10 px-4 py-2 text-sm rounded-lg gap-2',
      lg: 'h-11 px-6 text-base rounded-lg gap-2',
      icon: 'h-10 w-10 rounded-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';