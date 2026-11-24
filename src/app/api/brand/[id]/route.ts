import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiRateLimiter, checkRateLimit } from '@/lib/ratelimit';
import { parseBrand, serializeBrand } from '@/lib/brand';

const updateBrandSchema = z.object({
  name: z.string().min(1).max(100).optional(),
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
  }).optional(),
  fonts: z.object({
    heading: z.string().min(1),
    body: z.string().min(1),
  }).optional(),
  logos: z.object({
    main: z.string().url().optional().nullable(),
    dark: z.string().url().optional().nullable(),
    watermark: z.string().url().optional().nullable(),
  }).optional(),
  defaultHashtags: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
}).partial();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const brand = await prisma.brandIdentity.findUnique({
      where: { id },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Identidade visual não encontrada' }, { status: 404 });
    }

    if (brand.userId !== session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    return NextResponse.json({ brand: parseBrand(brand) });
  } catch (error) {
    console.error('Brand fetch error:', error);
    return NextResponse.json({ error: 'Erro ao buscar identidade visual' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const validation = updateBrandSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 400 });
    }

    const brand = await prisma.brandIdentity.findUnique({
      where: { id },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Identidade visual não encontrada' }, { status: 404 });
    }

    if (brand.userId !== session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // If setting as default, unset other defaults
    if (validation.data.isDefault) {
      await prisma.brandIdentity.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updatedBrand = await prisma.brandIdentity.update({
      where: { id },
      data: serializeBrand(validation.data as any),
    });

    const response = NextResponse.json({ brand: parseBrand(updatedBrand) });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('Brand update error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar identidade visual' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const brand = await prisma.brandIdentity.findUnique({
      where: { id },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Identidade visual não encontrada' }, { status: 404 });
    }

    if (brand.userId !== session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await prisma.brandIdentity.delete({
      where: { id },
    });

    const response = NextResponse.json({ success: true });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('Brand delete error:', error);
    return NextResponse.json({ error: 'Erro ao excluir identidade visual' }, { status: 500 });
  }
}