'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info' }
>(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-foreground',
    destructive: 'border-[hsl(var(--destructive-border))] bg-[hsl(var(--destructive-light))] text-[hsl(var(--destructive))] dark:border-[hsl(var(--destructive-border))] dark:bg-[hsl(var(--destructive-light))] dark:text-[hsl(var(--destructive-light))]',
    success: 'border-[hsl(var(--success-border))] bg-[hsl(var(--success-light))] text-[hsl(var(--success))] dark:border-[hsl(var(--success-border))] dark:bg-[hsl(var(--success-light))] dark:text-[hsl(var(--success-light))]',
    warning: 'border-[hsl(var(--warning-border))] bg-[hsl(var(--warning-light))] text-[hsl(var(--warning))] dark:border-[hsl(var(--warning-border))] dark:bg-[hsl(var(--warning-light))] dark:text-[hsl(var(--warning-light))]',
    info: 'border-[hsl(var(--info-border))] bg-[hsl(var(--info-light))] text-[hsl(var(--info))] dark:border-[hsl(var(--info-border))] dark:bg-[hsl(var(--info-light))] dark:text-[hsl(var(--info-light))]',
  };

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px]',
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };