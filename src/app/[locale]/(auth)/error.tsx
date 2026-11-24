'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

interface AuthErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: AuthErrorPageProps) {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    console.error('[Auth Error]', error);
  }, [error]);

  const handleRetry = () => {
    reset();
    toast({
      title: 'Tentando novamente...',
      description: 'Recarregando a página de autenticação',
      variant: 'default',
    });
  };

  const handleGoLogin = () => {
    reset();
    router.push('/login');
    router.refresh();
  };

  const handleGoHome = () => {
    reset();
    router.push('/');
    router.refresh();
  };

  const handleReportError = () => {
    const errorDetails = error?.message || 'Erro desconhecido';
    const stack = error?.stack || 'Sem stack trace';
    const digest = error?.digest ? `\nDigest: ${error.digest}` : '';
    const url = typeof window !== 'undefined' ? window.location.href : 'SSR';

    navigator.clipboard.writeText(
      `Erro na Autenticação: ${errorDetails}${digest}\n\nStack:\n${stack}\n\nURL: ${url}`
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-destructive/50">
        <CardContent className="pt-6 pb-6 px-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Shield className="h-6 w-6 text-destructive" />
          </div>

          <h2 className="mb-2 text-lg font-semibold">Erro na Autenticação</h2>
          <p className="mb-4 text-muted-foreground">
            Ocorreu um erro na página de login/registro. Por favor, tente novamente.
          </p>

          <div className="mb-4 flex flex-col gap-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={handleGoLogin} className="w-full">
              Ir para Login
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Página Inicial
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
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}