# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Confeitaria Content Manager** - A social media content management tool for Brazilian bakeries/confectioneries. Built with Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Prisma ORM, and Turso (libSQL). Features calendar with drag-and-drop, AI-assisted post creation, real-time collaboration, brand identity management, and Supabase Storage for media.

**Target users**: Two owners (husband and wife) who need to create, organize, approve, and publish social media content collaboratively.

**IMPORTANT**: Before making any code changes, **ALWAYS READ** `CORRECOES_REALIZADAS.md` to understand the current state and avoid duplicating work.

## Key Implementation Details

### Database Schema (Prisma)
Key models: `User`, `Post`, `Media`, `Template`, `BrandIdentity`, `AIConfig`, `AIPreset`, `Notification`

**Important**: Uses SQLite provider locally (`provider = "sqlite"`), but designed for Turso (libSQL) in production. Enums are stored as strings (PostType, PostStatus, MediaType, PresetType, NotificationType).

JSON fields stored as strings: `Post.hashtags`, `Template.structure`, `BrandIdentity.colors/fonts/logos/defaultHashtags`, `AIPreset.variables`, `Notification.data`.

### Authentication
- **NextAuth.js** with credentials provider only
- **bcrypt** with 12 rounds for password hashing
- **JWT** sessions, 30-day expiry
- **Middleware** protects all routes except `/login`, `/register`, `/api/auth/*`
- Two default users seeded: `voce@email.com` and `esposa@email.com` (password: `123456`)

### Post Status Flow
```
DRAFT ↔ APPROVED → PUBLISHED → ARCHIVED
```
- Soft delete = status `ARCHIVED`
- Auto-cleanup job deletes archived posts older than 30 days (Vercel Cron)

### Post Types
- `FEED` (4:5 or 1:1, ≤60s video)
- `STORIES` (9:16, ≤15s)
- `REELS` (9:16, ≤90s)
- `WHATSAPP_STATUS` (9:16, ≤30s)
- `WHATSAPP_CATALOG` (1:1)

### AI Integration
- **Vercel AI SDK**: `generateText`, `generateObject`, `streamText`
- **Models**: OpenAI (gpt-4o, dall-e-3) or Anthropic (claude-3-5-sonnet)
- **Endpoints**: `POST /api/ai` with action: `caption` | `hashtags` | `image`
- **Presets**: CRUD per type (CAPTION, HASHTAGS, IMAGE) with variable substitution `{produto}`, `{ocasião}`, `{tom}`, `{cta}`, `{marca}`

### Real-time Collaboration
- Socket.io server at `/api/socket`
- Features: presence avatars, remote cursors, conflict detection (last-write-wins with toast)
- Connected via `useRealtime` hook in PostEditor

### Media Upload
- **Supabase Storage** bucket: `media`
- Validation: MIME + magic bytes (`file-type` package)
- Limits: 10MB images, 50MB videos
- Returns public URLs stored in `Media` records

### Brand Identity
- Singleton per user (enforced by `isDefault` flag)
- Colors: primary, secondary, accent, background, surface, text, textMuted, success, warning, error
- Fonts: heading, body (Google Fonts search integration)
- Logos: main, dark, watermark
- Export/Import as JSON

### Calendar
- Views: Month (default), Week, List
- Drag-and-drop via `@dnd-kit` updates `scheduledAt`
- Filters: PostType, Status, Author
- Mobile: grouped list + bottom sheet editor

### Notifications
- In-app (real-time via Socket.io) + email
- Types: `POST_APPROVED`, `POST_PUBLISHED`, `POST_COMMENT`, `MENTION`, `SYSTEM`
- Bell icon in header with unread count

### PWA
- `next-pwa` with offline read-only calendar
- Cache strategies: `CacheFirst` for Supabase images, `NetworkFirst` for posts API
- Manifest: standalone display, theme color `#E85D75`

## Current Features (Implemented)

1. ✅ Project setup (Next.js, TypeScript, Tailwind, Prisma, PWA)
2. ✅ Authentication (NextAuth credentials, login/register pages)
3. ✅ Middleware route protection
4. ✅ Database schema with all models
5. ✅ Dashboard layout with sidebar + header + user dropdown
6. ✅ Calendar page with grid, drag-and-drop, filters
7. ✅ Post editor with media upload, AI panel, templates, brand quick-apply, video validation
8. ✅ Media gallery with lazy load, filters, upload
9. ✅ Templates CRUD and visual builder
10. ✅ Brand identity page (palette, fonts, logos, export/import)
11. ✅ AI integration (caption, hashtags, image generation with streaming)
12. ✅ AI presets CRUD in settings
13. ✅ Notifications API + bell component (placeholder in header)
14. ✅ Account settings (profile, password, notifications)

