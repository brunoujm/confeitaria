'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type Post, type PostFiltersInput } from '@/lib/validations/post';

async function fetchPosts(filters: PostFiltersInput) {
  const params = new URLSearchParams();
  if (filters.view) params.set('view', filters.view);
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  if (filters.type?.length) params.set('type', filters.type.join(','));
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.authorId) params.set('authorId', filters.authorId);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.limit) params.set('limit', filters.limit.toString());

  const response = await fetch(`/api/posts?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar posts');
  }
  return response.json();
}

async function createPost(data: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'author' | 'media' | 'template'>) {
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar post');
  }
  return response.json();
}

async function updatePost(data: Partial<Post> & { id: string }) {
  const response = await fetch(`/api/posts/${data.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar post');
  }
  return response.json();
}

async function deletePost(id: string) {
  const response = await fetch(`/api/posts/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao excluir post');
  }
  return response.json();
}

export function usePosts(filters: PostFiltersInput = { page: 1, limit: 50 }) {
  const mergedFilters: PostFiltersInput = {
    page: filters.page ?? 1,
    limit: filters.limit ?? 50,
    view: filters.view,
    start: filters.start,
    end: filters.end,
    type: filters.type,
    status: filters.status,
    authorId: filters.authorId,
  };
  return useQuery({
    queryKey: ['posts', mergedFilters],
    queryFn: () => fetchPosts(mergedFilters),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: ['posts', id],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao buscar post');
      }
      return response.json();
    },
    enabled: !!id,
  });
}