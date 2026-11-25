'use client';

import React, { useState, useEffect, useCallback } from 'react';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};
import {
  Upload,
  Image as ImageIcon,
  Video,
  Search,
  Grid,
  List,
  Check,
  Trash2,
  MoreHorizontal,
  Download,
  Loader2,
  X,
} from 'lucide-react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Progress } from '@/components/ui/Progress';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface MediaItem {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  createdAt: string;
  postId?: string | null;
}

export default function GalleryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'IMAGE' | 'VIDEO'>('all');
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isSelectMode, setIsSelectMode] = useState(false);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/media?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setMedia(data.media || []);
      }
    } catch (error) {
      console.error('Erro ao buscar mídia:', error);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, searchQuery]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleFileUpload = async (files: File[]) => {
    for (const file of files) {
      const tempId = crypto.randomUUID();
      setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/media', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setMedia(prev => [{
            id: data.path,
            url: data.url,
            type: data.type,
            size: data.size,
            createdAt: new Date().toISOString(),
          }, ...prev]);
        }
      } catch (error) {
        console.error('Erro no upload:', error);
      } finally {
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedMedia(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    try {
      for (const id of selectedMedia) {
        await fetch(`/api/media?path=${id}`, { method: 'DELETE' });
      }
      setMedia(prev => prev.filter(m => !selectedMedia.has(m.id)));
      setSelectedMedia(new Set());
      setIsSelectMode(false);
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const filteredMedia = media.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (searchQuery && !item.url.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Galeria de Mídia</h1>
          <p className="text-muted-foreground">Gerencie suas imagens e vídeos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Selecionados
          </Button>
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={selectedMedia.size === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir ({selectedMedia.size})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Excluir mídia selecionada</DialogTitle>
                <DialogDescription>
                  Esta ação não pode ser desfeita. Tem certeza?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeleteSelected}>
                  Excluir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <label className="flex items-center justify-center">
            <input
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm,video/quicktime"
              onChange={handleFileSelect}
              className="sr-only"
            />
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </label>
        </div>
      </div>

      {/* Filters and Search */}
      <Card variant="default">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do arquivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'all' | 'IMAGE' | 'VIDEO')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="IMAGE">Imagens</SelectItem>
                <SelectItem value="VIDEO">Vídeos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--muted))] p-1" role="tablist">
              <button
                role="tab"
                aria-selected={view === 'grid'}
                aria-controls="gallery-panel-grid"
                id="gallery-tab-grid"
                tabIndex={view === 'grid' ? 0 : -1}
                onClick={() => setView('grid')}
                onFocus={() => setView('grid')}
                className={cn(
                  'p-2 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2',
                  view === 'grid'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="Visualização em grade"
              >
                <Grid className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                role="tab"
                aria-selected={view === 'list'}
                aria-controls="gallery-panel-list"
                id="gallery-tab-list"
                tabIndex={view === 'list' ? 0 : -1}
                onClick={() => setView('list')}
                onFocus={() => setView('list')}
                className={cn(
                  'p-2 rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2',
                  view === 'list'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="Visualização em lista"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <Card variant="default">
          <CardContent className="pt-6">
            <div className="space-y-2">
              {Object.entries(uploadProgress).map(([id, progress]) => (
                <div key={id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress value={progress} className="h-2" />
                  </div>
                  <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Grid/List */}
      {isLoading ? (
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando mídia...</p>
          </CardContent>
        </Card>
      ) : filteredMedia.length === 0 ? (
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== 'all'
                ? 'Nenhuma mídia encontrada com estes filtros'
                : 'Nenhuma mídia carregada ainda'}
            </p>
            <label className="mt-4 inline-flex">
              <input
                type="file"
                multiple
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={handleFileSelect}
                className="sr-only"
              />
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Fazer primeiro upload
              </Button>
            </label>
          </CardContent>
        </Card>
      ) : (
        <Card variant="default">
          <CardContent className="pt-0">
            {view === 'grid' ? (
              <div
                role="tabpanel"
                id="gallery-panel-grid"
                aria-labelledby="gallery-tab-grid"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-3"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'relative group aspect-square rounded-lg overflow-hidden border border-[hsl(var(--border))] transition-all',
                      selectedMedia.has(item.id) && 'ring-2 ring-primary ring-offset-2',
                      isSelectMode ? 'cursor-pointer' : 'cursor-default'
                    )}
                    onClick={() => isSelectMode ? toggleSelect(item.id) : {}}
                  >
                    {item.type === 'IMAGE' ? (
                      <NextImage
                        src={item.url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="100vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted relative">
                        <video src={item.url} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Video className="h-10 w-10 text-white" />
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {formatDuration(item.duration)}
                        </div>
                      </div>
                    )}

                    {isSelectMode && (
                      <div className="absolute top-2 right-2">
                        <div
                          className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                            selectedMedia.has(item.id)
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'bg-white/80 border-border text-transparent'
                          )}
                        >
                          {selectedMedia.has(item.id) && <Check className="h-4 w-4" />}
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between text-xs text-white">
                        <span className="truncate max-w-[80px]">{item.url.split('/').pop()?.split('.')[0]}</span>
                        <span>{formatFileSize(item.size)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                role="tabpanel"
                id="gallery-panel-list"
                aria-labelledby="gallery-tab-list"
                className="divide-y divide-[hsl(var(--border))]"
              >
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-4 p-3 transition-colors',
                      selectedMedia.has(item.id) && 'bg-primary/5',
                      isSelectMode ? 'cursor-pointer' : ''
                    )}
                    onClick={() => isSelectMode ? toggleSelect(item.id) : {}}
                  >
                    {isSelectMode && (
                      <div className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        selectedMedia.has(item.id)
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-[hsl(var(--border))]'
                      )}>
                        {selectedMedia.has(item.id) && <Check className="h-4 w-4" />}
                      </div>
                    )}

                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted relative">
                      {item.type === 'IMAGE' ? (
                        <NextImage src={item.url} alt="" fill className="object-cover" />
                      ) : (
                        <video src={item.url} className="w-full h-full object-cover" muted />
                      )}
                      {item.type === 'VIDEO' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Video className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.url.split('/').pop()?.split('.')[0] || 'Arquivo'}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <Badge variant="secondary" className="px-2 py-0.5 rounded">{item.type}</Badge>
                        <span>{formatFileSize(item.size)}</span>
                        {item.width && item.height && <span>{item.width}×{item.height}</span>}
                        {item.duration && <span>{formatDuration(item.duration)}</span>}
                        <span>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <Popover>
                      <PopoverTrigger>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Mais opções">
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end">
                        <Button variant="outline" className="w-full justify-start" onClick={() => {}}>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar
                        </Button>
                        <Button variant="destructive" className="w-full justify-start" onClick={() => {}}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selection Mode Indicator */}
      {selectedMedia.size > 0 && !isSelectMode && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <Card variant="default" className="shadow-lg">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="font-medium">{selectedMedia.size} item{selectedMedia.size > 1 ? 's' : ''} selecionado{selectedMedia.size > 1 ? 's' : ''}</span>
              <Button size="sm" onClick={() => setIsSelectMode(true)}>
                Ações em lote
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMedia(new Set())}>
                Limpar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {isSelectMode && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-slide-up">
          <Card variant="default" className="shadow-lg">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedMedia.size} selecionado{selectedMedia.size > 1 ? 's' : ''}</span>
                <Button variant="ghost" size="icon" onClick={() => { setIsSelectMode(false); setSelectedMedia(new Set()); }} aria-label="Sair do modo seleção">
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <Button variant="destructive" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir selecionados
              </Button>
              <Button variant="outline" className="w-full" onClick={() => {}}>
                <Download className="h-4 w-4 mr-2" />
                Baixar selecionados
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setIsSelectMode(false)}>
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}