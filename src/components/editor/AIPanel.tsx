'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, X, MessageSquare, Image as ImageIcon, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface AIPanelProps {
  onGenerateCaption: (caption: string) => void;
  onGenerateHashtags: (hashtags: string[]) => void;
  onGenerateImage: (imageUrl: string) => void;
  postType?: string;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Profissional' },
  { value: 'casual', label: 'Casual/Descontraído' },
  { value: 'inspirational', label: 'Inspirador' },
  { value: 'educational', label: 'Educativo' },
  { value: 'promotional', label: 'Promocional' },
  { value: 'storytelling', label: 'Storytelling' },
];

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Curto (até 150 chars)' },
  { value: 'medium', label: 'Médio (150-300 chars)' },
  { value: 'long', label: 'Longo (300+ chars)' },
];

const HASHTAG_COUNT_OPTIONS = [
  { value: 5, label: '5 hashtags' },
  { value: 10, label: '10 hashtags' },
  { value: 15, label: '15 hashtags' },
  { value: 20, label: '20 hashtags' },
];

const IMAGE_STYLE_OPTIONS = [
  { value: 'photorealistic', label: 'Fotorrealista' },
  { value: 'illustration', label: 'Ilustração' },
  { value: 'minimalist', label: 'Minimalista' },
  { value: 'vibrant', label: 'Vibrante/Colorido' },
  { value: 'warm', label: 'Aconchegante/Quente' },
  { value: 'elegant', label: 'Elegante/Sofisticado' },
];

