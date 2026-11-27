'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Algo deu errado</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Ocorreu um erro inesperado. Tente recarregar a página ou navegar para outra seção.
          </p>
          <div className="flex gap-3">
            <Button onClick={this.handleRetry} variant="primary">
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Tentar novamente
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                window.location.href = '/calendar';
              }}
            >
              Ir para o Calendário
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 w-full max-w-md text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Detalhes técnicos (desenvolvimento)
              </summary>
              <pre className="mt-2 p-3 bg-[hsl(var(--muted))] rounded text-xs overflow-auto text-[hsl(var(--muted-foreground))]">
                {this.state.error.message}
                {this.state.error.stack && '\n\n' + this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;