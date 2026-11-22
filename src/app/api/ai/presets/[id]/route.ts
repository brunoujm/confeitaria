import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { aiRateLimiter, checkRateLimit } from '@/lib/ratelimit';

const updatePresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['CAPTION', 'HASHTAG', 'IMAGE']).optional(),
  prompt: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(100).max(4000).optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
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

    const preset = await prisma.aIPreset.findUnique({
      where: { id },
    });

    if (!preset) {
      return NextResponse.json({ error: 'Preset não encontrado' }, { status: 404 });
    }

    if (preset.userId !== session.user.id && !preset.isPublic) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Parse variables JSON string to array
    const parsedPreset = {
      ...preset,
      variables: typeof preset.variables === 'string' ? JSON.parse(preset.variables) : preset.variables,
    };

    return NextResponse.json({ preset: parsedPreset });
  } catch (error) {
    console.error('Preset fetch error:', error);
    return NextResponse.json({ error: 'Erro ao buscar preset' }, { status: 500 });
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

    const { id } = await params;
    const body = await request.json();
    const validation = updatePresetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 400 });
    }

    const preset = await prisma.aIPreset.findUnique({
      where: { id },
    });

    if (!preset) {
      return NextResponse.json({ error: 'Preset não encontrado' }, { status: 404 });
    }

    if (preset.userId !== session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // If setting as default, unset other defaults for this type
    if (validation.data.isDefault) {
      await prisma.aIPreset.updateMany({
        where: {
          userId: session.user.id,
          type: validation.data.type || preset.type,
          isDefault: true
        },
        data: { isDefault: false },
      });
    }

    const updatedPreset = await prisma.aIPreset.update({
      where: { id },
      data: {
        ...validation.data,
        variables: validation.data.variables ? JSON.stringify(validation.data.variables) : undefined,
      },
    });

    // Parse variables JSON string to array for response
    const parsedPreset = {
      ...updatedPreset,
      variables: typeof updatedPreset.variables === 'string' ? JSON.parse(updatedPreset.variables) : updatedPreset.variables,
    };

    const response = NextResponse.json({ preset: parsedPreset });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('Preset update error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar preset' }, { status: 500 });
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

    const { id } = await params;

    const preset = await prisma.aIPreset.findUnique({
      where: { id },
    });

    if (!preset) {
      return NextResponse.json({ error: 'Preset não encontrado' }, { status: 404 });
    }

    if (preset.userId !== session.user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    await prisma.aIPreset.delete({
      where: { id },
    });

    const response = NextResponse.json({ success: true });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('Preset delete error:', error);
    return NextResponse.json({ error: 'Erro ao excluir preset' }, { status: 500 });
  }
}