# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Confeitaria Content Manager** - A social media content management tool for Brazilian bakeries/confectioneries. Built with Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Prisma ORM, and Turso (libSQL). Features calendar with drag-and-drop, AI-assisted post creation, real-time collaboration, brand identity management, and Supabase Storage for media.

**Target users**: Two owners (husband and wife) who need to create, organize, approve, and publish social media content collaboratively.

**IMPORTANT**: Before making any code changes, **ALWAYS READ** `CORRECOES_REALIZADAS.md` to understand the current state and avoid duplicating work.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Access at http://localhost:3000

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
# Or run specific test file
npx jest tests/calendar/grid.test.tsx

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:studio      # Open Prisma Studio
npm run db:seed        # Seed database with default data

# Linting
npm run lint
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Auth pages (no sidebar)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/               # Protected dashboard pages
│   │   ├── layout.tsx             # Sidebar + header + notification bell
│   │   ├── calendar/page.tsx      # Calendar view (month/week/list)
│   │   ├── posts/
│   │   │   ├── [id]/page.tsx      # Post editor
│   │   │   └── new/page.tsx       # New post
│   │   ├── gallery/page.tsx       # Media gallery
│   │   ├── templates/page.tsx     # Template management
│   │   ├── brand/page.tsx         # Brand identity
│   │   ├── settings/
│   │   │   ├── ai/page.tsx        # AI config + presets
│   │   │   └── account/page.tsx   # Account settings
│   │   └── notifications/page.tsx # Notifications center
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth routes
│   │   ├── posts/                 # CRUD posts
│   │   ├── posts/[id]/            # Single post operations
│   │   ├── media/                 # Upload/list media
│   │   ├── templates/             # CRUD templates
│   │   ├── brand/                 # Brand identity singleton
│   │   ├── ai/                    # AI generation (caption, hashtags, image)
│   │   ├── ai/presets/            # AI presets CRUD
│   │   ├── notifications/         # Notifications CRUD
│   │   └── user/                  # User profile/password
│   ├── globals.css
│   ├── layout.tsx                 # Root layout with SessionProvider
│   └── page.tsx                   # Redirects to /calendar
├── components/
│   ├── ui/                        # Shadcn-style primitives (Button, Input, Card, etc.)
│   ├── calendar/                  # CalendarGrid, DayCell, PostCard, CalendarFilters
│   ├── editor/                    # PostEditor, MediaUploader, AIPanel, TemplateSelector, BrandQuickApply, VideoValidator
│   ├── brand/                     # ColorPicker, FontSelector, LogoUpload
│   ├── templates/                 # TemplateList, TemplateCard, TemplateBuilder
│   ├── notifications/             # NotificationBell, NotificationList
│   └── realtime/                  # PresenceAvatars, CursorOverlay, ConflictToast
├── hooks/
│   ├── usePosts.ts
│   ├── useMedia.ts
│   ├── useCalendar.ts
│   ├── useNotifications.ts
│   └── useRealtime.ts
├── lib/
│   ├── prisma.ts                  # Prisma singleton client
│   ├── auth.ts                    # NextAuth config
│   ├── ai.ts                      # Vercel AI SDK helpers
│   ├── upload.ts                  # Supabase Storage handling
│   ├── socket.ts                  # Socket.io client
│   ├── notifications.ts           # Notification helpers
│   ├── utils.ts                   # cn() helper, formatters
│   ├── ratelimit.ts               # Upstash Redis rate limiting
│   ├── video-metadata.ts          # ffprobe video metadata extraction
│   ├── video-validation.ts        # Server-side video validation per platform
│   └── validations/               # Zod schemas
│       ├── post.ts
│       ├── media.ts
│       ├── template.ts
│       ├── brand.ts
│       └── ai.ts
└── types/
    └── index.ts
```

## Key Implementation Details

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (darkMode: 'class') |
| Database | Turso (libSQL) + Prisma |
| Auth | NextAuth.js (credentials provider, bcrypt 12 rounds, JWT 30 days) |
| AI | Vercel AI SDK (OpenAI/Anthropic) |
| Storage | Supabase Storage |
| Real-time | Socket.io |
| State | TanStack Query (React Query) |
| Drag-and-drop | @dnd-kit |
| Validation | Zod |
| PWA | next-pwa |
| Rate limiting | Upstash Redis (20 req/min on `/api/ai/*`, expanded to all API routes with fail-closed in production) |

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

## Environment Variables

Create `.env` from `.env.example`:

```env
# Database (Turso/libSQL)
DATABASE_URL="libsql://your-database.turso.io"
DATABASE_AUTH_TOKEN="your-auth-token"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-min-32-chars"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_STORAGE_BUCKET="media"

# AI Providers
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# Socket.io
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
SOCKET_SECRET="your-socket-secret"

# Cron Jobs
CRON_SECRET="your-cron-secret-min-32-chars"
```

## Deploy (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Deploy automatically
5. Configure custom domain (optional)
6. Set up Vercel Cron for cleanup job: `"crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }]`

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

## Documentation References

- Design spec: `docs/superpowers/specs/2026-11-06-confeitaria-content-manager-design.md`
- Implementation plan: `docs/superpowers/plans/2026-11-06-confeitaria-content-manager-implementation.md`

## Git Workflow

- Main branch: `main`
- Current branch: `master`
- Recent commits show active development on the Confeitaria Content Manager

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