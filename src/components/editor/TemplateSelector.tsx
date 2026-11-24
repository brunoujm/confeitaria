'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, LayoutGrid, Plus, Edit2, Trash2, Copy, Check, Loader2 } from 'lucide-react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Separator } from '@/components/ui/Separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  category: string;
  structure: TemplateStructure;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateStructure {
  caption?: string;
  hashtags?: string[];
  media?: { type: 'IMAGE' | 'VIDEO'; placeholder: string }[];
  type?: 'FEED' | 'STORIES' | 'REELS' | 'WHATSAPP_STATUS' | 'WHATSAPP_CATALOG';
}

interface TemplateSelectorProps {
  onSelectTemplate: (template: Template) => void;
  postType?: string;
  currentTemplateId?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'promocional', label: 'Promocional' },
  { value: 'educativo', label: 'Educativo' },
  { value: 'engajamento', label: 'Engajamento' },
  { value: 'datas_comemorativas', label: 'Datas Comemorativas' },
  { value: 'bastidores', label: 'Bastidores' },
  { value: 'depoimentos', label: 'Depoimentos' },
  { value: 'outros', label: 'Outros' },
];

export function TemplateSelector({
  onSelectTemplate,
  postType,
  currentTemplateId,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Builder form state
  const [builderName, setBuilderName] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderCategory, setBuilderCategory] = useState('promocional');
  const [builderType, setBuilderType] = useState<'FEED' | 'STORIES' | 'REELS' | 'WHATSAPP_STATUS' | 'WHATSAPP_CATALOG'>('FEED');
  const [builderCaption, setBuilderCaption] = useState('');
  const [builderHashtags, setBuilderHashtags] = useState('');
  const [builderMediaPlaceholders, setBuilderMediaPlaceholders] = useState<string[]>(['']);

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (postType) params.set('type', postType);
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
  }, [postType]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    let result = templates;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      );
    }
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }
    setFilteredTemplates(result);
  }, [templates, searchQuery, categoryFilter]);

  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template);
  };

  const handleCreateTemplate = async () => {
    const structure: TemplateStructure = {
      caption: builderCaption || undefined,
      hashtags: builderHashtags
        .split('\n')
        .map((h) => h.trim())
        .filter(Boolean),
      type: builderType,
      media: builderMediaPlaceholders
        .filter(Boolean)
        .map((placeholder) => ({
          type: 'IMAGE' as const,
          placeholder,
        })),
    };

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: builderName,
          description: builderDescription,
          category: builderCategory,
          structure,
          isPublic: true,
        }),
      });

      if (response.ok) {
        await fetchTemplates();
        resetBuilderForm();
        setShowBuilder(false);
      }
    } catch (error) {
      console.error('Erro ao criar template:', error);
      alert('Erro ao criar template');
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    const structure: TemplateStructure = {
      caption: builderCaption || undefined,
      hashtags: builderHashtags
        .split('\n')
        .map((h) => h.trim())
        .filter(Boolean),
      type: builderType,
      media: builderMediaPlaceholders
        .filter(Boolean)
        .map((placeholder) => ({
          type: 'IMAGE' as const,
          placeholder,
        })),
    };

    try {
      const response = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: builderName,
          description: builderDescription,
          category: builderCategory,
          structure,
        }),
      });

      if (response.ok) {
        await fetchTemplates();
        resetBuilderForm();
        setShowBuilder(false);
        setEditingTemplate(null);
      }
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      alert('Erro ao atualizar template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      alert('Erro ao excluir template');
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          name: `${template.name} (Cópia)`,
          id: undefined,
        }),
      });

      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
    }
  };

  const openBuilder = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setBuilderName(template.name);
      setBuilderDescription(template.description || '');
      setBuilderCategory(template.category);
      setBuilderType(template.structure.type || 'FEED');
      setBuilderCaption(template.structure.caption || '');
      setBuilderHashtags(template.structure.hashtags?.join('\n') || '');
      setBuilderMediaPlaceholders(
        template.structure.media?.map((m) => m.placeholder) || ['']
      );
    } else {
      resetBuilderForm();
    }
    setShowBuilder(true);
  };

  const resetBuilderForm = () => {
    setBuilderName('');
    setBuilderDescription('');
    setBuilderCategory('promocional');
    setBuilderType('FEED');
    setBuilderCaption('');
    setBuilderHashtags('');
    setBuilderMediaPlaceholders(['']);
    setEditingTemplate(null);
  };

  const addMediaPlaceholder = () => {
    setBuilderMediaPlaceholders((prev) => [...prev, '']);
  };

  const removeMediaPlaceholder = (index: number) => {
    setBuilderMediaPlaceholders((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutGrid className="h-5 w-5 text-primary" />
          Templates
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => openBuilder()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pr-2">
        {/* Search and Filter */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || categoryFilter !== 'all'
                ? 'Nenhum template encontrado com estes filtros'
                : 'Nenhum template criado ainda'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => openBuilder()}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={cn(
                  'relative p-3 rounded-lg border transition-all cursor-pointer',
                  currentTemplateId === template.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                )}
                onClick={() => handleSelectTemplate(template)}
              >
                {template.thumbnail && (
                  <div className="aspect-video rounded mb-2 overflow-hidden bg-muted">
                    <NextImage
                      src={template.thumbnail}
                      alt={template.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{template.name}</span>
                      {currentTemplateId === template.id && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {template.description || 'Sem descrição'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground"
                      >
                        {template.category}
                      </span>
                      {template.structure.type && (
                        <span
                          className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary"
                        >
                          {template.structure.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateTemplate(template);
                      }}
                      className="h-7 w-7"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openBuilder(template);
                      }}
                      className="h-7 w-7"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                      className="h-7 w-7 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Template Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="builder-name">Nome *</Label>
                <Input
                  id="builder-name"
                  placeholder="Ex: Promoção de Fim de Semana"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="builder-category">Categoria</Label>
                <Select value={builderCategory} onValueChange={setBuilderCategory}>
                  <SelectTrigger id="builder-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.filter((c) => c.value !== 'all').map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="builder-description">Descrição</Label>
              <Textarea
                id="builder-description"
                placeholder="Descreva quando e como usar este template..."
                value={builderDescription}
                onChange={(e) => setBuilderDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="builder-type">Tipo de Post</Label>
              <Select value={builderType} onValueChange={(v) => setBuilderType(v as 'FEED' | 'STORIES' | 'REELS' | 'WHATSAPP_STATUS' | 'WHATSAPP_CATALOG')}>
                <SelectTrigger id="builder-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FEED">Feed</SelectItem>
                  <SelectItem value="STORIES">Stories</SelectItem>
                  <SelectItem value="REELS">Reels</SelectItem>
                  <SelectItem value="WHATSAPP_STATUS">WhatsApp Status</SelectItem>
                  <SelectItem value="WHATSAPP_CATALOG">WhatsApp Catálogo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="builder-caption">Modelo de Legenda</Label>
              <Textarea
                id="builder-caption"
                placeholder="Use {{variavel}} para placeholders. Ex: 🎂 {{produto}} está com {{desconto}}% de desconto!"
                value={builderCaption}
                onChange={(e) => setBuilderCaption(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{variavel}}"} para criar placeholders editáveis.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="builder-hashtags">Hashtags Sugeridas (uma por linha)</Label>
              <Textarea
                id="builder-hashtags"
                placeholder="#confeitaria&#10;#bolosartesanais&#10;#doces"
                value={builderHashtags}
                onChange={(e) => setBuilderHashtags(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Placeholders de Mídia</Label>
              <div className="space-y-2">
                {builderMediaPlaceholders.map((placeholder, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Placeholder ${index + 1} (ex: Foto do bolo principal)`}
                      value={placeholder}
                      onChange={(e) =>
                        setBuilderMediaPlaceholders((prev) => {
                          const next = [...prev];
                          next[index] = e.target.value;
                          return next;
                        })
                      }
                    />
                    {builderMediaPlaceholders.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMediaPlaceholder(index)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMediaPlaceholder}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar placeholder de mídia
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuilder(false)}>
              Cancelar
            </Button>
            <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
              {editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}