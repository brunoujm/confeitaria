'use client';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarGrid, CalendarWeekView, CalendarListView } from '@/components/calendar/CalendarGrid';
import { usePosts } from '@/hooks/usePosts';
import { Post, PostType, PostStatus } from '@/lib/validations/post';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'list'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PostType[]>([]);
  const [statusFilter, setStatusFilter] = useState<PostStatus[]>([]);

  const startOfMonthDate = startOfMonth(currentMonth);
  const endOfMonthDate = endOfMonth(currentMonth);

  const { data, isLoading, error, refetch } = usePosts({
    view: 'month',
    start: startOfMonthDate.toISOString(),
    end: endOfMonthDate.toISOString(),
    type: typeFilter.length > 0 ? typeFilter : undefined,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    page: 1,
    limit: 100,
  });

  const posts = data?.posts || [];
  const filteredPosts = searchQuery
    ? posts.filter((post: Post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.caption?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  const monthName = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const today = () => setCurrentMonth(new Date());

  const handlePostClick = (post: Post) => {
    console.log('Post clicked:', post);
    // TODO: Open post editor modal
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
            <p className="text-muted-foreground">Gerencie seus posts agendados</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Carregando posts...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
            <p className="text-muted-foreground">Gerencie seus posts agendados</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-red-500">
            <p>Erro ao carregar posts: {error.message}</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
          <p className="text-muted-foreground">Gerencie seus posts agendados</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={typeFilter.join(',')}
            onValueChange={(value) => setTypeFilter((value ? value.split(',') : []) as PostType[])}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FEED">Feed</SelectItem>
              <SelectItem value="STORIES">Stories</SelectItem>
              <SelectItem value="REELS">Reels</SelectItem>
              <SelectItem value="WHATSAPP_STATUS">WhatsApp Status</SelectItem>
              <SelectItem value="WHATSAPP_CATALOG">WhatsApp Catálogo</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter.join(',')}
            onValueChange={(value) => setStatusFilter((value ? value.split(',') : []) as PostStatus[])}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="APPROVED">Aprovado</SelectItem>
              <SelectItem value="PUBLISHED">Publicado</SelectItem>
              <SelectItem value="ARCHIVED">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Navigation and View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={today}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="px-4 text-sm font-medium">{monthName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-lg" role="tablist">
            {(['month', 'week', 'list'] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  view === v
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v === 'month' && 'Mês'}
                {v === 'week' && 'Semana'}
                {v === 'list' && 'Lista'}
              </button>
            ))}
          </div>
          <Button onClick={() => router.push('/posts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Post
          </Button>
        </div>
      </div>

      {/* Calendar Views */}
      <Card>
        <CardHeader>
          <CardTitle>{view === 'month' && monthName}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {view === 'month' && (
            <CalendarGrid
              posts={filteredPosts}
              currentMonth={currentMonth}
              onPostClick={handlePostClick}
            />
          )}
          {view === 'week' && (
            <CalendarWeekView
              posts={filteredPosts}
              currentDate={currentMonth}
              onPostClick={handlePostClick}
            />
          )}
          {view === 'list' && (
            <CalendarListView
              posts={filteredPosts}
              onPostClick={handlePostClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/20" />
              <span>Feed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple/20" />
              <span>Stories</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange/20" />
              <span>Reels</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green/20" />
              <span>WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border border-dashed" />
              <span>Rascunho</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green/20" />
              <span>Aprovado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue/20" />
              <span>Publicado</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}