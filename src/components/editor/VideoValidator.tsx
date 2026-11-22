'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Video as VideoIcon, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';

interface VideoValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    duration: number;
    width: number;
    height: number;
    aspectRatio: string;
    fileSize: number;
    format: string;
    codec?: string;
    bitrate?: number;
    frameRate?: number;
  };
}

interface PlatformRequirements {
  platform: string;
  maxDuration: number;
  maxFileSize: number; // in MB
  recommendedAspectRatios: string[];
  recommendedResolutions: { width: number; height: number }[];
  recommendedCodecs: string[];
}

const PLATFORM_REQUIREMENTS: Record<string, PlatformRequirements> = {
  REELS: {
    platform: 'Instagram Reels',
    maxDuration: 90,
    maxFileSize: 4096, // 4GB
    recommendedAspectRatios: ['9:16'],
    recommendedResolutions: [{ width: 1080, height: 1920 }],
    recommendedCodecs: ['h264', 'hevc'],
  },
  STORIES: {
    platform: 'Instagram Stories',
    maxDuration: 60,
    maxFileSize: 4096,
    recommendedAspectRatios: ['9:16'],
    recommendedResolutions: [{ width: 1080, height: 1920 }],
    recommendedCodecs: ['h264', 'hevc'],
  },
  FEED: {
    platform: 'Instagram Feed',
    maxDuration: 60,
    maxFileSize: 4096,
    recommendedAspectRatios: ['1:1', '4:5', '16:9'],
    recommendedResolutions: [
      { width: 1080, height: 1080 },
      { width: 1080, height: 1350 },
      { width: 1080, height: 608 },
    ],
    recommendedCodecs: ['h264', 'hevc'],
  },
  WHATSAPP_STATUS: {
    platform: 'WhatsApp Status',
    maxDuration: 30,
    maxFileSize: 16, // 16MB
    recommendedAspectRatios: ['9:16'],
    recommendedResolutions: [{ width: 720, height: 1280 }],
    recommendedCodecs: ['h264'],
  },
  WHATSAPP_CATALOG: {
    platform: 'WhatsApp Catálogo',
    maxDuration: 60,
    maxFileSize: 16,
    recommendedAspectRatios: ['1:1', '4:5'],
    recommendedResolutions: [
      { width: 1080, height: 1080 },
      { width: 1080, height: 1350 },
    ],
    recommendedCodecs: ['h264'],
  },
};

interface VideoValidatorProps {
  videoFile: File | null;
  postType: string;
  onValidationComplete?: (result: VideoValidationResult) => void;
}

