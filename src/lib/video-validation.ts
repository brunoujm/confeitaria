export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  format: string;
}

export interface VideoValidationResult {
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
  };
}

export interface PlatformRequirements {
  platform: string;
  maxDuration: number;
  maxFileSize: number; // in MB
  recommendedAspectRatios: string[];
  recommendedResolutions: { width: number; height: number }[];
  recommendedCodecs: string[];
}

export const PLATFORM_REQUIREMENTS: Record<string, PlatformRequirements> = {
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

function simplifyAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function validateVideoServerSide(
  metadata: VideoMetadata,
  postType: string
): VideoValidationResult {
  const requirements = PLATFORM_REQUIREMENTS[postType] || PLATFORM_REQUIREMENTS.FEED;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation - check if video metadata is valid
  if (!metadata.duration || metadata.duration <= 0) {
    errors.push('Vídeo inválido ou corrompido: duração não pôde ser determinada');
  }
  if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
    errors.push('Vídeo inválido ou corrompido: resolução não pôde ser determinada');
  }

  // If basic validation failed, return early
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      info: {
        duration: metadata.duration || 0,
        width: metadata.width || 0,
        height: metadata.height || 0,
        aspectRatio: '',
        fileSize: metadata.fileSize,
        format: metadata.format,
      },
    };
  }

  const aspectRatio = simplifyAspectRatio(metadata.width, metadata.height);
  const fileSizeMB = metadata.fileSize / (1024 * 1024);

  // Duration check
  if (metadata.duration > requirements.maxDuration) {
    errors.push(
      `Duração (${formatDuration(metadata.duration)}) excede o limite de ${formatDuration(requirements.maxDuration)} para ${requirements.platform}`
    );
  } else if (metadata.duration > requirements.maxDuration * 0.9) {
    warnings.push(`Duração próxima ao limite máximo (${formatDuration(requirements.maxDuration)})`);
  }

  // File size check
  if (fileSizeMB > requirements.maxFileSize) {
    errors.push(
      `Tamanho do arquivo (${fileSizeMB.toFixed(1)}MB) excede o limite de ${requirements.maxFileSize}MB para ${requirements.platform}`
    );
  } else if (fileSizeMB > requirements.maxFileSize * 0.9) {
    warnings.push(`Tamanho do arquivo próximo ao limite (${requirements.maxFileSize}MB)`);
  }

  // Aspect ratio check
  if (!requirements.recommendedAspectRatios.includes(aspectRatio)) {
    warnings.push(
      `Proporção ${aspectRatio} não é recomendada para ${requirements.platform}. ` +
      `Recomendado: ${requirements.recommendedAspectRatios.join(', ')}`
    );
  }

  // Resolution check
  const hasRecommendedResolution = requirements.recommendedResolutions.some(
    (res) => metadata.width >= res.width && metadata.height >= res.height
  );
  if (!hasRecommendedResolution && (metadata.width < 720 || metadata.height < 720)) {
    warnings.push(`Resolução (${metadata.width}x${metadata.height}) pode ser baixa para ${requirements.platform}`);
  }

  // Format check
  const isRecommendedFormat = requirements.recommendedCodecs.some((codec) =>
    metadata.format.includes(codec) || codec === 'h264'
  );
  if (!isRecommendedFormat) {
    warnings.push(`Formato ${metadata.format} pode não ser otimizado para ${requirements.platform}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info: {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      aspectRatio,
      fileSize: metadata.fileSize,
      format: metadata.format,
    },
  };
}