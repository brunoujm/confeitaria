// Confeitaria Content Manager - Type Definitions

export type Role = 'OWNER';

export type PostType = 'FEED' | 'STORIES' | 'REELS' | 'WHATSAPP_STATUS' | 'WHATSAPP_CATALOG';

export type PostStatus = 'DRAFT' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export type MediaType = 'IMAGE' | 'VIDEO';

export type PresetType = 'CAPTION' | 'HASHTAGS' | 'IMAGE';

export type NotificationType = 'POST_APPROVED' | 'POST_PUBLISHED' | 'POST_COMMENT' | 'MENTION' | 'SYSTEM';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  author?: User;
  templateId: string | null;
  template?: Template | null;
  media: Media[];
}

export interface Media {
  id: string;
  url: string;
  type: MediaType;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  createdAt: Date;
  postId: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  type: PostType;
  content: TemplateContent;
  thumbnail: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateContent {
  layout: string;
  placeholders: TemplatePlaceholder[];
  styles: Record<string, string>;
}

export interface TemplatePlaceholder {
  id: string;
  type: 'text' | 'image' | 'video';
  label: string;
  required: boolean;
  defaultValue?: string;
}

export interface BrandIdentity {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logos: {
    main: string;
    dark: string;
    watermark: string;
  };
  defaultHashtags: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIConfig {
  id: string;
  openaiModel: string;
  anthropicModel: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIPreset {
  id: string;
  name: string;
  type: PresetType;
  prompt: string;
  variables: Record<string, string> | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data: Record<string, unknown> | null;
  createdAt: Date;
  userId: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form types
export interface CreatePostInput {
  title: string;
  caption?: string;
  hashtags?: string[];
  type: PostType;
  templateId?: string;
  scheduledAt?: Date;
}

export interface UpdatePostInput {
  title?: string;
  caption?: string;
  hashtags?: string[];
  type?: PostType;
  status?: PostStatus;
  templateId?: string;
  scheduledAt?: Date | null;
}

export interface CreateMediaInput {
  url: string;
  type: MediaType;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  type: PostType;
  content: TemplateContent;
  thumbnail?: string;
  isPublic?: boolean;
}

export interface CreateBrandIdentityInput {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  toneOfVoice?: string;
}

export interface UpdateAIConfigInput {
  openaiModel?: string;
  anthropicModel?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface CreateAIPresetInput {
  name: string;
  type: PresetType;
  prompt: string;
  variables?: Record<string, string>;
  isDefault?: boolean;
}

// Socket.io events
export interface SocketEvents {
  'post:join': (postId: string) => void;
  'post:leave': (postId: string) => void;
  'post:update': (data: { postId: string; updates: Partial<Post> }) => void;
  'presence:update': (data: { postId: string; userId: string; cursor?: { x: number; y: number } }) => void;
  'comment:add': (data: { postId: string; comment: Comment }) => void;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}