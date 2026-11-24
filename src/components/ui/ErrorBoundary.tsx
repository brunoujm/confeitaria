'use client';

import { Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useRouter, usePathname } from 'next/navigation';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Erro capturado:', error);
      console.error('[ErrorBoundary] Stack trace:', errorInfo.componentStack);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to Sentry if available (will be integrated later)
    if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: (error: Error) => void } }).Sentry) {
      (window as unknown as { Sentry: { captureException: (error: Error) => void } }).Sentry.captureException(error);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.reset();
      }
    }

    if (this.props.resetOnPropsChange && this.state.hasError) {
      this.reset();
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.reset} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: DefaultErrorFallbackProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const handleRetry = () => {
    resetError();
    toast({
      title: 'Tentando novamente...',
      description: 'Recarregando a página',
      variant: 'default',
    });
  };

  const handleGoHome = () => {
    resetError();
    router.push('/calendar');
    router.refresh();
  };

  const handleReportError = () => {
    const errorDetails = error?.message || 'Erro desconhecido';
    const stack = error?.stack || 'Sem stack trace';
    const url = typeof window !== 'undefined' ? window.location.href : 'SSR';

    navigator.clipboard.writeText(
      `Erro: ${errorDetails}\n\nStack:\n${stack}\n\nURL: ${url}\nPath: ${pathname}`
    ).then(() => {
      toast({
        title: 'Erro copiado',
        description: 'Detalhes do erro copiados para a área de transferência',
        variant: 'success',
      });
    });
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-[300px] items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/50">
        <CardContent className="pt-6 pb-6 px-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>

          <h2 className="mb-2 text-lg font-semibold">Oops! Algo deu errado</h2>
          <p className="mb-4 text-muted-foreground">
            Encontramos um erro inesperado. Não se preocupe, seus dados estão salvos.
          </p>

          <div className="mb-4 flex gap-2 justify-center">
            <Button onClick={handleRetry} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="flex-1">
              <Home className="h-4 w-4 mr-2" />
              Ir para Início
            </Button>
          </div>

          <Button variant="ghost" onClick={handleReportError} className="w-full mb-4">
            <Bug className="h-4 w-4 mr-2" />
            Copiar Detalhes do Erro
          </Button>

          {isDevelopment && error && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
                Detalhes técnicos (desenvolvimento)
              </summary>
              <pre className="overflow-auto rounded bg-muted p-3 text-xs text-foreground max-h-64">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hook para usar Error Boundary em componentes funcionais
 */
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null);
  const [isError, setIsError] = useState(false);

  const handleError = (err: Error) => {
    setError(err);
    setIsError(true);
  };

  const clearError = () => {
    setError(null);
    setIsError(false);
  };

  return { error, isError, handleError, clearError };
}

// Need to import useState
import { useState } from 'react';