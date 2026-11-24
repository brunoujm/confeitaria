'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useRouter, usePathname } from 'next/navigation';

interface DashboardErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  const handleRetry = () => {
    reset();
    toast({
      title: 'Tentando novamente...',
      description: 'Recarregando o painel',
      variant: 'default',
    });
  };

  const handleGoCalendar = () => {
    reset();
    router.push('/calendar');
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
      `Erro no Dashboard: ${errorDetails}${digest}\n\nStack:\n${stack}\n\nURL: ${url}\nPath: ${pathname}`
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
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/50">
        <CardContent className="pt-6 pb-6 px-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>

          <h2 className="mb-2 text-lg font-semibold">Erro no Painel</h2>
          <p className="mb-4 text-muted-foreground">
            Ocorreu um erro ao carregar esta seção do painel. Seus dados estão seguros.
          </p>

          <div className="mb-4 flex gap-2 justify-center">
            <Button onClick={handleRetry} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={handleGoCalendar} className="flex-1">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Ir ao Calendário
            </Button>
          </div>

          <Button variant="outline" onClick={handleGoHome} className="w-full mb-4">
            <Home className="h-4 w-4 mr-2" />
            Página Inicial
          </Button>

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