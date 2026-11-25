'use client';

import React, { useState, useEffect, useCallback } from 'react';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};

import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Grid,
  List,
  Edit2,
  Trash2,
  Copy,
  MoreHorizontal,
  Loader2,
  LayoutDashboard,
} from 'lucide-react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Separator } from '@/components/ui/Separator';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  structure: {
    caption?: string | null;
    hashtags?: string[];
    media?: Array<{ type: 'IMAGE' | 'VIDEO'; placeholder: string }>;
    type?: 'FEED' | 'STORIES' | 'REELS' | 'WHATSAPP_STATUS' | 'WHATSAPP_CATALOG';
  };
  isPublic: boolean;
  thumbnail: string | null;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  structure: {
    caption: string;
    hashtags: string[];
    media: Array<{ type: 'IMAGE' | 'VIDEO'; placeholder: string }>;
    type: 'FEED' | 'STORIES' | 'REELS' | 'WHATSAPP_STATUS' | 'WHATSAPP_CATALOG';
  };
  isPublic: boolean;
  thumbnail: string;
}

const POST_TYPES = [
  { value: 'FEED', label: 'Feed' },
  { value: 'STORIES', label: 'Stories' },
  { value: 'REELS', label: 'Reels' },
  { value: 'WHATSAPP_STATUS', label: 'WhatsApp Status' },
  { value: 'WHATSAPP_CATALOG', label: 'WhatsApp Catálogo' },
] as const;

