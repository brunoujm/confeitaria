import { Home, Search, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 px-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>

          <h1 className="mb-2 text-3xl font-bold">404</h1>
          <h2 className="mb-4 text-lg font-semibold">Página não encontrada</h2>
          <p className="mb-6 text-muted-foreground">
            A página que você procura não existe ou foi movida.
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/calendar">
              <Button className="w-full">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Ir ao Calendário
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
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