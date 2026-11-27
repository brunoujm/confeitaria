import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiRateLimiter, checkRateLimit } from '@/lib/ratelimit';

export async function POST(
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

    // Unset all other defaults
    await prisma.brandIdentity.updateMany({
      where: { userId: session.user.id, isDefault: true },
      data: { isDefault: false },
    });

    // Set this as default
    await prisma.brandIdentity.update({
      where: { id },
      data: { isDefault: true },
    });

    const response = NextResponse.json({ success: true });
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  } catch (error) {
    console.error('Brand set default error:', error);
    return NextResponse.json({ error: 'Erro ao definir como padrão' }, { status: 500 });
  }
}