import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { prisma } from '@/lib/prisma';

export async function POST(
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Brand set default error:', error);
    return NextResponse.json({ error: 'Erro ao definir como padrão' }, { status: 500 });
  }
}