## Recent Security Improvements (2026-11-22)

- **Ownership checks** added to all Posts API routes (PUT/DELETE on `/api/posts/[id]`) - prevents users from modifying other users' posts
- **Input sanitization** implemented in AI route (`/api/ai`) - prevents prompt injection and XSS attacks via HTML entity encoding
- **Rate limiting fail-closed** in production - rate limiter now blocks requests when Redis is unavailable (instead of fail-open)
- **Rate limiting expanded** to all API routes: `/api/posts/*`, `/api/templates/*`, `/api/brand/*`, `/api/notifications/*`, `/api/ai/presets/*`
- **Security headers** in middleware: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Magic bytes validation** for media uploads - prevents malicious file uploads with spoofed MIME types
- **Server-side video validation** with ffprobe - validates duration, dimensions, aspect ratio, codec per platform (Reels, Stories, Feed, WhatsApp)

## Testing

- **Framework**: Jest + React Testing Library + jsdom
- **Setup**: `jest.setup.js` with `@testing-library/jest-dom`
- **CSS modules**: Mocked via `identity-obj-proxy`
- **Transform**: `babel-jest` for TS/TSX/JS/JSX
- **Path aliases**: `@/*` → `<rootDir>/src/*`

**Test files:**
- `tests/auth/login.test.tsx` - Login form validation and NextAuth integration (6 tests)
- `tests/auth/register.test.tsx` - Registration form validation and API (7 tests)
- `tests/security/video-validation.test.ts` - Server-side video validation per platform (18 tests)

Run tests:
```bash
npm test                    # All tests (31 tests)
npm test -- --coverage     # With coverage
npx jest tests/auth/login.test.tsx      # Single test file
```

## Common Patterns

### Adding a new API route
```typescript
// src/app/api/posts/route.ts
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });
  
  const posts = await prisma.post.findMany({
    where: { authorId: session.user.id },
    include: { media: true, author: true },
  });
  return Response.json(posts);
}
```

### Using TanStack Query hooks
```typescript
// src/hooks/usePosts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function usePosts(filters) {
  return useQuery({
    queryKey: ['posts', filters],
    queryFn: () => fetchPosts(filters),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
}
```

### Currency formatting (BRL)
```typescript
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
```

### Status colors (Tailwind)
- `DRAFT`: `bg-gray-100 text-gray-800`
- `APPROVED`: `bg-green-100 text-green-800`
- `PUBLISHED`: `bg-blue-100 text-blue-800`
- `ARCHIVED`: `bg-red-100 text-red-800`

## Histórico de Correções

**IMPORTANTE**: Antes de executar qualquer nova correção de código, **SEMPRE LEIA** o arquivo `CORRECOES_REALIZADAS.md` para evitar duplicar trabalho e conhecer o estado atual do projeto.

## Notes for Future Development

1. **Turso migration**: Currently using SQLite locally. For production, switch `provider = "libsql"` in `prisma/schema.prisma` and add `DATABASE_AUTH_TOKEN`.

2. **Socket.io scaling**: For multi-instance deployments, add Redis adapter (`@socket.io/redis-adapter`) and set `REDIS_URL`.

3. **Rate limiting**: Currently uses Upstash Redis. Fail-closed in production (blocks if Redis down), fail-open in development.

4. **AI API keys**: Stored in `AIConfig` model (encrypted in production). Fallback to default presets if keys missing.

5. **Soft delete cleanup**: Vercel Cron job at `/api/cron/cleanup` runs daily at 3 AM UTC.

6. **PWA offline**: Read-only calendar cached. Mutations require online.

7. **Real-time conflicts**: Last-write-wins with toast notification. No operational transform.

8. **Video validation server-side**: Requires ffprobe in production environment (Docker, Vercel Layer, or external service like Mux/Cloudflare Stream). Client-side fallback via VideoValidator component.

9. **Critical security issues fixed** (see CORRECOES_REALIZADAS.md): Auth bypass on 7 API routes, SQL injection risk, magic bytes validation, race condition in cron, memory leak in Prisma client, rate limiting fail-open.