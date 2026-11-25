'use client';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Save,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  SlidersHorizontal,
  Key,
  Eye,
  Check,
  X,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Separator } from '@/components/ui/Separator';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

interface AIConfig {
  openaiModel: string;
  anthropicModel: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

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
  createdAt: string;
  updatedAt: string;
}

const presetTypes = ['CAPTION', 'HASHTAG', 'IMAGE'] as const;
const typeLabels = {
  CAPTION: 'Legenda',
  HASHTAG: 'Hashtags',
  IMAGE: 'Imagem',
};
const typeIcons = {
  CAPTION: '📝',
  HASHTAG: '#️⃣',
  IMAGE: '🎨',
};

const openaiModels = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
];

const anthropicModels = [
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

export default function AISettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'presets'>('config');

  const [config, setConfig] = useState<AIConfig>({
    openaiModel: 'gpt-4o',
    anthropicModel: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: '',
  });

  const [presets, setPresets] = useState<AIPreset[]>([]);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<AIPreset | null>(null);
  const [presetForm, setPresetForm] = useState({
    name: '',
    description: '',
    type: 'CAPTION' as 'CAPTION' | 'HASHTAG' | 'IMAGE',
    prompt: '',
    variables: [] as string[],
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 1000,
    isDefault: false,
    isPublic: false,
  });
  const [newVariable, setNewVariable] = useState('');

  const fetchConfig = async () => {
    try {
      // Try to fetch from API, fallback to defaults
      const response = await fetch('/api/ai-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config || config);
      }
    } catch (error) {
      console.error('Erro ao buscar config IA:', error);
    }
  };

  const fetchPresets = async () => {
    try {
      const response = await fetch('/api/ai/presets');
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      console.error('Erro ao buscar presets:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchConfig(), fetchPresets()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const clearMessage = () => setMessage(null);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Erro ao salvar configurações' });
      }
    } catch (error) {
      console.error('Erro ao salvar config:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  const openCreatePreset = () => {
    setEditingPreset(null);
    setPresetForm({
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
    setShowPresetDialog(true);
  };

  const openEditPreset = (preset: AIPreset) => {
    setEditingPreset(preset);
    setPresetForm({
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
    setShowPresetDialog(true);
  };

  const handlePresetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const url = editingPreset ? `/api/ai/presets/${editingPreset.id}` : '/api/ai/presets';
    const method = editingPreset ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presetForm),
      });
      if (response.ok) {
        setMessage({
          type: 'success',
          text: editingPreset ? 'Preset atualizado com sucesso!' : 'Preset criado com sucesso!',
        });
        setShowPresetDialog(false);
        setEditingPreset(null);
        await fetchPresets();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Erro ao salvar preset' });
      }
    } catch (error) {
      console.error('Erro ao salvar preset:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar preset' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este preset?')) return;

    try {
      const response = await fetch(`/api/ai/presets/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Preset excluído com sucesso!' });
        await fetchPresets();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Erro ao excluir preset' });
      }
    } catch (error) {
      console.error('Erro ao excluir preset:', error);
      setMessage({ type: 'error', text: 'Erro ao excluir preset' });
    }
  };

  const addVariable = () => {
    if (newVariable.trim() && !presetForm.variables.includes(newVariable.trim())) {
      setPresetForm(prev => ({ ...prev, variables: [...prev.variables, newVariable.trim()] }));
      setNewVariable('');
    }
  };

  const removeVariable = (variable: string) => {
    setPresetForm(prev => ({ ...prev, variables: prev.variables.filter(v => v !== variable) }));
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setMessage({ type: 'success', text: 'Prompt copiado para a área de transferência!' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Configurações de IA
          </h1>
          <p className="text-muted-foreground">Configure modelos, parâmetros e presets de inteligência artificial</p>
        </div>
        <Card variant="default">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando configurações...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8" />
          Configurações de IA
        </h1>
        <p className="text-muted-foreground">Configure modelos, parâmetros e presets de inteligência artificial</p>
      </div>

      {message && (
        <Alert className={cn(
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30'
        )}>
          <AlertDescription className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            {message.text}
            <button onClick={clearMessage} className="ml-auto text-xs hover:underline">Dispensar</button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'config' | 'presets')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="presets">
            <Sparkles className="h-4 w-4 mr-2" />
            Presets
          </TabsTrigger>
        </TabsList>

        {/* Config Tab */}
        <TabsContent value="config" className="pt-6 space-y-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Configuração de Modelos</CardTitle>
              <CardDescription>Defina quais modelos de IA usar para cada tipo de geração</CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveConfig}>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="openaiModel">Modelo OpenAI</Label>
                    <Select value={config.openaiModel} onValueChange={(v) => setConfig(prev => ({ ...prev, openaiModel: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {openaiModels.map(model => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Usado para geração de legendas, hashtags e imagens (DALL-E)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="anthropicModel">Modelo Anthropic</Label>
                    <Select value={config.anthropicModel} onValueChange={(v) => setConfig(prev => ({ ...prev, anthropicModel: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {anthropicModels.map(model => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Alternativa para geração de texto (legendas e hashtags)</p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">
                      Temperatura <span className="font-normal text-muted-foreground">({config.temperature})</span>
                    </Label>
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Controla a criatividade: 0 = determinístico, 2 = muito criativo
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">
                      Máximo de Tokens <span className="font-normal text-muted-foreground">({config.maxTokens})</span>
                    </Label>
                    <input
                      id="maxTokens"
                      type="range"
                      min="100"
                      max="4000"
                      step="100"
                      value={config.maxTokens}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Limite máximo de tokens na resposta gerada
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">Prompt do Sistema (Opcional)</Label>
                  <Textarea
                    id="systemPrompt"
                    value={config.systemPrompt}
                    onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    placeholder="Instruções globais para todos os modelos de IA..."
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Este prompt será adicionado no início de todas as requisições de IA.
                    Use para definir persona, diretrizes de marca, tom de voz padrão, etc.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Configurações
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Rate Limit Info */}
          <Card variant="default" className="border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Limite de Taxa (Rate Limiting)</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    A API de IA possui limite de <strong>20 requisições por minuto</strong> por usuário.
                    Se exceder, aguarde 1 minuto antes de tentar novamente.
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    Configure <code>UPSTASH_REDIS_REST_URL</code> e <code>UPSTASH_REDIS_REST_TOKEN</code>
                    no <code>.env</code> para rate limiting distribuído em produção.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Presets Tab */}
        <TabsContent value="presets" className="pt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Presets de IA</h2>
              <p className="text-sm text-muted-foreground">Templates reutilizáveis para geração rápida de conteúdo</p>
            </div>
            <Button onClick={openCreatePreset}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Preset
            </Button>
          </div>

          {presets.length === 0 ? (
            <Card variant="default">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <h3 className="mt-4 text-lg font-medium">Nenhum preset criado</h3>
                <p className="text-muted-foreground mt-1">Crie presets para agilizar a geração de legendas, hashtags e imagens</p>
                <Button onClick={openCreatePreset} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro preset
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {presets.map(preset => (
                <Card key={preset.id} variant="default" className={cn(preset.isDefault ? 'ring-2 ring-primary' : '')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                          {typeIcons[preset.type]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{preset.name}</h3>
                            {preset.isDefault && (
                              <Badge variant="secondary" className="text-xs">Padrão</Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {typeIcons[preset.type]} {typeLabels[preset.type]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => copyPrompt(preset.prompt)} title="Copiar prompt">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditPreset(preset)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!preset.isDefault && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePreset(preset.id)} title="Excluir" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {preset.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{preset.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{preset.model}</span>
                      <span>•</span>
                      <span>Temp: {preset.temperature}</span>
                      <span>•</span>
                      <span>Tokens: {preset.maxTokens}</span>
                    </div>
                    {preset.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {preset.variables.map(v => (
                          <Badge key={v} variant="secondary" className="text-xs">
                            {'{{' + v + '}}'}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Atualizado: {new Date(preset.updatedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preset Dialog */}
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPreset ? 'Editar Preset' : 'Novo Preset'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePresetSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="presetName">Nome *</Label>
                <Input
                  id="presetName"
                  value={presetForm.name}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Legenda para Bolos de Aniversário"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="presetDescription">Descrição</Label>
                <Input
                  id="presetDescription"
                  value={presetForm.description}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição opcional do preset"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={presetForm.type} onValueChange={(v) => setPresetForm(prev => ({ ...prev, type: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presetTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {typeIcons[type]} {typeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="presetPrompt">Prompt *</Label>
                <Textarea
                  id="presetPrompt"
                  value={presetForm.prompt}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder={presetForm.type === 'CAPTION'
                    ? 'Crie uma legenda sobre: {tema}. Tom: {tom}. Inclua CTA.'
                    : presetForm.type === 'HASHTAG'
                    ? 'Gere {quantidade} hashtags para: {tema}. Estilo: {estilo}.'
                    : 'Crie uma imagem de: {tema}. Estilo: {estilo}. Proporção: {proporcao}.'}
                  rows={4}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use variáveis entre chaves duplas: &#123;&#123;variavel&#125;&#125;. Ex: &#123;&#123;tema&#125;&#125;, &#123;&#123;tom&#125;&#125;, &#123;&#123;ocasiao&#125;&#125;
                </p>
              </div>

              <div className="space-y-2">
                <Label>Variáveis do Prompt</Label>
                <div className="flex flex-wrap gap-2">
                  {presetForm.variables.map(v => (
                    <Badge key={v} variant="outline" className="gap-1">
                      {'{{' + v + '}}'}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeVariable(v)} />
                    </Badge>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newVariable}
                      onChange={(e) => setNewVariable(e.target.value)}
                      placeholder="Nova variável (ex: tema)"
                      className="w-48"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addVariable}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Variáveis serão substituídas pelo usuário no momento da geração</p>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="presetModel">Modelo</Label>
                  <Select value={presetForm.model} onValueChange={(v) => setPresetForm(prev => ({ ...prev, model: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {openaiModels.map(model => (
                        <SelectItem key={model} value={model}>{model} (OpenAI)</SelectItem>
                      ))}
                      {anthropicModels.map(model => (
                        <SelectItem key={model} value={model}>{model} (Anthropic)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presetTemperature">
                    Temperatura <span className="font-normal text-muted-foreground">({presetForm.temperature})</span>
                  </Label>
                  <input
                    id="presetTemperature"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={presetForm.temperature}
                    onChange={(e) => setPresetForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="presetMaxTokens">
                    Max Tokens <span className="font-normal text-muted-foreground">({presetForm.maxTokens})</span>
                  </Label>
                  <input
                    id="presetMaxTokens"
                    type="range"
                    min="100"
                    max="4000"
                    step="100"
                    value={presetForm.maxTokens}
                    onChange={(e) => setPresetForm(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="presetIsDefault"
                    checked={presetForm.isDefault}
                    onChange={(e) => setPresetForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded border-[hsl(var(--input))]"
                  />
                  <Label htmlFor="presetIsDefault" className="text-sm font-normal cursor-pointer">
                    Definir como padrão para este tipo
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="presetIsPublic"
                    checked={presetForm.isPublic}
                    onChange={(e) => setPresetForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded border-[hsl(var(--input))]"
                  />
                  <Label htmlFor="presetIsPublic" className="text-sm font-normal cursor-pointer">
                    Público (outros usuários podem ver)
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPresetDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingPreset ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}