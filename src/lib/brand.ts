// Shape of a BrandIdentity row (src/prisma/contract.d.ts, Models.public_BrandIdentity).
export type BrandIdentity = {
  id: string;
  name: string;
  colors: string;
  fonts: string;
  logos: string;
  defaultHashtags: string;
  isDefault: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

type BrandRow = {
  id: string;
  name: string;
  colors: string;
  fonts: string;
  logos: string;
  defaultHashtags: string;
  isDefault: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

function parseJson(value: string, fallback: unknown): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function parseBrand(row: BrandRow): Record<string, unknown> {
  return {
    ...row,
    colors: parseJson(row.colors, {}),
    fonts: parseJson(row.fonts, {}),
    logos: parseJson(row.logos, {}),
    defaultHashtags: parseJson(row.defaultHashtags, []),
  };
}

export function serializeBrand(data: Record<string, unknown>): Record<string, string> {
  const stringified = (value: unknown, fallback: string) =>
    typeof value === 'string' ? value : JSON.stringify(value ?? fallback);
  const out: Record<string, string> = {};
  if (data.colors !== undefined) out.colors = stringified(data.colors, '{}');
  if (data.fonts !== undefined) out.fonts = stringified(data.fonts, '{}');
  if (data.logos !== undefined) out.logos = stringified(data.logos, '{}');
  if (data.defaultHashtags !== undefined) out.defaultHashtags = stringified(data.defaultHashtags, '[]');
  return out;
}
