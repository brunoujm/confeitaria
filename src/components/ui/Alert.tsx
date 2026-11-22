'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success';
  onClose?: () => void;
}

export function Alert({ className, variant = 'default', onClose, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
        {
          'border-border bg-background': variant === 'default',
          'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200':
            variant === 'destructive',
          'border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200':
            variant === 'success',
        },
        className
      )}
      {...props}
    >
      {children}
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('absolute right-4 top-4 text-foreground/50 hover:text-foreground')}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </Button>
      )}
    </div>
  );
}

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  );
}

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
  );
}

interface AlertActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function AlertAction({ children, ...props }: AlertActionProps) {
  return (
    <Button variant="link" className="mt-4 text-sm underline-offset-4 hover:underline" {...props}>
      {children}
    </Button>
  );
}