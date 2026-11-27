import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiRateLimiter, checkRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const aiConfigSchema = z.object({
  openaiModel: z.string().min(1).default('gpt-4o'),
  anthropicModel: z.string().min(1).default('claude-3-5-sonnet-20241022'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(100).max(4000).default(2000),
  systemPrompt: z.string().optional().nullable(),
});

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate limiting: 100 requests per minute per user
    const rateLimitResult = await checkRateLimit(apiRateLimiter, `ai-config:${session.user.id}`);
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

    let config = await prisma.aIConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      // Create default config for user
      config = await prisma.aIConfig.create({
        data: {
          userId: session.user.id,
          openaiModel: 'gpt-4o',
          anthropicModel: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: '',
        },
      });
    }

    const response = NextResponse.json({ config });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('AI config fetch error:', error);
    return NextResponse.json({ error: 'Erro ao buscar configuração de IA' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate limiting: 20 requests per minute per user
    const rateLimitResult = await checkRateLimit(apiRateLimiter, `ai-config:${session.user.id}`);
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
    const validation = aiConfigSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 400 });
    }

    const config = await prisma.aIConfig.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...validation.data,
      },
      update: validation.data,
    });

    const response = NextResponse.json({ config });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('AI config save error:', error);
    return NextResponse.json({ error: 'Erro ao salvar configuração de IA' }, { status: 500 });
  }
}