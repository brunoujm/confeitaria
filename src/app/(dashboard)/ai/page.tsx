'use client';

import React, { useState, useEffect, useCallback } from 'react';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};
import {
  Bot,
  Plus,
  Edit2,
  Trash2,
  Copy,
  TestTube,
  Loader2,
  Sparkles,
  Type,
  Image,
  Hash,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Separator } from '@/components/ui/Separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Switch } from '@/components/ui/Switch';

interface AIPreset {
  id: string;
  name: string;
  description: string | null;
  type: 'CAPTION' | 'HASHTAG' | 'IMAGE';
  prompt: string;
  variables: string[];
  model: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
  isPublic: boolean;
}

interface PresetFormData {
  name: string;
  description: string;
  type: 'CAPTION' | 'HASHTAG' | 'IMAGE';
  prompt: string;
  variables: string[];
  model: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
  isPublic: boolean;
}

const AI_MODELS = {
  CAPTION: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
  HASHTAG: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (rápido)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
  IMAGE: [
    { value: 'dall-e-3', label: 'DALL-E 3' },
    { value: 'gpt-image-1', label: 'GPT Image 1' },
  ],
};

const DEFAULT_PROMPTS = {
  CAPTION: `Você é um especialista em marketing para confeitarias brasileiras. Crie uma caption envolvente para Instagram.

Contexto:
- Tipo de post: {{postType}}
- Produto: {{product}}
- Ocasião: {{occasion}}
- Tom de voz: {{tone}}
- CTA desejado: {{cta}}

Requisitos:
- Máximo 2200 caracteres
- Use emojis relevantes 🍰✨
- Inclua call-to-action claro
- Linguagem portuguesa do Brasil
- Hashtags no final (serão adicionadas separadamente)`,
  HASHTAG: `Gere hashtags relevantes para um post de confeitaria no Instagram.

Contexto:
- Produto: {{product}}
- Ocasião: {{occasion}}
- Estilo: {{style}}
- Localização: {{location}}

Requisitos:
- Gere exatamente {{count}} hashtags
- Misture hashtags populares e de nicho
- Inclua hashtags locais (cidade/região)
- Formato: #hashtag1 #hashtag2 #hashtag3
- Sem explicações, apenas as hashtags`,
  IMAGE: `Uma foto profissional de confeitaria brasileira para Instagram.

Produto: {{product}}
Estilo: {{style}}
Iluminação: {{lighting}}
Ângulo: {{angle}}
Background: {{background}}

Qualidade: 4K, iluminação de estúdio, cores vibrantes, apetitoso, estilo lifestyle brasileiro.`,
};

const VARIABLES_BY_TYPE = {
  CAPTION: ['postType', 'product', 'occasion', 'tone', 'cta'],
  HASHTAG: ['product', 'occasion', 'style', 'location', 'count'],
  IMAGE: ['product', 'style', 'lighting', 'angle', 'background'],
};

