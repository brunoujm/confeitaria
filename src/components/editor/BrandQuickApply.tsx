'use client';

import { useState, useEffect } from 'react';
import { Palette, Type, Image as ImageIcon, Copy, Sparkles, Loader2 } from 'lucide-react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface BrandIdentity {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  watermarkUrl: string | null;
  instagramHandle: string | null;
  websiteUrl: string | null;
  defaultHashtags: string[];
  createdAt: string;
  updatedAt: string;
}

interface BrandQuickApplyProps {
  onApplyColors: (colors: { primary: string; secondary: string; accent: string; background: string; text: string }) => void;
  onApplyFonts: (fonts: { heading: string; body: string }) => void;
  onApplyLogo: (logoUrl: string) => void;
  onApplyWatermark: (watermarkUrl: string) => void;
  onApplyHashtags: (hashtags: string[]) => void;
  currentHashtags?: string[];
}

export function BrandQuickApply({
  onApplyColors,
  onApplyFonts,
  onApplyLogo,
  onApplyWatermark,
  onApplyHashtags,
  currentHashtags = [],
}: BrandQuickApplyProps) {
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'colors' | 'fonts' | 'logo' | 'hashtags'>('colors');

  const fetchBrand = async () => {
    try {
      const response = await fetch('/api/brand');
      if (response.ok) {
        const data = await response.json();
        setBrand(data.brand);
      }
    } catch (error) {
      console.error('Erro ao buscar identidade visual:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrand();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando identidade visual...</p>
        </CardContent>
      </Card>
    );
  }

  if (!brand) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Identidade Visual
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Nenhuma identidade visual configurada.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/brand'}>
            Configurar agora
          </Button>
        </CardContent>
      </Card>
    );
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const handleApplyHashtags = () => {
    if (brand.defaultHashtags.length > 0) {
      onApplyHashtags(brand.defaultHashtags);
    }
  };

  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const colorItems = [
    { label: 'Primária', value: brand.primaryColor, key: 'primary', icon: Palette },
    { label: 'Secundária', value: brand.secondaryColor, key: 'secondary', icon: Palette },
    { label: 'Destaque', value: brand.accentColor, key: 'accent', icon: Sparkles },
    { label: 'Fundo', value: brand.backgroundColor, key: 'background', icon: ImageIcon },
    { label: 'Texto', value: brand.textColor, key: 'text', icon: Type },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" />
          Identidade Visual
          <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">
            {brand.name}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pr-2">
        {/* Section Tabs */}
        <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1" role="tablist">
          {([
            { id: 'colors', label: 'Cores', icon: Palette },
            { id: 'fonts', label: 'Fontes', icon: Type },
            { id: 'logo', label: 'Logo', icon: ImageIcon },
            { id: 'hashtags', label: 'Hashtags', icon: Sparkles },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeSection === id}
              onClick={() => setActiveSection(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                activeSection === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Colors Section */}
        {activeSection === 'colors' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clique em uma cor para copiar ou use o botão para aplicar todas.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {colorItems.map(({ label, value, key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => copyToClipboard(value)}
                  className={cn(
                    'relative p-4 rounded-lg border transition-all text-left',
                    'hover:shadow-md hover:border-primary/50'
                  )}
                  style={{ backgroundColor: value }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Icon className="h-4 w-4 mb-1" style={{ color: getContrastColor(value) }} />
                      <p className="font-medium text-sm" style={{ color: getContrastColor(value) }}>
                        {label}
                      </p>
                    </div>
                    <Copy
                      className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: getContrastColor(value) }}
                    />
                  </div>
                  <div className="mt-2 font-mono text-xs opacity-80" style={{ color: getContrastColor(value) }}>
                    {value}
                  </div>
                </button>
              ))}
            </div>
            <Button
              onClick={() => onApplyColors({
                primary: brand.primaryColor,
                secondary: brand.secondaryColor,
                accent: brand.accentColor,
                background: brand.backgroundColor,
                text: brand.textColor,
              })}
              className="w-full mt-2"
            >
              <Palette className="h-4 w-4 mr-2" />
              Aplicar Paleta Completa ao Editor
            </Button>
          </div>
        )}

        {/* Fonts Section */}
        {activeSection === 'fonts' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fontes configuradas na identidade visual.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onApplyFonts({ heading: brand.fontHeading, body: brand.fontBody })}
                className={cn(
                  'p-4 rounded-lg border transition-all text-left',
                  'hover:shadow-md hover:border-primary/50'
                )}
              >
                <Type className="h-4 w-4 mb-1 text-primary" />
                <p className="font-medium text-sm">Título</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium" style={{ fontFamily: brand.fontHeading }}>
                  {brand.fontHeading}
                </p>
              </button>
              <button
                onClick={() => onApplyFonts({ heading: brand.fontHeading, body: brand.fontBody })}
                className={cn(
                  'p-4 rounded-lg border transition-all text-left',
                  'hover:shadow-md hover:border-primary/50'
                )}
              >
                <Type className="h-4 w-4 mb-1 text-primary" />
                <p className="font-medium text-sm">Corpo</p>
                <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: brand.fontBody }}>
                  {brand.fontBody}
                </p>
              </button>
            </div>
            <Button
              variant="outline"
              onClick={() => onApplyFonts({ heading: brand.fontHeading, body: brand.fontBody })}
              className="w-full"
            >
              <Type className="h-4 w-4 mr-2" />
              Aplicar Fontes ao Editor
            </Button>
          </div>
        )}

        {/* Logo Section */}
        {activeSection === 'logo' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Logos disponíveis para uso nos posts.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {brand.logoUrl && (
                <div className="relative p-3 rounded-lg border bg-background">
                  <div className="aspect-square rounded bg-muted flex items-center justify-center mb-2">
                    <NextImage src={brand.logoUrl} alt="Logo principal" fill className="object-contain p-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Principal</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { copyToClipboard(brand.logoUrl!); onApplyLogo(brand.logoUrl!); }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {brand.logoDarkUrl && (
                <div className="relative p-3 rounded-lg border bg-background">
                  <div className="aspect-square rounded bg-gray-800 flex items-center justify-center mb-2">
                    <NextImage src={brand.logoDarkUrl} alt="Logo modo escuro" fill className="object-contain p-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Modo Escuro</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { copyToClipboard(brand.logoDarkUrl!); onApplyLogo(brand.logoDarkUrl!); }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              {!brand.logoUrl && !brand.logoDarkUrl && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum logo configurado</p>
                </div>
              )}
            </div>
            {brand.watermarkUrl && (
              <div className="p-3 rounded-lg border bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Marca d&apos;água</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { copyToClipboard(brand.watermarkUrl!); onApplyWatermark(brand.watermarkUrl!); }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="aspect-video rounded bg-muted flex items-center justify-center">
                  <NextImage src={brand.watermarkUrl} alt="Watermark" fill className="object-contain p-2 opacity-50" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hashtags Section */}
        {activeSection === 'hashtags' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hashtags padrão da marca para incluir nos posts.
            </p>
            {brand.defaultHashtags.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {brand.defaultHashtags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => copyToClipboard(tag)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={handleApplyHashtags}
                  className="w-full"
                  disabled={currentHashtags.some((h) => brand.defaultHashtags.includes(h))}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {currentHashtags.some((h) => brand.defaultHashtags.includes(h))
                    ? 'Já aplicadas'
                    : 'Aplicar Todas as Hashtags'}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma hashtag padrão configurada</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}