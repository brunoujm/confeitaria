import { z } from 'zod';

export const mediaUploadSchema = z.object({
  url: z.string().url(),
  type: z.enum(['IMAGE', 'VIDEO']),
  size: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  postId: z.string(),
});

export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;