'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { AccountMenu } from '@/components/ui/AccountMenu';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  LayoutDashboard,
  FileText,
  Images,
  LayoutGrid,
  Palette,
  Settings,
  Bell,
  Menu,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Calendário', href: '/calendar', icon: LayoutDashboard },
  { name: 'Posts', href: '/posts', icon: FileText },
  { name: 'Galeria', href: '/gallery', icon: Images },
  { name: 'Templates', href: '/templates', icon: LayoutGrid },
  { name: 'Marca', href: '/brand', icon: Palette },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r border-[hsl(var(--border))] transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-[hsl(var(--border))]">
            <Link href="/calendar" className="text-xl font-bold text-foreground">
              Doce Sabor
            </Link>
            <button
              className="lg:hidden p-2 rounded-md hover:bg-[hsl(var(--accent))] transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto" aria-label="Navegação principal">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-[hsl(var(--border))] p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {session?.user?.image ? (
                  <AvatarImage src={session.user.image} alt={session.user.name || ''} />
                ) : (
                  <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session?.user?.name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-[hsl(var(--border))]">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-md hover:bg-[hsl(var(--accent))] transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Page title */}
            <h1 className="text-lg font-semibold lg:hidden">
              {navigation.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))?.name || 'Dashboard'}
            </h1>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <button className="relative p-2 rounded-full hover:bg-[hsl(var(--accent))] transition-colors" aria-label="Notificações, 3 não lidas">
                <Bell className="h-5 w-5" aria-hidden="true" />
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-white flex items-center justify-center" aria-hidden="true">
                  3
                </span>
              </button>

              {/* User dropdown */}
              <AccountMenu />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}