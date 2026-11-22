'use client';

import { useState } from 'react';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, Eye, Calendar, CheckCircle, Clock, Archive } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Separator } from '@/components/ui/Separator';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePosts, useDeletePost } from '@/hooks/usePosts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  DRAFT: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  APPROVED: { label: 'Aprovado', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  PUBLISHED: { label: 'Publicado', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  ARCHIVED: { label: 'Arquivado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
} as const;

const typeConfig = {
  FEED: { label: 'Feed', icon: '📱' },
  STORIES: { label: 'Stories', icon: '📸' },
  REELS: { label: 'Reels', icon: '🎬' },
  WHATSAPP_STATUS: { label: 'WhatsApp Status', icon: '💬' },
  WHATSAPP_CATALOG: { label: 'WhatsApp Catálogo', icon: '🛍️' },
} as const;

function PostRow({ post, onDelete }: { post: any; onDelete: (id: string) => void }) {
  const status = statusConfig[post.status as keyof typeof statusConfig];
  const type = typeConfig[post.type as keyof typeof typeConfig];

  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {post.media?.[0]?.url && (
            <img
              src={post.media[0].url}
              alt={post.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div>
            <p className="font-medium text-sm">{post.title}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {post.caption || 'Sem legenda'}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <Badge variant="secondary">{type.icon} {type.label}</Badge>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-sm text-muted-foreground">
          {post.author?.name || post.author?.email}
        </span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-sm text-muted-foreground">
          {post.scheduledAt
            ? format(new Date(post.scheduledAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
            : post.createdAt
            ? format(new Date(post.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
            : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem asChild>
              <Link href={`/posts/${post.id}`} className="flex w-full items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Visualizar</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/posts/${post.id}?edit=true`} className="flex w-full items-center gap-2">
                <Edit className="h-4 w-4" />
                <span>Editar</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (confirm('Tem certeza que deseja excluir este post?')) {
                  onDelete(post.id);
                }
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span>Excluir</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function PostSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32 mt-1" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-20" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-5 w-24" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-28" /></td>
      <td className="px-4 py-3"><Skeleton className="h-8 w-8 mx-auto" /></td>
    </tr>
  );
}

export default function PostsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    view: 'list' as const,
    type: [] as string[],
    status: [] as string[],
    search: '',
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data, isLoading, error, refetch } = usePosts({
    page,
    limit: 20,
    type: filters.type.length > 0 ? filters.type as any : undefined,
    status: filters.status.length > 0 ? filters.status as any : undefined,
  });

  const deleteMutation = useDeletePost();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => refetch(),
    });
  };

  const handleFilterChange = (key: string, value: string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Posts</h1>
          <p className="text-muted-foreground">Gerencie todos os seus posts agendados e publicados</p>
        </div>
        <Link href="/posts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Post
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar posts..."
                value={filters.search}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.type.join(',')}
                onValueChange={(value) => handleFilterChange('type', value ? value.split(',').filter(Boolean) : [])}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipos" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.status.join(',')}
                onValueChange={(value) => handleFilterChange('status', value ? value.split(',').filter(Boolean) : [])}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <Badge variant="outline" className={config.className}>
                        {config.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        {isLoading ? (
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Post</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Autor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}
              </tbody>
            </table>
          </div>
        ) : error ? (
          <CardContent className="py-12 text-center text-destructive">
            <p>Erro ao carregar posts: {error.message}</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Tentar novamente
            </Button>
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Post</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Autor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Data</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.posts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Calendar className="h-12 w-12 text-muted-foreground/30" />
                          <p>Nenhum post encontrado</p>
                          <p className="text-sm">Comece criando seu primeiro post</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data?.posts.map((post: any) => (
                      <PostRow key={post.id} post={post} onDelete={handleDelete} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <CardFooter className="flex items-center justify-between border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {totalPages} — {data?.pagination?.total} posts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            )}
          </>
        )}
      </Card>
    </div>
  );
}