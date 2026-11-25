'use client';

import React, { useState, useEffect, useCallback } from 'react';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};
import {
  Palette,
  Type,
  Image as ImageIcon,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Loader2,
  MoreHorizontal,
  Eye,
} from 'lucide-react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Separator } from '@/components/ui/Separator';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface BrandIdentity {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logos: {
    main: string;
    dark: string;
    watermark: string;
  };
  defaultHashtags: string[];
  isDefault: boolean;
}

interface BrandFormData {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logos: {
    main: string;
    dark: string;
    watermark: string;
  };
  defaultHashtags: string[];
}

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Nunito', 'Merriweather', 'Playfair Display', 'Oswald', 'Raleway',
  'Ubuntu', 'Source Sans Pro', 'DM Sans', 'Outfit', 'Plus Jakarta Sans',
];

const DEFAULT_COLORS = {
  primary: '#8B4513',
  secondary: '#D2691E',
  accent: '#CD853F',
  background: '#FFF8F0',
  surface: '#FFFFFF',
  text: '#2D1B0E',
  textMuted: '#6B4F3A',
  success: '#2E7D32',
  warning: '#F57C00',
  error: '#C62828',
};

export default function BrandPage() {
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('colors');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandIdentity | null>(null);

  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    colors: { ...DEFAULT_COLORS },
    fonts: { heading: 'Inter', body: 'Inter' },
    logos: { main: '', dark: '', watermark: '' },
    defaultHashtags: [],
  });

  const fetchBrand = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/brand');
      if (response.ok) {
        const data = await response.json();
        setBrand(data.brand);
      } else if (response.status === 404) {
        setBrand(null);
      }
    } catch (error) {
      console.error('Erro ao buscar identidade visual:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  const resetForm = () => {
    setFormData({
      name: '',
      colors: { ...DEFAULT_COLORS },
      fonts: { heading: 'Inter', body: 'Inter' },
      logos: { main: '', dark: '', watermark: '' },
      defaultHashtags: [],
    });
    setEditingBrand(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingBrand ? `/api/brand/${editingBrand.id}` : '/api/brand';
      const method = editingBrand ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchBrand();
        setShowCreateDialog(false);
        resetForm();
      } else {
        const error = await response.json();
        console.error('Erro ao salvar identidade visual:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar identidade visual:', error);
    }
  };

  const handleEdit = (b: BrandIdentity) => {
    setEditingBrand(b);
    setFormData({
      name: b.name,
      colors: b.colors,
      fonts: b.fonts,
      logos: b.logos,
      defaultHashtags: b.defaultHashtags,
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta identidade visual?')) return;
    try {
      const response = await fetch(`/api/brand/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchBrand();
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleDuplicate = async (b: BrandIdentity) => {
    try {
      const response = await fetch('/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...b,
          name: `${b.name} (Cópia)`,
          id: undefined,
          isDefault: false,
        }),
      });
      if (response.ok) {
        fetchBrand();
      }
    } catch (error) {
      console.error('Erro ao duplicar:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/brand/${id}/default`, { method: 'POST' });
      if (response.ok) {
        fetchBrand();
      }
    } catch (error) {
      console.error('Erro ao definir como padrão:', error);
    }
  };

  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color);
  };

  const applyColorToCSS = (color: string, property: string) => {
    document.documentElement.style.setProperty(property, color);
  };

  const exportBrand = () => {
    if (!brand) return;
    const dataStr = JSON.stringify(brand, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `${brand.name.replace(/\s+/g, '-').toLowerCase()}-brand.json`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setEditingBrand(imported);
        setFormData({
          name: imported.name,
          colors: imported.colors,
          fonts: imported.fonts,
          logos: imported.logos,
          defaultHashtags: imported.defaultHashtags,
        });
        setShowCreateDialog(true);
      } catch (error) {
        console.error('Erro ao importar:', error);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const addHashtag = (tag: string) => {
    const cleanTag = tag.trim().replace('#', '');
    if (cleanTag && !formData.defaultHashtags.includes(cleanTag)) {
      setFormData(prev => ({ ...prev, defaultHashtags: [...prev.defaultHashtags, cleanTag] }));
    }
  };

  const removeHashtag = (index: number) => {
    setFormData(prev => ({ ...prev, defaultHashtags: prev.defaultHashtags.filter((_, i) => i !== index) }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Identidade Visual</h1>
          <p className="text-muted-foreground">Gerencie cores, fontes, logos e hashtags da marca</p>
        </div>
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando identidade visual...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Identidade Visual</h1>
          <p className="text-muted-foreground">Gerencie cores, fontes, logos e hashtags da marca</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportBrand} disabled={!brand}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <label className="flex items-center justify-center">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="sr-only"
            />
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          </label>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Identidade
          </Button>
        </div>
      </div>

      {brand && (
        <>
          {/* Current Brand Display */}
          <Card variant="default">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {brand.name}
                  {brand.isDefault && (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">Padrão</Badge>
                  )}
                </CardTitle>
                <p className="text-muted-foreground">Identidade visual ativa</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(brand)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                {!brand.isDefault && (
                  <Button variant="outline" size="sm" onClick={() => handleSetDefault(brand.id)}>
                    <Check className="h-4 w-4 mr-2" />
                    Definir como padrão
                  </Button>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48">
                    <Button variant="outline" className="w-full justify-start" onClick={() => handleDuplicate(brand)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </Button>
                    <Separator />
                    <Button variant="destructive" className="w-full justify-start" onClick={() => handleDelete(brand.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="colors"><Palette className="h-4 w-4 mr-2" /> Cores</TabsTrigger>
                  <TabsTrigger value="fonts"><Type className="h-4 w-4 mr-2" /> Fontes</TabsTrigger>
                  <TabsTrigger value="logos"><ImageIcon className="h-4 w-4 mr-2" /> Logos</TabsTrigger>
                  <TabsTrigger value="hashtags"><Check className="h-4 w-4 mr-2" /> Hashtags</TabsTrigger>
                </TabsList>

                {/* Colors Tab */}
                <TabsContent value="colors" className="pt-4 animate-fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Object.entries(brand.colors).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label className="text-xs text-muted-foreground capitalize">{key}</Label>
                        <div className="relative group">
                          <div
                            className="w-full h-20 rounded-lg border cursor-pointer transition-all hover:scale-[1.02]"
                            style={{ backgroundColor: value }}
                            onClick={() => copyColor(value)}
                          />
                          <div className="absolute bottom-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {value}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => copyColor(value)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => applyColorToCSS(value, `--${key}`)}
                        >
                          Aplicar
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Paleta aplicada ao preview:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(brand.colors).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 rounded border text-xs" style={{ borderColor: value }}>
                          <span className="w-4 h-4 rounded" style={{ backgroundColor: value }} />
                          <span className="font-mono">{key}: {value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Fonts Tab */}
                <TabsContent value="fonts" className="pt-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Fonte de Títulos</h4>
                      <div className="space-y-2">
                        <Select value={brand.fonts.heading} onValueChange={() => {}}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GOOGLE_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="p-4 bg-muted/50 rounded-lg" style={{ fontFamily: `'${brand.fonts.heading}', sans-serif` }}>
                          <p className="text-xl font-bold">Título Principal Exemplo</p>
                          <p className="text-lg">Subtítulo de Exemplo</p>
                          <p>Texto normal para ver como fica a fonte</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Fonte de Corpo</h4>
                      <div className="space-y-2">
                        <Select value={brand.fonts.body} onValueChange={() => {}}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GOOGLE_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="p-4 bg-muted/50 rounded-lg" style={{ fontFamily: `'${brand.fonts.body}', sans-serif` }}>
                          <p className="text-lg">Parágrafo de exemplo para testar a legibilidade da fonte de corpo em textos mais longos.</p>
                          <p className="mt-2 text-sm text-muted-foreground">Texto menor para testar tamanhos reduzidos</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-3">CSS Variables para usar no projeto:</h4>
                    <pre className="text-xs bg-background p-3 rounded overflow-x-auto font-mono">
{`--font-heading: '${brand.fonts.heading}', sans-serif;
--font-body: '${brand.fonts.body}', sans-serif;`}
                    </pre>
                  </div>
                </TabsContent>

                {/* Logos Tab */}
                <TabsContent value="logos" className="pt-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { key: 'main' as const, label: 'Logo Principal', desc: 'Versão principal para fundos claros' },
                      { key: 'dark' as const, label: 'Logo Modo Escuro', desc: 'Versão para fundos escuros' },
                      { key: 'watermark' as const, label: 'Marca d\'água', desc: 'Versão simplificada para watermark' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="space-y-3">
                        <Label>{label}</Label>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                        <div className="aspect-square bg-muted rounded-lg border flex items-center justify-center relative overflow-hidden">
                          {brand.logos[key] ? (
                            <NextImage src={brand.logos[key]} alt={label} className="max-w-full max-h-full object-contain p-4" fill />
                          ) : (
                            <div className="text-center text-muted-foreground/50">
                              <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                              <p className="text-sm">Sem logo</p>
                            </div>
                          )}
                          {brand.logos[key] && (
                            <div className="absolute top-2 right-2 flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => {}}>
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => copyColor(brand.logos[key])}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <Input
                          placeholder="URL da imagem"
                          value={brand.logos[key]}
                          onChange={() => {}}
                          readOnly
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Hashtags Tab */}
                <TabsContent value="hashtags" className="pt-4 animate-fade-in">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {brand.defaultHashtags.map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1">
                          #{tag}
                          <button type="button" onClick={() => {}} className="text-primary hover:text-primary/70">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Adicionar hashtag + Enter"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            e.preventDefault();
                            addHashtag(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                        className="flex-1"
                      />
                      <Button variant="outline">Adicionar</Button>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Copiar todas:</h4>
                      <Textarea
                        value={brand.defaultHashtags.map(t => `#${t}`).join(' ')}
                        readOnly
                        rows={3}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {!brand && (
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <Palette className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">Nenhuma identidade visual configurada</p>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira identidade visual
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Brand Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Editar Identidade Visual' : 'Nova Identidade Visual'}</DialogTitle>
            <DialogDescription>
              Configure cores, fontes, logos e hashtags padrão da sua marca
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Nome da Identidade *</Label>
                <Input
                  id="brand-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Confeitaria Doce Sabor"
                  required
                />
              </div>

              {/* Colors Section */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Palette className="h-5 w-5" /> Cores da Marca
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.keys(DEFAULT_COLORS).map((key) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-xs text-muted-foreground capitalize">{key}</Label>
                      <div className="relative">
                        <input
                          type="color"
                          value={formData.colors[key as keyof typeof formData.colors]}
                          onChange={(e) => setFormData(prev => ({ ...prev, colors: { ...prev.colors, [key]: e.target.value } }))}
                          className="w-full h-12 rounded-lg border cursor-pointer appearance-none"
                        />
                        <Input
                          value={formData.colors[key as keyof typeof formData.colors]}
                          onChange={(e) => setFormData(prev => ({ ...prev, colors: { ...prev.colors, [key]: e.target.value } }))}
                          className="mt-2 text-center font-mono text-xs"
                          readOnly
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fonts Section */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Type className="h-5 w-5" /> Fontes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fonte de Títulos</Label>
                    <Select value={formData.fonts.heading} onValueChange={(v) => setFormData(prev => ({ ...prev, fonts: { ...prev.fonts, heading: v } }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOOGLE_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="p-3 bg-muted/50 rounded" style={{ fontFamily: `'${formData.fonts.heading}', sans-serif` }}>
                      <p className="font-bold">Título Exemplo</p>
                      <p className="text-sm text-muted-foreground">Subtítulo exemplo</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fonte de Corpo</Label>
                    <Select value={formData.fonts.body} onValueChange={(v) => setFormData(prev => ({ ...prev, fonts: { ...prev.fonts, body: v } }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOOGLE_FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="p-3 bg-muted/50 rounded" style={{ fontFamily: `'${formData.fonts.body}', sans-serif` }}>
                      <p>Parágrafo de exemplo para testar a legibilidade da fonte de corpo.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logos Section */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" /> Logos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: 'main' as const, label: 'Logo Principal', desc: 'Para fundos claros' },
                    { key: 'dark' as const, label: 'Logo Modo Escuro', desc: 'Para fundos escuros' },
                    { key: 'watermark' as const, label: 'Marca d\'água', desc: 'Versão simplificada' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                      <div className="aspect-square bg-muted rounded-lg border flex items-center justify-center relative">
                        {formData.logos[key] ? (
                          <NextImage src={formData.logos[key]} alt={label} className="max-w-full max-h-full object-contain p-4" fill />
                        ) : (
                          <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                        )}
                      </div>
                      <Input
                        placeholder="URL da imagem"
                        value={formData.logos[key]}
                        onChange={(e) => setFormData(prev => ({ ...prev, logos: { ...prev.logos, [key]: e.target.value } }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Hashtags Section */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Check className="h-5 w-5" /> Hashtags Padrão
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.defaultHashtags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1">
                      #{tag}
                      <button type="button" onClick={() => removeHashtag(i)} className="text-primary hover:text-primary/70">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar hashtag + Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        addHashtag(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={() => {}}>
                    Adicionar
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingBrand?.isDefault || false}
                    onChange={() => {}}
                    className="rounded border-[hsl(var(--input))]"
                  />
                  <span className="text-sm">Definir como identidade padrão</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit">{editingBrand ? 'Salvar Alterações' : 'Criar Identidade Visual'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}