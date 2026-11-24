import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiRateLimiter, checkRateLimit } from '@/lib/ratelimit';
import { updatePostSchema } from '@/lib/validations/post';
import { z } from 'zod';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true } },
        media: { orderBy: { createdAt: 'asc' } },
        template: { select: { id: true, name: true, thumbnail: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
    }

    // Check if user owns the post (unless admin)
    const userRole = (session.user as any).role || 'OWNER';
    if (post.authorId !== session.user.id && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Parse hashtags from JSON string
    let hashtags: string[] = [];
    try {
      hashtags = post.hashtags ? JSON.parse(post.hashtags) : [];
    } catch {
      hashtags = [];
    }

    return NextResponse.json({
      ...post,
      hashtags,
    });
  } catch (error) {
    console.error('GET /api/posts/[id] error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

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

    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
    }

    // Check ownership
    const userRole = (session.user as any).role || 'OWNER';
    if (existingPost.authorId !== session.user.id && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { media, hashtags, scheduledAt, ...postData } = parsed.data;

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['APPROVED', 'ARCHIVED'],
      APPROVED: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      PUBLISHED: ['ARCHIVED'],
      ARCHIVED: ['DRAFT'], // Allow restoring archived posts to draft
    };

    if (postData.status && postData.status !== existingPost.status) {
      const allowedTransitions = validTransitions[existingPost.status] || [];
      if (!allowedTransitions.includes(postData.status)) {
        return NextResponse.json(
          { error: `Transição de status inválida: ${existingPost.status} → ${postData.status}` },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      ...postData,
      ...(hashtags !== undefined && { hashtags: JSON.stringify(hashtags ?? []) }),
      ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
    };

    // Handle status change to PUBLISHED
    if (postData.status === 'PUBLISHED' && existingPost.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    // Handle status change from ARCHIVED to DRAFT (restore)
    if (postData.status === 'DRAFT' && existingPost.status === 'ARCHIVED') {
      updateData.publishedAt = null;
    }

    // Update media if provided
    if (media !== undefined) {
      await prisma.media.deleteMany({ where: { postId: id } });
      if (media.length > 0) {
        await prisma.media.createMany({
          data: media.map((m, index) => ({
            postId: id,
            url: m.url,
            type: m.type,
            size: m.size ?? 0,
            width: m.width ?? null,
            height: m.height ?? null,
            duration: m.duration ?? null,
          })),
        });
      }
    }

    const post = await prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, email: true } },
        media: { orderBy: { createdAt: 'asc' } },
        template: { select: { id: true, name: true, thumbnail: true } },
      },
    });

    // Parse hashtags for response
    let parsedHashtags: string[] = [];
    try {
      parsedHashtags = post.hashtags ? JSON.parse(post.hashtags) : [];
    } catch {
      parsedHashtags = [];
    }

    const response = NextResponse.json({
      ...post,
      hashtags: parsedHashtags,
    });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('PATCH /api/posts/[id] error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
    }

    // Check ownership
    const userRole = (session.user as any).role || 'OWNER';
    if (existingPost.authorId !== session.user.id && userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Delete associated media first (cascade should handle this, but being explicit)
    await prisma.media.deleteMany({ where: { postId: id } });

    // Archive instead of hard delete
    await prisma.post.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/posts/[id] error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