export function AIPanel({
  onGenerateCaption,
  onGenerateHashtags,
  onGenerateImage,
  postType = 'FEED',
}: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<'caption' | 'hashtags' | 'image'>('caption');
  const [loadingStates, setLoadingStates] = useState<Record<'caption' | 'hashtags' | 'image', boolean>>({
    caption: false,
    hashtags: false,
    image: false,
  });
  const [generatedContent, setGeneratedContent] = useState('');
  const [showResult, setShowResult] = useState(false);

  // Caption form state
  const [captionTopic, setCaptionTopic] = useState('');
  const [captionTone, setCaptionTone] = useState('casual');
  const [captionLength, setCaptionLength] = useState('medium');
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(true);

  // Hashtag form state
  const [hashtagTopic, setHashtagTopic] = useState('');
  const [hashtagCount, setHashtagCount] = useState(10);
  const [hashtagStyle, setHashtagStyle] = useState('mixed');

  // Image form state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('photorealistic');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '9:16' | '4:5' | '16:9'>('1:1');

  const { toast } = useToast();

  const handleGenerateCaption = async () => {
    if (!captionTopic.trim()) return;

    setLoadingStates(prev => ({ ...prev, caption: true }));
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'caption',
          topic: captionTopic,
          tone: captionTone,
          length: captionLength,
          postType,
          includeEmojis,
          includeCTA,
        }),
      });

      if (!response.ok) throw new Error('Erro ao gerar legenda');

      const data = await response.json();
      setGeneratedContent(data.content);
      setShowResult(true);
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro ao gerar legenda',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, caption: false }));
    }
  };

  const handleGenerateHashtags = async () => {
    if (!hashtagTopic.trim()) return;

    setLoadingStates(prev => ({ ...prev, hashtags: true }));
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'hashtags',
          topic: hashtagTopic,
          count: hashtagCount,
          style: hashtagStyle,
          postType,
        }),
      });

      if (!response.ok) throw new Error('Erro ao gerar hashtags');

      const data = await response.json();
      setGeneratedContent(data.content.join(' '));
      setShowResult(true);
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro ao gerar hashtags',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, hashtags: false }));
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;

    setLoadingStates(prev => ({ ...prev, image: true }));
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image',
          prompt: imagePrompt,
          style: imageStyle,
          aspectRatio: imageAspectRatio,
        }),
      });

      if (!response.ok) throw new Error('Erro ao gerar imagem');

      const data = await response.json();
      onGenerateImage(data.imageUrl);
      toast({
        title: 'Imagem gerada com sucesso!',
        description: 'A imagem foi adicionada ao post.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro ao gerar imagem',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, image: false }));
    }
  };

  const handleApplyCaption = () => {
    onGenerateCaption(generatedContent);
    setShowResult(false);
    setGeneratedContent('');
  };

  const handleApplyHashtags = () => {
    const tags = generatedContent.split(' ').filter((t) => t.startsWith('#'));
    onGenerateHashtags(tags);
    setShowResult(false);
    setGeneratedContent('');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" />
          Assistente IA
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pr-2">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1" role="tablist">
          {([
            { id: 'caption', label: 'Legenda', icon: MessageSquare },
            { id: 'hashtags', label: 'Hashtags', icon: Zap },
            { id: 'image', label: 'Imagem', icon: ImageIcon },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                activeTab === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Caption Generator */}
        {activeTab === 'caption' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="caption-topic">Sobre o que é o post?</Label>
              <Textarea
                id="caption-topic"
                placeholder="Ex: Lançamento do novo bolo de chocolate com cobertura de ganache..."
                value={captionTopic}
                onChange={(e) => setCaptionTopic(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="caption-tone">Tom de voz</Label>
                <Select value={captionTone} onValueChange={setCaptionTone}>
                  <SelectTrigger id="caption-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="caption-length">Tamanho</Label>
                <Select value={captionLength} onValueChange={setCaptionLength}>
                  <SelectTrigger id="caption-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEmojis}
                  onChange={(e) => setIncludeEmojis(e.target.checked)}
                  className="rounded border-input"
                />
                Incluir emojis
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCTA}
                  onChange={(e) => setIncludeCTA(e.target.checked)}
                  className="rounded border-input"
                />
                Incluir call-to-action
              </label>
            </div>

            <Button
              onClick={handleGenerateCaption}
              disabled={!captionTopic.trim() || loadingStates.caption}
              className="w-full"
            >
              {loadingStates.caption ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Legenda
                </>
              )}
            </Button>
          </div>
        )}

        {/* Hashtag Generator */}
        {activeTab === 'hashtags' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hashtag-topic">Tema principal</Label>
              <Input
                id="hashtag-topic"
                placeholder="Ex: confeitaria, bolos artesanais, doces..."
                value={hashtagTopic}
                onChange={(e) => setHashtagTopic(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="hashtag-count">Quantidade</Label>
                <Select value={String(hashtagCount)} onValueChange={(v) => setHashtagCount(Number(v))}>
                  <SelectTrigger id="hashtag-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HASHTAG_COUNT_OPTIONS.map((opt) => (
                      <SelectItem key={String(opt.value)} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hashtag-style">Estilo</Label>
                <Select value={hashtagStyle} onValueChange={setHashtagStyle}>
                  <SelectTrigger id="hashtag-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Populares</SelectItem>
                    <SelectItem value="niche">Nichadas</SelectItem>
                    <SelectItem value="mixed">Mistas</SelectItem>
                    <SelectItem value="branded">Com marca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerateHashtags}
              disabled={!hashtagTopic.trim() || loadingStates.hashtags}
              className="w-full"
            >
              {loadingStates.hashtags ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Gerar Hashtags
                </>
              )}
            </Button>
          </div>
        )}

        {/* Image Generator */}
        {activeTab === 'image' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-prompt">Descreva a imagem desejada</Label>
              <Textarea
                id="image-prompt"
                placeholder="Ex: Bolo de chocolate decorado com frutas vermelhas e flores comestíveis, iluminação natural, estilo clean..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="image-style">Estilo visual</Label>
                <Select value={imageStyle} onValueChange={setImageStyle}>
                  <SelectTrigger id="image-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_STYLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-ratio">Proporção</Label>
                <Select value={imageAspectRatio} onValueChange={(v) => setImageAspectRatio(v as '1:1' | '9:16' | '4:5' | '16:9')}>
                  <SelectTrigger id="image-ratio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">Quadrado (1:1) - Feed</SelectItem>
                    <SelectItem value="9:16">Vertical (9:16) - Stories/Reels</SelectItem>
                    <SelectItem value="4:5">Retrato (4:5) - Feed</SelectItem>
                    <SelectItem value="16:9">Horizontal (16:9) - Capa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerateImage}
              disabled={!imagePrompt.trim() || loadingStates.image}
              className="w-full"
              variant="outline"
            >
              {loadingStates.image ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando imagem...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Gerar Imagem com IA
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              As imagens geradas são salvas na galeria de mídia automaticamente.
            </p>
          </div>
        )}

        {/* Result Preview */}
        {showResult && generatedContent && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border space-y-3 animate-slide-in">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Resultado gerado</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowResult(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-3 bg-background rounded border max-h-40 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{generatedContent}</p>
            </div>
            <div className="flex gap-2">
              {activeTab === 'caption' && (
                <Button onClick={handleApplyCaption} className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  Aplicar Legenda
                </Button>
              )}
              {activeTab === 'hashtags' && (
                <Button onClick={handleApplyHashtags} className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  Aplicar Hashtags
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}