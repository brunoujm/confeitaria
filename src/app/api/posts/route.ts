import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiRateLimiter, checkRateLimit } from '@/lib/ratelimit';

import { createPostSchema, postFiltersSchema } from '@/lib/validations/post';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filters = postFiltersSchema.parse({
      view: searchParams.get('view') || undefined,
      start: searchParams.get('start') || undefined,
      end: searchParams.get('end') || undefined,
      type: searchParams.get('type')?.split(',') || undefined,
      status: searchParams.get('status')?.split(',') || undefined,
      authorId: searchParams.get('authorId') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    });

    const where: Record<string, unknown> = {};

    // Default to current user's posts unless explicit authorId is provided
    // This prevents users from seeing each other's posts by default
    if (!filters.authorId) {
      where.authorId = session.user.id;
    }

    if (filters.start || filters.end) {
      const scheduledAtFilter: Record<string, Date> = {};
      if (filters.start) scheduledAtFilter.gte = new Date(filters.start);
      if (filters.end) scheduledAtFilter.lte = new Date(filters.end);
      where.scheduledAt = scheduledAtFilter;
    }

    if (filters.type?.length) where.type = { in: filters.type };
    if (filters.status?.length) where.status = { in: filters.status };
    if (filters.authorId) where.authorId = filters.authorId;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: {
          id: true,
          title: true,
          caption: true,
          hashtags: true,
          type: true,
          status: true,
          scheduledAt: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, name: true, email: true } },
          media: { select: { id: true, url: true, type: true }, orderBy: { createdAt: 'asc' }, take: 1 },
          template: { select: { id: true, name: true, thumbnail: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    console.error('GET /api/posts error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Parâmetros inválidos', details: error }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Rate limiting: 100 requests per minute per user
    const rateLimitResult = await checkRateLimit(apiRateLimiter, `posts:${session.user.id}`);
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

    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { media, ...postData } = parsed.data;

    const post = await prisma.post.create({
      data: {
        ...postData,
        hashtags: JSON.stringify(postData.hashtags ?? []),
        authorId: session.user.id,
        scheduledAt: postData.scheduledAt ? new Date(postData.scheduledAt) : null,
        publishedAt: postData.status === 'PUBLISHED' ? new Date() : null,
        media: {
          create: media?.map((m) => ({
            url: m.url,
            type: m.type,
            size: m.size ?? 0,
            width: m.width ?? null,
            height: m.height ?? null,
            duration: m.duration ?? null,
          })),
        },
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        media: { orderBy: { createdAt: 'asc' } },
        template: { select: { id: true, name: true, thumbnail: true } },
      },
    });

    const response = NextResponse.json(post, { status: 201 });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('POST /api/posts error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos', details: error }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}