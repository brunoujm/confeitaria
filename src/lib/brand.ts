import { type BrandIdentity } from '@prisma/client';

/**
 * Parse BrandIdentity JSON string fields to objects
 * DRY utility to avoid duplication across API routes
 */
export function parseBrand(brand: BrandIdentity) {
  try {
    return {
      ...brand,
      colors: JSON.parse(brand.colors),
      fonts: JSON.parse(brand.fonts),
      logos: JSON.parse(brand.logos),
      defaultHashtags: JSON.parse(brand.defaultHashtags),
    };
  } catch (error) {
    console.error('[parseBrand] Failed to parse brand JSON:', error);
    // Return safe defaults to prevent page crash
    return {
      ...brand,
      colors: defaultBrandIdentity.colors,
      fonts: defaultBrandIdentity.fonts,
      logos: defaultBrandIdentity.logos,
      defaultHashtags: defaultBrandIdentity.defaultHashtags,
    };
  }
}

/**
 * Serialize BrandIdentity input objects to JSON strings for database storage
 */
export function serializeBrand(data: {
  name: string;
  colors: Record<string, string>;
  fonts: { heading: string; body: string };
  logos: { main?: string | null; dark?: string | null; watermark?: string | null };
  defaultHashtags: string[];
  isDefault?: boolean;
  [key: string]: unknown;
}) {
  // Normalize undefined to null for logos
  const normalizedLogos = {
    main: data.logos.main ?? null,
    dark: data.logos.dark ?? null,
    watermark: data.logos.watermark ?? null,
  };

  return {
    ...data,
    colors: JSON.stringify(data.colors),
    fonts: JSON.stringify(data.fonts),
    logos: JSON.stringify(normalizedLogos),
    defaultHashtags: JSON.stringify(data.defaultHashtags),
  };
}

/**
 * Default brand identity for new users
 */
export const defaultBrandIdentity = {
  name: 'Minha Confeitaria',
  colors: {
    primary: '#E85D75',
    secondary: '#F5A9B8',
    accent: '#D4A574',
    background: '#FFFFFF',
    surface: '#FAFAFA',
    text: '#1A1A2E',
    textMuted: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  fonts: {
    heading: 'Playfair Display',
    body: 'Inter',
  },
  logos: {
    main: null,
    dark: null,
    watermark: null,
  },
  defaultHashtags: ['#confeitaria', '#doces', '#bolos', '#artesanal'],
  isDefault: true,
};