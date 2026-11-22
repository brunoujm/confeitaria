'use client';

import { useParams } from 'next/navigation';

export const viewport = {
  themeColor: "#E85D75",
  width: "device-width",
  initialScale: 1,
};
import { PostEditor } from '@/components/editor/PostEditor';
import { usePost } from '@/hooks/usePosts';
import { Card, CardContent } from '@/components/ui/Card';
import { Loader2 } from 'lucide-react';

export default function EditPostPage() {
  const params = useParams();
  const postId = params?.id as string;
  const { data, isLoading, error } = usePost(postId);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando post...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center text-red-500">
            <p>Erro ao carregar post: {error?.message || 'Post não encontrado'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PostEditor
      initialData={data}
      isEditing={true}
    />
  );
}