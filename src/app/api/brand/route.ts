import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiRateLimiter, checkRateLimit } from '@/lib/ratelimit';
import { parseBrand, serializeBrand } from '@/lib/brand';

const brandSchema = z.object({
  name: z.string().min(1).max(100),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    text: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    textMuted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    success: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    warning: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    error: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  fonts: z.object({
    heading: z.string().min(1),
    body: z.string().min(1),
  }),
  logos: z.object({
    main: z.string().url().optional().nullable(),
    dark: z.string().url().optional().nullable(),
    watermark: z.string().url().optional().nullable(),
  }),
  defaultHashtags: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
});

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const brand = await prisma.brandIdentity.findFirst({
      where: {
        userId: session.user.id,
        isDefault: true,
      },
    });

    if (!brand) {
      // Return first brand if no default
      const firstBrand = await prisma.brandIdentity.findFirst({
        where: { userId: session.user.id },
      });
      if (firstBrand) {
        return NextResponse.json({ brand: parseBrand(firstBrand) });
      }
      return NextResponse.json({ error: 'Identidade visual não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ brand: parseBrand(brand) });
  } catch (error) {
    console.error('Brand fetch error:', error);
    return NextResponse.json({ error: 'Erro ao buscar identidade visual' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate limiting: 100 requests per minute per user
    const rateLimitResult = await checkRateLimit(apiRateLimiter, `brand:${session.user.id}`);
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em um minuto.' },
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
      return response;
    }

    const body = await request.json();
    const validation = brandSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (validation.data.isDefault) {
      await prisma.brandIdentity.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const brand = await prisma.brandIdentity.create({
      data: {
        ...serializeBrand(validation.data),
        userId: session.user.id,
      },
    });

    const response = NextResponse.json({ brand: parseBrand(brand) }, { status: 201 });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('Brand creation error:', error);
    return NextResponse.json({ error: 'Erro ao criar identidade visual' }, { status: 500 });
  }
}