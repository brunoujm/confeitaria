'use client';

import { Home, Search, LayoutDashboard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';

export default function DashboardNotFound() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 px-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>

          <h1 className="mb-2 text-3xl font-bold">404</h1>
          <h2 className="mb-4 text-lg font-semibold">Seção não encontrada</h2>
          <p className="mb-6 text-muted-foreground">
            Esta seção do painel não existe ou não está disponível no momento.
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/calendar">
              <Button className="w-full">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Voltar ao Calendário
              </Button>
            </Link>
            <Button variant="outline" onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Link href="/">
              <Button variant="ghost" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Página Inicial
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}