export function VideoValidator({ videoFile, postType, onValidationComplete }: VideoValidatorProps) {
  const [validation, setValidation] = useState<VideoValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const requirements = PLATFORM_REQUIREMENTS[postType] || PLATFORM_REQUIREMENTS.FEED;

  const validateVideo = useCallback(async (file: File) => {
    setIsValidating(true);

    return new Promise<VideoValidationResult>((resolve) => {
      const video = videoRef.current;
      if (!video) {
        resolve({
          valid: false,
          errors: ['Elemento de vídeo não disponível'],
          warnings: [],
          info: { duration: 0, width: 0, height: 0, aspectRatio: '', fileSize: file.size, format: file.type },
        });
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      video.preload = 'metadata';

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        video.src = '';
      };

      video.onloadedmetadata = () => {
        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;
        const simplifiedRatio = simplifyAspectRatio(width, height);

        const errors: string[] = [];
        const warnings: string[] = [];
        const info = {
          duration,
          width,
          height,
          aspectRatio: simplifiedRatio,
          fileSize: file.size,
          format: file.type,
        };

        // Duration check
        if (duration > requirements.maxDuration) {
          errors.push(`Duração (${formatDuration(duration)}) excede o limite de ${formatDuration(requirements.maxDuration)} para ${requirements.platform}`);
        } else if (duration > requirements.maxDuration * 0.9) {
          warnings.push(`Duração próxima ao limite máximo (${formatDuration(requirements.maxDuration)})`);
        }

        // File size check
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > requirements.maxFileSize) {
          errors.push(`Tamanho do arquivo (${fileSizeMB.toFixed(1)}MB) excede o limite de ${requirements.maxFileSize}MB para ${requirements.platform}`);
        } else if (fileSizeMB > requirements.maxFileSize * 0.9) {
          warnings.push(`Tamanho do arquivo próximo ao limite (${requirements.maxFileSize}MB)`);
        }

        // Aspect ratio check
        if (!requirements.recommendedAspectRatios.includes(simplifiedRatio)) {
          warnings.push(
            `Proporção ${simplifiedRatio} não é recomendada para ${requirements.platform}. ` +
            `Recomendado: ${requirements.recommendedAspectRatios.join(', ')}`
          );
        }

        // Resolution check
        const hasRecommendedResolution = requirements.recommendedResolutions.some(
          (res) => width >= res.width && height >= res.height
        );
        if (!hasRecommendedResolution && (width < 720 || height < 720)) {
          warnings.push(`Resolução (${width}x${height}) pode ser baixa para ${requirements.platform}`);
        }

        // Format check
        const isRecommendedFormat = requirements.recommendedCodecs.some((codec) =>
          file.type.includes(codec) || codec === 'h264'
        );
        if (!isRecommendedFormat) {
          warnings.push(`Formato ${file.type} pode não ser otimizado para ${requirements.platform}`);
        }

        const result: VideoValidationResult = {
          valid: errors.length === 0,
          errors,
          warnings,
          info,
        };

        cleanup();
        resolve(result);
      };

      video.onerror = () => {
        cleanup();
        resolve({
          valid: false,
          errors: ['Erro ao carregar o vídeo. Verifique se o arquivo não está corrompido.'],
          warnings: [],
          info: { duration: 0, width: 0, height: 0, aspectRatio: '', fileSize: file.size, format: file.type },
        });
      };

      // Timeout fallback
      setTimeout(() => {
        if (video.readyState < 1) {
          cleanup();
          resolve({
            valid: false,
            errors: ['Tempo esgotado ao validar vídeo'],
            warnings: [],
            info: { duration: 0, width: 0, height: 0, aspectRatio: '', fileSize: file.size, format: file.type },
          });
        }
      }, 10000);
    });
  }, [requirements]);

  useEffect(() => {
    if (videoFile) {
      validateVideo(videoFile).then((result) => {
        setValidation(result);
        setIsValidating(false);
        onValidationComplete?.(result);
      });
    } else {
      setValidation(null);
      setIsValidating(false);
    }
  }, [videoFile, postType, validateVideo, onValidationComplete]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const simplifyAspectRatio = (width: number, height: number) => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  };

  const getFileSizeMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  if (!videoFile) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <VideoIcon className="h-5 w-5 text-primary" />
            Validador de Vídeo
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <VideoIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Selecione um vídeo para validar</p>
        </CardContent>
      </Card>
    );
  }

  if (isValidating) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <VideoIcon className="h-5 w-5 text-primary" />
            Validador de Vídeo
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Analisando vídeo...</p>
          <Progress value={50} className="mt-4 h-1" />
        </CardContent>
      </Card>
    );
  }

  if (!validation) return null;

  const { valid, errors, warnings, info } = validation;

  return (
    <Card className={cn(valid ? 'border-green-200' : 'border-red-200')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <VideoIcon className="h-5 w-5 text-primary" />
          Validador de Vídeo - {requirements.platform}
          <span className="ml-2 px-2 py-0.5 text-xs rounded">
            {valid ? (
              <span className="bg-green-100 text-green-700">✓ Válido</span>
            ) : (
              <span className="bg-red-100 text-red-700">✗ Inválido</span>
            )}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Info */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-xs text-muted-foreground">Duração</p>
            <p className="font-medium">{formatDuration(info.duration)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Resolução</p>
            <p className="font-medium">{info.width} × {info.height}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Proporção</p>
            <p className="font-medium">{info.aspectRatio}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tamanho</p>
            <p className="font-medium">{getFileSizeMB(info.fileSize)} MB</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Formato</p>
            <p className="font-medium text-capitalize">{info.format.replace('video/', '')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Limite duração</p>
            <p className="font-medium">{formatDuration(requirements.maxDuration)}</p>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-medium text-red-600">
              <AlertCircle className="h-4 w-4" />
              Erros ({errors.length})
            </h4>
            {errors.map((error, index) => (
              <div key={index} className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-medium text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Avisos ({warnings.length})
            </h4>
            {warnings.map((warning, index) => (
              <div key={index} className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-700">{warning}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <Info className="h-4 w-4" />
            Recomendações para {requirements.platform}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="font-medium text-blue-800">Proporções ideais</p>
              <p className="text-blue-700">{requirements.recommendedAspectRatios.join(', ')}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="font-medium text-blue-800">Resoluções recomendadas</p>
              <p className="text-blue-700">
                {requirements.recommendedResolutions.map((r) => `${r.width}×${r.height}`).join(', ')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="font-medium text-blue-800">Codecs recomendados</p>
              <p className="text-blue-700">{requirements.recommendedCodecs.join(', ').toUpperCase()}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="font-medium text-blue-800">Tamanho máximo</p>
              <p className="text-blue-700">{requirements.maxFileSize}MB</p>
            </div>
          </div>
        </div>

        {/* Progress bar for duration */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Duração</span>
            <span>{formatDuration(info.duration)} / {formatDuration(requirements.maxDuration)}</span>
          </div>
          <Progress
            value={(info.duration / requirements.maxDuration) * 100}
            className="h-2"
            max={100}
          />
        </div>

        {/* Progress bar for file size */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Tamanho</span>
            <span>{getFileSizeMB(info.fileSize)} MB / {requirements.maxFileSize} MB</span>
          </div>
          <Progress
            value={(info.fileSize / (requirements.maxFileSize * 1024 * 1024)) * 100}
            className="h-2"
            max={100}
          />
        </div>

        <video ref={videoRef} className="hidden" />
      </CardContent>
    </Card>
  );
}