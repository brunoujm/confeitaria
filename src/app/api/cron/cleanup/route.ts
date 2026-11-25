import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json({ error: 'Configuração ausente' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // Find archived posts older than 30 days (for media path extraction before deletion)
    const oldArchivedPosts = await prisma.post.findMany({
      where: {
        status: 'ARCHIVED',
        updatedAt: {
          lt: cutoffDate,
        },
      },
      include: {
        media: true,
      },
    });

    if (oldArchivedPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum post para limpar',
        deletedCount: 0,
      });
    }

    // Collect media paths for Supabase deletion (extract path from URL)
    const mediaPaths = oldArchivedPosts.flatMap(post =>
      post.media
        .map(m => {
          // Extract path from Supabase URL: https://xxx.supabase.co/storage/v1/object/public/media/user-id/filename.ext
          try {
            const url = new URL(m.url);
            const pathParts = url.pathname.split('/media/');
            return pathParts.length > 1 ? pathParts[1] : null;
          } catch {
            return null;
          }
        })
        .filter((p): p is string => p !== null)
    );

    // Delete posts atomically using transaction to prevent race conditions
    // Using the same filter criteria directly in deleteMany avoids the TOCTOU race
    const deletedPosts = await prisma.$transaction(async (tx) => {
      // Re-verify posts still match criteria at deletion time
      const postsToDelete = await tx.post.findMany({
        where: {
          status: 'ARCHIVED',
          updatedAt: {
            lt: cutoffDate,
          },
        },
        select: { id: true },
      });

      if (postsToDelete.length === 0) {
        return { count: 0, ids: [] };
      }

      const result = await tx.post.deleteMany({
        where: {
          id: {
            in: postsToDelete.map(p => p.id),
          },
        },
      });

      return { count: result.count, ids: postsToDelete.map(p => p.id) };
    });

    // Optionally delete from Supabase Storage
    // Note: This requires SUPABASE_SERVICE_ROLE_KEY
    if (mediaPaths.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY !== 'placeholder-service-key') {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error: storageError } = await supabase.storage
          .from('media')
          .remove(mediaPaths);

        if (storageError) {
          console.warn('Failed to delete some media from Supabase:', storageError);
        }
      } catch (storageErr) {
        console.warn('Supabase cleanup skipped:', storageErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedPosts.count} posts arquivados antigos removidos`,
      deletedCount: deletedPosts.count,
      deletedPostIds: deletedPosts.ids,
      mediaDeleted: mediaPaths.length,
    });
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}