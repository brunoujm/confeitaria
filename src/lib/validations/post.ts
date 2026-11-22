import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  type: z.enum(['FEED', 'STORIES', 'REELS', 'WHATSAPP_STATUS', 'WHATSAPP_CATALOG']),
  status: z.enum(['DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  scheduledAt: z.string().datetime().optional().nullable(),
  templateId: z.string().optional().nullable(),
  media: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['IMAGE', 'VIDEO']),
    size: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    order: z.number().optional(),
  })).optional(),
});

export const updatePostSchema = createPostSchema.partial().extend({
  id: z.string(),
});

export const postFiltersSchema = z.object({
  view: z.enum(['month', 'week', 'list']).optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  type: z.array(z.enum(['FEED', 'STORIES', 'REELS', 'WHATSAPP_STATUS', 'WHATSAPP_CATALOG'])).optional(),
  status: z.array(z.enum(['DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED'])).optional(),
  authorId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostFiltersInput = z.infer<typeof postFiltersSchema>;

export type PostType = 'FEED' | 'STORIES' | 'REELS' | 'WHATSAPP_STATUS' | 'WHATSAPP_CATALOG';
export type PostStatus = 'DRAFT' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export interface PostMedia {
  id: string;
  postId: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  size?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostAuthor {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface PostTemplate {
  id: string;
  name: string;
  thumbnail: string | null;
}

export interface Post {
  id: string;
  title: string;
  caption: string | null;
  hashtags: string[];
  type: PostType;
  status: PostStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  templateId: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author: PostAuthor;
  media: PostMedia[];
  template: PostTemplate | null;
}

export interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}