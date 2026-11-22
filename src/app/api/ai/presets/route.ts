import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { aiRateLimiter, checkRateLimit } from '@/lib/ratelimit';

const createPresetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  type: z.enum(['CAPTION', 'HASHTAG', 'IMAGE']),
  prompt: z.string().min(1),
  variables: z.array(z.string()).default([]),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(100).max(4000).default(1000),
  isDefault: z.boolean().default(false),
  isPublic: z.boolean().default(false),
});

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const presets = await prisma.aIPreset.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { isPublic: true },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return NextResponse.json({ presets });
  } catch (error) {
    console.error('Presets fetch error:', error);
    return NextResponse.json({ error: 'Erro ao buscar presets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate limiting: 20 requests per minute per user
    const rateLimitResult = await checkRateLimit(aiRateLimiter, `ai:${session.user.id}`);
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
    const validation = createPresetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 400 });
    }

    // If setting as default, unset other defaults for this type
    if (validation.data.isDefault) {
      await prisma.aIPreset.updateMany({
        where: {
          userId: session.user.id,
          type: validation.data.type,
          isDefault: true
        },
        data: { isDefault: false },
      });
    }

    const preset = await prisma.aIPreset.create({
      data: {
        ...validation.data,
        userId: session.user.id,
        variables: JSON.stringify(validation.data.variables),
      },
    });

    const response = NextResponse.json({ preset }, { status: 201 });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('Preset creation error:', error);
    return NextResponse.json({ error: 'Erro ao criar preset' }, { status: 500 });
  }
}