const CATEGORIES = [
  'Promocional',
  'Educativo',
  'Inspiracional',
  'Bastidores',
  'Depoimento',
  'Datas Comemorativas',
  'Lançamento',
  'Outros',
];

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderTemplate, setBuilderTemplate] = useState<Template | null>(null);

  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    category: 'Promocional',
    structure: {
      caption: '',
      hashtags: [],
      media: [],
      type: 'FEED',
    },
    isPublic: true,
    thumbnail: '',
  });

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const response = await fetch(`/api/templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'Promocional',
      structure: {
        caption: '',
        hashtags: [],
        media: [],
        type: 'FEED',
      },
      isPublic: true,
      thumbnail: '',
    });
    setEditingTemplate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchTemplates();
        setShowCreateDialog(false);
        resetForm();
      } else {
        const error = await response.json();
        console.error('Erro ao salvar template:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar template:', error);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      structure: {
        caption: template.structure.caption || '',
        hashtags: template.structure.hashtags || [],
        media: template.structure.media || [],
        type: template.structure.type || 'FEED',
      },
      isPublic: template.isPublic,
      thumbnail: template.thumbnail || '',
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;
    try {
      const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Erro ao excluir template:', error);
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          name: `${template.name} (Cópia)`,
          id: undefined,
          userId: undefined,
          user: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        }),
      });
      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
    }
  };

  const handleUseTemplate = (template: Template) => {
    router.push(`/posts/new?template=${template.id}`);
  };

  const handleOpenBuilder = (template?: Template) => {
    if (template) {
      setBuilderTemplate(template);
    } else {
      setBuilderTemplate({
        id: '',
        name: '',
        description: '',
        category: 'Promocional',
        structure: {
          caption: '',
          hashtags: [],
          media: [],
          type: 'FEED',
        },
        isPublic: true,
        thumbnail: null,
        userId: '',
        user: { id: '', name: null, email: '', image: null },
        createdAt: '',
        updatedAt: '',
      });
    }
    setShowBuilder(true);
  };

  const filteredTemplates = templates.filter(t => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (typeFilter !== 'all' && t.structure.type !== typeFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'FEED': return 'bg-primary/10 text-primary border-primary/20';
      case 'STORIES': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'REELS': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'WHATSAPP_STATUS':
      case 'WHATSAPP_CATALOG': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-muted';
    }
  };

  const getTypeLabel = (type: string) => {
    const found = POST_TYPES.find(p => p.value === type);
    return found ? found.label : type;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Crie e gerencie templates de posts</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
          <Button variant="outline" onClick={() => handleOpenBuilder()}>
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Construtor Visual
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card variant="default">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {POST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 rounded-lg bg-[hsl(var(--muted))] p-1" role="tablist">
              <button
                role="tab"
                aria-selected={view === 'grid'}
                aria-controls="templates-panel-grid"
                id="templates-tab-grid"
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
                aria-controls="templates-panel-list"
                id="templates-tab-list"
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

      {/* Templates Grid/List */}
      {isLoading ? (
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando templates...</p>
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all'
                ? 'Nenhum template encontrado com estes filtros'
                : 'Nenhum template criado ainda'}
            </p>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card variant="default">
          <CardContent className="pt-0">
            {view === 'grid' ? (
              <div
                role="tabpanel"
                id="templates-panel-grid"
                aria-labelledby="templates-tab-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4"
              >
                {filteredTemplates.map((template) => (
                  <div key={template.id} className="flex flex-col h-full">
                    <Card variant="default" className="flex-1 flex flex-col">
                      {/* Thumbnail */}
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {template.thumbnail ? (
                          <NextImage src={template.thumbnail} alt={template.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <LayoutDashboard className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                          {template.isPublic && (
                            <Badge variant="success" className="px-2 py-0.5 text-xs">Público</Badge>
                          )}
                          <Badge className={cn('px-2 py-0.5 text-xs', getTypeColor(template.structure.type || 'FEED'))}>
                            {getTypeLabel(template.structure.type || 'FEED')}
                          </Badge>
                        </div>
                      </div>

                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg line-clamp-1">{template.name}</CardTitle>
                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{template.description}</p>
                        )}
                      </CardHeader>

                      <CardContent className="flex-1 flex flex-col">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <Badge variant="secondary" className="px-2 py-0.5 rounded">{template.category}</Badge>
                          <span>por {template.user.name || template.user.email}</span>
                        </div>

                        <div className="mt-auto pt-3 border-t border-[hsl(var(--border))] flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleUseTemplate(template)}>
                            Usar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenBuilder(template)}>
                            Editar Visual
                          </Button>
                        </div>
                      </CardContent>

                      <CardFooter className="pt-0">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-full justify-end" aria-label="Mais opções">
                              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-48">
                            <Button variant="outline" className="w-full justify-start" onClick={() => handleEdit(template)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                            <Button variant="outline" className="w-full justify-start" onClick={() => handleDuplicate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </Button>
                            <Separator />
                            <Button variant="destructive" className="w-full justify-start" onClick={() => handleDelete(template.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </CardFooter>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div
                role="tabpanel"
                id="templates-panel-list"
                aria-labelledby="templates-tab-list"
                className="divide-y divide-[hsl(var(--border))]"
              >
                {filteredTemplates.map((template) => (
                  <div key={template.id} className="flex items-center gap-4 p-4">
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted relative">
                      {template.thumbnail ? (
                        <NextImage src={template.thumbnail} alt={template.name} fill className="object-cover" />
                      ) : (
                        <LayoutDashboard className="h-8 w-8 mx-auto my-auto text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{template.name}</h3>
                        <Badge className={cn('px-2 py-0.5 text-xs', getTypeColor(template.structure.type || 'FEED'))}>
                          {getTypeLabel(template.structure.type || 'FEED')}
                        </Badge>
                        {template.isPublic && (
                          <Badge variant="success" className="px-2 py-0.5 text-xs">Público</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <Badge variant="secondary" className="px-2 py-0.5 rounded">{template.category}</Badge>
                        <span>por {template.user.name || template.user.email}</span>
                        <span>{new Date(template.updatedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleUseTemplate(template)}>
                        Usar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenBuilder(template)}>
                        Visual
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Mais opções">
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-48">
                          <Button variant="outline" className="w-full justify-start" onClick={() => handleEdit(template)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button variant="outline" className="w-full justify-start" onClick={() => handleDuplicate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </Button>
                          <Separator />
                          <Button variant="destructive" className="w-full justify-start" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
            <DialogDescription>
              Configure os detalhes do template. Use placeholders como {"{{nome}}"}, {"{{data}}"}, {"{{produto}}"} no caption.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Post de lançamento de produto"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva para que serve este template..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Post</Label>
                <Select value={formData.structure.type} onValueChange={(v) => setFormData(prev => ({ ...prev, structure: { ...prev.structure, type: v as any } }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption">Caption do Template</Label>
                <Textarea
                  id="caption"
                  value={formData.structure.caption}
                  onChange={(e) => setFormData(prev => ({ ...prev, structure: { ...prev.structure, caption: e.target.value } }))}
                  placeholder="Use placeholders: {{nome}}, {{data}}, {{produto}}, {{preco}}, {{cta}}"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {'Placeholders disponíveis: {{nome}}, {{data}}, {{produto}}, {{preco}}, {{cta}}, {{hashtags}}'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Hashtags Padrão</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.structure.hashtags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      #{tag}
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, structure: { ...prev.structure, hashtags: prev.structure.hashtags.filter((_, idx) => idx !== i) } }))} className="hover:text-destructive">×</button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    placeholder="Adicionar hashtag + Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        setFormData(prev => ({ ...prev, structure: { ...prev.structure, hashtags: [...prev.structure.hashtags, e.currentTarget.value.trim().replace('#', '')] } }));
                        e.currentTarget.value = '';
                      }
                    }}
                    className="px-3 py-1 border border-[hsl(var(--border))] rounded-full text-sm flex-1 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Placeholders de Mídia</Label>
                <div className="space-y-2">
                  {formData.structure.media.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <Select value={m.type} onValueChange={(v) => setFormData(prev => ({ ...prev, structure: { ...prev.structure, media: prev.structure.media.map((mm, idx) => idx === i ? { ...mm, type: v as any } : mm) } }))}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IMAGE">Imagem</SelectItem>
                          <SelectItem value="VIDEO">Vídeo</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Ex: Foto do produto principal"
                        value={m.placeholder}
                        onChange={(e) => setFormData(prev => ({ ...prev, structure: { ...prev.structure, media: prev.structure.media.map((mm, idx) => idx === i ? { ...mm, placeholder: e.target.value } : mm) } }))}
                        className="flex-1"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setFormData(prev => ({ ...prev, structure: { ...prev.structure, media: prev.structure.media.filter((_, idx) => idx !== i) } }))} aria-label="Remover placeholder de mídia">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => { setFormData(prev => ({ ...prev, structure: { ...prev.structure, media: [...prev.structure.media, { type: 'IMAGE', placeholder: '' }] } })); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar placeholder de mídia
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded border-[hsl(var(--input))]"
                  />
                  <span className="text-sm">Template público (outros usuários podem ver e usar)</span>
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">URL da Thumbnail (opcional)</Label>
                <Input
                  id="thumbnail"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData(prev => ({ ...prev, thumbnail: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit">{editingTemplate ? 'Salvar Alterações' : 'Criar Template'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Visual Template Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>Construtor Visual de Templates</DialogTitle>
              <DialogDescription>
                Arraste e solte elementos para criar seu template visualmente
              </DialogDescription>
            </div>
            <Button variant="outline" onClick={() => setShowBuilder(false)}>
              Fechar
            </Button>
          </DialogHeader>
          <div className="flex h-[70vh] overflow-hidden">
            {/* Sidebar - Components Palette */}
            <div className="w-64 border-r bg-[hsl(var(--muted))/0.3] p-4 overflow-y-auto">
              <h4 className="font-medium mb-3">Elementos</h4>
              <div className="space-y-2">
                {[
                  { id: 'text', label: 'Texto', icon: 'T' },
                  { id: 'image', label: 'Imagem', icon: '🖼' },
                  { id: 'video', label: 'Vídeo', icon: '🎬' },
                  { id: 'hashtags', label: 'Hashtags', icon: '#️⃣' },
                  { id: 'cta', label: 'Botão CTA', icon: '🔘' },
                  { id: 'placeholder', label: 'Placeholder', icon: '{{ }}' },
                ].map(el => (
                  <button
                    key={el.id}
                    className="w-full p-3 border border-[hsl(var(--border))] rounded-lg text-left hover:bg-background transition-colors flex items-center gap-2"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('element', el.id)}
                  >
                    <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-sm">{el.icon}</span>
                    <span className="text-sm">{el.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b bg-[hsl(var(--muted))/0.3] flex items-center justify-between">
                <h4 className="font-medium">Canvas ({formData.structure.type || 'FEED'})</h4>
                <div className="flex items-center gap-2">
                  <Select value={formData.structure.type} onValueChange={(v) => setFormData(prev => ({ ...prev, structure: { ...prev.structure, type: v as any } }))}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center p-8 relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const el = e.dataTransfer.getData('element');
                  if (el) {
                    console.log('Dropped element:', el);
                    // Add element to canvas logic here
                  }
                }}>
                <div className="bg-white dark:bg-gray-900 border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground max-w-2xl w-full aspect-video relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <LayoutDashboard className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-lg">Solte elementos aqui</p>
                      <p className="text-sm">Canvas do tipo {getTypeLabel(formData.structure.type || 'FEED')}</p>
                    </div>
                  </div>
                  {/* Preview based on type */}
                  <div className="absolute inset-4 border border-dashed rounded" style={{
                    borderColor: formData.structure.type === 'STORIES' || formData.structure.type === 'REELS' || formData.structure.type === 'WHATSAPP_STATUS' ? 'transparent' : 'currentColor',
                    aspectRatio: formData.structure.type === 'STORIES' || formData.structure.type === 'REELS' || formData.structure.type === 'WHATSAPP_STATUS' ? '9/16' :
                                formData.structure.type === 'FEED' ? '1/1' : '4/5'
                  }}>
                  </div>
                </div>
              </div>

              {/* Properties Panel */}
              <div className="w-80 border-l bg-[hsl(var(--muted))/0.3] p-4 overflow-y-auto">
                <h4 className="font-medium mb-3">Propriedades</h4>
                <p className="text-sm text-muted-foreground">Selecione um elemento no canvas para editar suas propriedades</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuilder(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (builderTemplate?.id) {
                handleEdit(builderTemplate);
              } else {
                setShowCreateDialog(true);
              }
              setShowBuilder(false);
            }}>
              Salvar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}