import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiRateLimiter, checkRateLimit } from '@/lib/ratelimit';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  category: z.string().default('outros'),
  structure: z.object({
    caption: z.string().optional().nullable(),
    hashtags: z.array(z.string()).optional(),
    media: z.array(z.object({
      type: z.enum(['IMAGE', 'VIDEO']),
      placeholder: z.string(),
    })).optional(),
    type: z.enum(['FEED', 'STORIES', 'REELS', 'WHATSAPP_STATUS', 'WHATSAPP_CATALOG']).optional(),
  }),
  isPublic: z.boolean().default(true),
  thumbnail: z.string().url().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Valid PostType values to prevent injection
    const validTypes = ['FEED', 'STORIES', 'REELS', 'WHATSAPP_STATUS', 'WHATSAPP_CATALOG'] as const;

    const where: Record<string, unknown> = {
      OR: [
        { userId: session.user.id },
        { isPublic: true },
      ],
    };

    // Use Prisma JSON query to safely filter by structure.type
    if (type && validTypes.includes(type as typeof validTypes[number])) {
      where.structure = { path: ['type'], equals: type };
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.template.count({ where }),
    ]);

    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Templates fetch error:', error);
    return NextResponse.json({ error: 'Erro ao buscar templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate limiting: 100 requests per minute per user
    const rateLimitResult = await checkRateLimit(apiRateLimiter, `templates:${session.user.id}`);
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
    const validation = createTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: validation.error.flatten() }, { status: 400 });
    }

    const template = await prisma.template.create({
      data: {
        ...validation.data,
        userId: session.user.id,
        structure: validation.data.structure as any,
      },
    });

    const response = NextResponse.json({ template }, { status: 201 });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('Template creation error:', error);
    return NextResponse.json({ error: 'Erro ao criar template' }, { status: 500 });
  }
}