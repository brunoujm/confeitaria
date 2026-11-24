import { Calendar, LayoutDashboard, Image, FileText, Palette, Settings, Bell } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-10 w-10 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Skeleton */}
        <aside className="hidden w-64 flex-col border-r bg-background lg:flex">
          <div className="flex h-16 items-center px-4">
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {[
              { icon: Calendar, label: 'Calendário' },
              { icon: FileText, label: 'Posts' },
              { icon: Image, label: 'Galeria' },
              { icon: FileText, label: 'Templates' },
              { icon: Palette, label: 'Marca' },
              { icon: Settings, label: 'Configurações' },
              { icon: Bell, label: 'Notificações' },
            ].map((item, index) => (
              <div key={index} className="flex h-10 items-center gap-3 rounded-lg px-3 animate-pulse">
                <div className="h-5 w-5 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Page Header Skeleton */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-24 animate-pulse rounded bg-muted" />
          </div>

          {/* Content Grid Skeleton */}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-background p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted mb-3" />
                <div className="h-20 w-full animate-pulse rounded bg-muted mb-3" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}