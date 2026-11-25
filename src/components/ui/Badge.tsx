import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors';

    const variants = {
      default: 'border-transparent bg-primary/10 text-primary',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      destructive: 'border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20',
      outline: 'border-[hsl(var(--border))] text-foreground',
      success: 'border-transparent bg-[hsl(var(--success-light))] text-[hsl(var(--success))] dark:bg-[hsl(var(--success-border))] dark:text-[hsl(var(--success-light))]',
      warning: 'border-transparent bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] dark:bg-[hsl(var(--warning-border))] dark:text-[hsl(var(--warning-light))]',
      info: 'border-transparent bg-[hsl(var(--info-light))] text-[hsl(var(--info))] dark:bg-[hsl(var(--info-border))] dark:text-[hsl(var(--info-light))]',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };