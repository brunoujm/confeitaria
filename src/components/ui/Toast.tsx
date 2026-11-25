'use client';

import type { ReactNode } from 'react';
import { useState, useCallback, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((newToast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const fullToast = { ...newToast, id };
    setToasts((prev) => [...prev, fullToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, newToast.duration ?? 5000);

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[360px] max-w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const variants = {
    default: 'border border-input bg-background',
    destructive: 'border border-destructive/50 bg-destructive/10 text-destructive',
    success: 'border border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
  };

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-lg shadow-lg animate-in slide-in-from-right duration-300',
        variants[toast.variant ?? 'default']
      )}
    >
      <div className="flex-1">
        <h4 className="font-medium">{toast.title}</h4>
        {toast.description && <p className="text-sm opacity-90 mt-1">{toast.description}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => onDismiss(toast.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}