export default function AISettingsPage() {
  const [presets, setPresets] = useState<AIPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('caption');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<AIPreset | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [formData, setFormData] = useState<PresetFormData>({
    name: '',
    description: '',
    type: 'CAPTION',
    prompt: '',
    variables: [],
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 1000,
    isDefault: false,
    isPublic: false,
  });

  const fetchPresets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/presets');
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      console.error('Erro ao buscar presets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'CAPTION',
      prompt: '',
      variables: [],
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
      isDefault: false,
      isPublic: false,
    });
    setEditingPreset(null);
  };

  const handleTypeChange = (type: 'CAPTION' | 'HASHTAG' | 'IMAGE') => {
    setFormData(prev => ({
      ...prev,
      type,
      prompt: DEFAULT_PROMPTS[type],
      variables: VARIABLES_BY_TYPE[type],
      model: AI_MODELS[type][0].value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPreset ? `/api/ai/presets/${editingPreset.id}` : '/api/ai/presets';
      const method = editingPreset ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchPresets();
        setShowCreateDialog(false);
        resetForm();
      } else {
        const error = await response.json();
        console.error('Erro ao salvar preset:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar preset:', error);
    }
  };

  const handleEdit = (preset: AIPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      description: preset.description || '',
      type: preset.type,
      prompt: preset.prompt,
      variables: preset.variables,
      model: preset.model,
      temperature: preset.temperature,
      maxTokens: preset.maxTokens,
      isDefault: preset.isDefault,
      isPublic: preset.isPublic,
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este preset?')) return;
    try {
      const response = await fetch(`/api/ai/presets/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchPresets();
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleDuplicate = async (preset: AIPreset) => {
    try {
      const response = await fetch('/api/ai/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...preset,
          name: `${preset.name} (Cópia)`,
          id: undefined,
          isDefault: false,
        }),
      });
      if (response.ok) {
        fetchPresets();
      }
    } catch (error) {
      console.error('Erro ao duplicar:', error);
    }
  };

  const handleTest = async () => {
    if (!editingPreset || !testInput.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId: editingPreset.id,
          input: testInput,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult(data.result);
      } else {
        const error = await response.json();
        setTestResult(`Erro: ${error.error}`);
      }
    } catch (error) {
      setTestResult('Erro ao testar preset');
    } finally {
      setIsTesting(false);
    }
  };

  const filteredPresets = presets.filter(p => {
    const typeMap: Record<string, 'CAPTION' | 'HASHTAG' | 'IMAGE'> = {
      caption: 'CAPTION',
      hashtag: 'HASHTAG',
      image: 'IMAGE',
    };
    return p.type === typeMap[activeTab];
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CAPTION': return <Type className="h-4 w-4" />;
      case 'HASHTAG': return <Hash className="h-4 w-4" />;
      case 'IMAGE': return <Image className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CAPTION': return 'Legendas';
      case 'HASHTAG': return 'Hashtags';
      case 'IMAGE': return 'Imagens';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Presets de IA
          </h1>
          <p className="text-muted-foreground">Gerencie prompts e configurações para geração de conteúdo</p>
        </div>
        <Button onClick={() => { resetForm(); handleTypeChange('CAPTION'); setShowCreateDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Preset
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="caption">{getTypeIcon('CAPTION')} Legendas</TabsTrigger>
          <TabsTrigger value="hashtag">{getTypeIcon('HASHTAG')} Hashtags</TabsTrigger>
          <TabsTrigger value="image">{getTypeIcon('IMAGE')} Imagens</TabsTrigger>
          <TabsTrigger value="test"><TestTube className="h-4 w-4 mr-2" /> Testar</TabsTrigger>
        </TabsList>

        {/* Presets Lists */}
        {['caption', 'hashtag', 'image'].map(tab => (
          <TabsContent key={tab} value={tab} className="pt-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="mt-4 text-muted-foreground">Carregando presets...</p>
                </CardContent>
              </Card>
            ) : filteredPresets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-4">Nenhum preset de {getTypeLabel(tab)} criado</p>
                  <Button onClick={() => { resetForm(); handleTypeChange(tab.toUpperCase() as any); setShowCreateDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeiro preset
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredPresets.map(preset => (
                  <Card key={preset.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-lg">{preset.name}</h3>
                            {preset.isDefault && (
                              <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">Padrão</span>
                            )}
                            {preset.isPublic && (
                              <span className="px-2 py-0.5 text-xs bg-green/10 text-green rounded-full">Público</span>
                            )}
                          </div>
                          {preset.description && (
                            <p className="text-sm text-muted-foreground mb-2">{preset.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="px-2 py-0.5 rounded bg-muted">{preset.model}</span>
                            <span>Temp: {preset.temperature}</span>
                            <span>Max tokens: {preset.maxTokens}</span>
                            <span className="font-mono">{preset.variables.map(v => `{{${v}}}`).join(', ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(preset)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingPreset(preset); setTestInput(''); setTestResult(null); setActiveTab('test'); }}>
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-48">
                              <Button variant="outline" className="w-full justify-start" onClick={() => handleDuplicate(preset)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                              </Button>
                              <Separator />
                              <Button variant="destructive" className="w-full justify-start" onClick={() => handleDelete(preset.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </Button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}

        {/* Test Tab */}
        <TabsContent value="test" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Testar Preset</CardTitle>
              <CardDescription>
                Selecione um preset acima e clique no ícone de tubo de ensaio para testar aqui
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingPreset ? (
                <div className="space-y-4">
                  <div>
                    <Label>Preset selecionado</Label>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      {getTypeIcon(editingPreset.type)}
                      <div>
                        <p className="font-medium">{editingPreset.name}</p>
                        <p className="text-sm text-muted-foreground">{editingPreset.model} • Temp: {editingPreset.temperature}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Entrada de teste (variáveis)</Label>
                    <Textarea
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder={`Variáveis: {{{editingPreset.variables.join('}}, {{')}} }}
Exemplo: postType=Reels, product=Bolo de chocolate, occasion=Aniversário, tone=Divertido, cta=Peça agora`}
                      rows={4}
                    />
                  </div>

                  <Button onClick={handleTest} disabled={isTesting || !testInput.trim()}>
                    {isTesting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Gerar
                      </>
                    )}
                  </Button>

                  {testResult && (
                    <div className="space-y-2">
                      <Label>Resultado</Label>
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
                      </div>
                      <Button variant="outline" onClick={() => navigator.clipboard.writeText(testResult)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar resultado
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TestTube className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Selecione um preset para testar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Preset Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPreset ? 'Editar Preset' : 'Novo Preset'}</DialogTitle>
            <DialogDescription>
              Configure o prompt, modelo e parâmetros para geração de conteúdo com IA
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="preset-name">Nome *</Label>
                <Input
                  id="preset-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Legenda de lançamento divertida"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preset-type">Tipo de Geração *</Label>
                <Select value={formData.type} onValueChange={(v) => handleTypeChange(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAPTION">Legenda (Texto)</SelectItem>
                    <SelectItem value="HASHTAG">Hashtags</SelectItem>
                    <SelectItem value="IMAGE">Imagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preset-description">Descrição</Label>
                <Textarea
                  id="preset-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva quando e como usar este preset..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preset-model">Modelo de IA</Label>
                <Select value={formData.model} onValueChange={(v) => setFormData(prev => ({ ...prev, model: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS[formData.type].map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperatura <span className="text-muted-foreground text-normal font-normal">({formData.temperature})</span></Label>
                  <input
                    id="temperature"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    min="100"
                    max="4000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preset-prompt">Prompt do Sistema *</Label>
                <Textarea
                  id="preset-prompt"
                  value={formData.prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Prompt que será enviado para a IA..."
                  rows={10}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: {formData.variables.map(v => `{{${v}}}`).join(', ')}
                  {formData.variables.length === 0 && ' (defina o tipo primeiro)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Variáveis do Prompt</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.variables.map((v, i) => (
                    <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-mono flex items-center gap-1">
                      {'{{' + v + '}}'}
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, variables: prev.variables.filter((_, idx) => idx !== i) }))} className="text-primary hover:text-primary/70">×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Nova variável + Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        setFormData(prev => ({ ...prev, variables: [...prev.variables, e.currentTarget.value.trim()] }));
                        e.currentTarget.value = '';
                      }
                    }}
                    className="px-3 py-1 border rounded-full text-sm flex-1 min-w-[120px]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                  />
                  <span className="text-sm">Definir como preset padrão para este tipo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                  />
                  <span className="text-sm">Tornar público (outros usuários podem ver)</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit">{editingPreset ? 'Salvar Alterações' : 'Criar Preset'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}