'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConflictData {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  remoteUser: string;
  timestamp: number;
}

interface ConflictToastProps {
  conflicts: ConflictData[];
  onResolve: (field: string, value: unknown) => void;
  onDismiss: () => void;
}

export function ConflictToast({ conflicts, onResolve, onDismiss }: ConflictToastProps) {
  const [visibleConflicts, setVisibleConflicts] = useState<ConflictData[]>(conflicts);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    setVisibleConflicts(conflicts);
  }, [conflicts]);

  const handleResolve = useCallback((conflict: ConflictData, useRemote: boolean) => {
    setResolving(conflict.field);
    const value = useRemote ? conflict.remoteValue : conflict.localValue;
    onResolve(conflict.field, value);
    setResolving(null);
  }, [onResolve]);

  const handleDismiss = useCallback((field: string) => {
    setVisibleConflicts(prev => prev.filter(c => c.field !== field));
    if (visibleConflicts.length === 1) {
      onDismiss();
    }
  }, [visibleConflicts.length, onDismiss]);

  if (visibleConflicts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-96">
      {visibleConflicts.map((conflict) => (
        <div
          key={conflict.field}
          className={cn(
            'bg-background border border-warning/50 rounded-lg shadow-lg p-4 animate-slide-in',
            resolving === conflict.field && 'opacity-50 pointer-events-none'
          )}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm text-foreground">
                  Conflito detectado em <span className="font-mono">{conflict.field}</span>
                </h4>
                <button
                  onClick={() => handleDismiss(conflict.field)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  disabled={resolving === conflict.field}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {conflict.remoteUser} fez uma alteração simultânea
              </p>

              <div className="mt-3 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 p-2 rounded border">
                    <div className="font-medium text-foreground">Seu valor</div>
                    <div className="font-mono text-sm truncate">{String(conflict.localValue)}</div>
                  </div>
                  <div className="bg-warning/10 p-2 rounded border border-warning/30">
                    <div className="font-medium text-warning">Valor de {conflict.remoteUser}</div>
                    <div className="font-mono text-sm truncate">{String(conflict.remoteValue)}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleResolve(conflict, true)}
                    disabled={resolving === conflict.field}
                    className={cn(
                      'flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors',
                      'bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {resolving === conflict.field ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin inline" />
                        Aplicando...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5 inline" />
                        Usar valor remoto
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleResolve(conflict, false)}
                    disabled={resolving === conflict.field}
                    className={cn(
                      'flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors',
                      'bg-muted text-muted-foreground hover:bg-muted/80',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {resolving === conflict.field ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin inline" />
                        Aplicando...
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5 mr-1.5 inline" />
                        Manter meu valor
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}