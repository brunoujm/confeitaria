'use client';

import { useParams } from 'next/navigation';
import { PostEditor } from '@/components/editor/PostEditor';
import { usePost } from '@/hooks/usePosts';
import { LoadingPostEditor } from '@/components/editor/LoadingPostEditor';
import { ClientOnly } from '@/components/ClientOnly';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};

function EditPostContent() {
  const params = useParams();
  const postId = params?.id as string;

  const { data: post, isLoading, error } = usePost(postId);

  if (isLoading) {
    return <LoadingPostEditor />;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Post não encontrado</h1>
          <p className="text-muted-foreground mb-4">O post que você procura não existe ou foi removido.</p>
          <a href="/posts" className="text-primary hover:underline">Voltar para posts</a>
        </div>
      </div>
    );
  }

  return <PostEditor initialData={post} isEditing={true} />;
}

export default function EditPostPage() {
  return (
    <ClientOnly>
      <EditPostContent />
    </ClientOnly>
  );
}