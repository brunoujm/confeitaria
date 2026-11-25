'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorPageProps) {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Log global error
    console.error('[Global Error]', error);

    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error]);

  const handleRetry = () => {
    reset();
    toast({
      title: 'Tentando reconectar...',
      description: 'Recarregando a aplicação',
      variant: 'default',
    });
  };

  const handleGoHome = () => {
    reset();
    window.location.href = '/calendar';
  };

  const handleReportError = () => {
    const errorDetails = error?.message || 'Erro desconhecido';
    const stack = error?.stack || 'Sem stack trace';
    const digest = error?.digest ? `\nDigest: ${error.digest}` : '';
    const url = typeof window !== 'undefined' ? window.location.href : 'SSR';

    navigator.clipboard.writeText(
      `Erro Global: ${errorDetails}${digest}\n\nStack:\n${stack}\n\nURL: ${url}\nOnline: ${isOnline}`
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
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Erro - Confeitaria Content Manager</title>
      </head>
      <body className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          {!isOnline && (
            <div className="mb-4 p-4 text-center rounded-lg bg-amber/10 border border-amber/30 text-amber-800 dark:text-amber-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <WifiOff className="h-5 w-5" />
                <span className="font-medium">Você está offline</span>
              </div>
              <p className="text-sm">Verifique sua conexão e tente novamente.</p>
            </div>
          )}

          <Card className="border-destructive/50">
            <CardContent className="pt-6 pb-6 px-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>

              <h2 className="mb-2 text-lg font-semibold">Erro Crítico na Aplicação</h2>
              <p className="mb-4 text-muted-foreground">
                A aplicação encontrou um erro irrecuperável. Por favor, recarregue a página.
              </p>

              <div className="mb-4 flex flex-col gap-2">
                <Button onClick={handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar Aplicação
                </Button>
                <Button variant="outline" onClick={handleGoHome} className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Voltar ao Início
                </Button>
              </div>

              <Button variant="ghost" onClick={handleReportError} className="w-full mb-4">
                <Bug className="h-4 w-4 mr-2" />
                Copiar Detalhes do Erro
              </Button>

              {isDevelopment && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
                    Detalhes técnicos (desenvolvimento)
                  </summary>
                  <pre className="overflow-auto rounded bg-muted p-3 text-xs text-foreground max-h-64">
                    {error?.message}
                    {error?.stack && `\n\n${error.stack}`}
                    {error?.digest && `\n\nDigest: ${error.digest}`}
                    {`\n\nOnline: ${isOnline}`}
                    {`\nUser Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}