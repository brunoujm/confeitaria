# Confeitaria Content Manager - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a social media content manager for a bakery/confectionery with calendar, AI-assisted creation, real-time collaboration, brand identity, and Supabase storage.

**Architecture:** Next.js 14 App Router + TypeScript + Tailwind + Prisma (Turso/libSQL) + NextAuth + Vercel AI SDK + Socket.io + Supabase Storage + Upstash Redis. Serverless-first, deployed on Vercel.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma ORM, Turso (libSQL), NextAuth.js, Vercel AI SDK (OpenAI/Anthropic), Socket.io, Supabase Storage, Upstash Redis, @dnd-kit, TanStack Query, Zod, next-pwa.

**Spec:** `docs/superpowers/specs/2026-11-06-confeitaria-content-manager-design.md`

---

## Global Constraints

- **Node.js ≥ 20**, **Next.js 14.2+**, **React 18.3+**, **TypeScript 5.5+**
- **Turso database** (libSQL) — `DATABASE_URL=libsql://...`, `DATABASE_AUTH_TOKEN=...`
- **Supabase Storage** for all media — bucket `media`, public URLs
- **NextAuth credentials provider** — bcrypt 12 rounds, JWT 30 days
- **Vercel AI SDK** — `generateText`, `generateObject`, `streamText` only
- **Rate limit**: 20 req/min per user on `/api/ai/*` via Upstash Redis
- **Upload validation**: MIME + magic bytes (`file-type` package), max 10MB image / 50MB video
- **Soft delete**: `status=ARCHIVED` + auto-cleanup job at 30 days
- **PWA**: `next-pwa` with offline read-only calendar
- **Real-time**: Socket.io for collaborative editing (presence, cursors)
- **Post status transitions**: DRAFT↔APPROVED, APPROVED→PUBLISHED, PUBLISHED→ARCHIVED
- **BrandIdentity singleton** enforced by `@@unique([])` + API logic
- **AIConfig global** (single record, no userId)
- **AIPreset CRUD** per type: CAPTION, HASHTAGS, IMAGE

---

## Review Focus

| Input Class / Failure Mode | Expected Behavior | Test Location |
|---|---|---|
| Concurrent edits on same post | Last-write-wins with Socket.io conflict toast; no data loss | Task 14 (Realtime) |
| Invalid video upload (wrong aspect/duration) | Rejected with clear error per PostType spec | Task 8 (Media Upload) |
| AI API key missing/invalid | Graceful fallback to preset defaults; toast error | Task 11 (AI Integration) |
| Rate limit exceeded on AI endpoints | 429 with retry-after; queue or reject gracefully | Task 12 (Rate Limiting) |
| Supabase upload failure (network/quota) | Retry 3x with exponential backoff; local queue fallback | Task 8 (Media Upload) |

---

## File Structure Map

```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── calendar/page.tsx
│   │   ├── posts/[id]/page.tsx
│   │   ├── posts/new/page.tsx
│   │   ├── gallery/page.tsx
│   │   ├── templates/page.tsx
│   │   ├── brand/page.tsx
│   │   ├── settings/ai/page.tsx
│   │   └── settings/account/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── posts/route.ts
│   │   ├── posts/[id]/route.ts
│   │   ├── media/route.ts
│   │   ├── templates/route.ts
│   │   ├── brand/route.ts
│   │   ├── ai/route.ts
│   │   ├── notifications/route.ts
│   │   └── socket/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (Button, Input, Modal, Card, Badge, Avatar, Dropdown, Toast, etc.)
│   ├── calendar/ (CalendarGrid, DayCell, PostCard, CalendarFilters, CalendarLegend)
│   ├── editor/ (PostEditor, MediaUploader, AIPanel, TemplateSelector, BrandQuickApply, VideoValidator)
│   ├── brand/ (ColorPicker, FontSelector, LogoUpload, PaletteHarmony, BrandExportImport)
│   ├── templates/ (TemplateCard, TemplateBuilder, TemplateList)
│   ├── notifications/ (NotificationBell, NotificationList, NotificationItem)
│   └── realtime/ (PresenceAvatars, CursorOverlay, ConflictToast)
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── ai.ts
│   ├── upload.ts
│   ├── socket.ts
│   ├── notifications.ts
│   ├── utils.ts
│   └── validations/
│       ├── post.ts
│       ├── media.ts
│       ├── template.ts
│       ├── brand.ts
│       └── ai.ts
├── hooks/
│   ├── usePosts.ts
│   ├── useMedia.ts
│   ├── useCalendar.ts
│   ├── useNotifications.ts
│   └── useRealtime.ts
└── types/index.ts
```

---

## Task 0: Project Setup & Configuration

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `.env.example`, `.gitignore`
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`, `src/lib/utils.ts`
- Create: `src/types/index.ts`

**Interfaces:**
- Produces: Prisma client singleton, Tailwind config, Next.js config, TypeScript types, env validation

- [ ] **Step 1: Initialize Next.js 14 project with TypeScript, Tailwind, ESLint**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @prisma/client prisma @auth/prisma-adapter next-auth bcryptjs @ai-sdk/openai @ai-sdk/anthropic ai zod @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @tanstack/react-query @supabase/supabase-js socket.io socket.io-client next-pwa upstash-ratelimit file-type lucide-react date-fns clsx tailwind-merge
npm install -D @types/bcryptjs @types/node
```

- [ ] **Step 3: Configure Prisma schema with all models**

```prisma
// prisma/schema.prisma - full schema from design doc
generator client { provider = "prisma-client-js" }
datasource db { provider = "libsql"; url = env("DATABASE_URL"); authToken = env("DATABASE_AUTH_TOKEN") }

enum Role { OWNER }
enum PostType { FEED STORIES REELS WHATSAPP_STATUS WHATSAPP_CATALOG }
enum PostStatus { DRAFT APPROVED PUBLISHED ARCHIVED }
enum MediaType { IMAGE VIDEO }
enum PresetType { CAPTION HASHTAGS IMAGE }
enum NotificationType { POST_APPROVED POST_PUBLISHED POST_COMMENT MENTION SYSTEM }

model User { ... }
model Post { ... }
model Media { ... }
model Template { ... }
model BrandIdentity { ... @@unique([]) }
model AIConfig { ... }
model AIPreset { ... }
model Notification { ... }
```

- [ ] **Step 4: Create Prisma singleton client**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 5: Configure Tailwind, Next.js, TypeScript, PWA**

```typescript
// tailwind.config.ts - content paths, darkMode: 'class', plugins: []
// next.config.js - withPWA, images: { domains: ['supabase.co'] }, experimental: { serverActions: { bodySizeLimit: '50mb' } }
// tsconfig.json - strict: true, paths: { "@/*": ["./src/*"] }
```

- [ ] **Step 6: Run Prisma generate and push**

```bash
npx prisma generate
npx prisma db push
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: project setup with Next.js, Prisma, Tailwind, PWA"
```

---

## Task 1: Authentication (NextAuth Credentials)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`
- Create: `src/components/ui/*` (Button, Input, Card, Label, Toast)

**Interfaces:**
- Consumes: Prisma client, bcrypt, NextAuth config
- Produces: `authOptions`, `GET/POST /api/auth/[...nextauth]`, login/register pages, middleware

- [ ] **Step 1: Write failing test for login flow**

```typescript
// tests/auth/login.test.ts
import { signIn } from 'next-auth/react';
test('credentials sign in creates session', async () => {
  const result = await signIn('credentials', { email: 'test@test.com', password: '123456', redirect: false });
  expect(result?.ok).toBe(true);
});
```

- [ ] **Step 2: Run test → FAIL**

```bash
npm test -- tests/auth/login.test.ts
```

- [ ] **Step 3: Implement auth config with credentials provider**

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: 'credentials',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      authorize: async (creds) => {
        const user = await prisma.user.findUnique({ where: { email: creds?.email } });
        if (!user?.password) return null;
        const valid = await bcrypt.compare(creds!.password, user.password);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    jwt: ({ token, user }) => { if (user) token.id = user.id; return token; },
    session: ({ session, token }) => { if (session.user) session.user.id = token.id; return session; },
  },
  pages: { signIn: '/login' },
});
```

- [ ] **Step 4: Create API route**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from '@/lib/auth';
```

- [ ] **Step 5: Create login/register pages with form validation (Zod)**

```typescript
// src/app/(auth)/login/page.tsx - form with email/password, signIn('credentials')
// src/app/(auth)/register/page.tsx - form with name/email/password/confirm, creates user with bcrypt hash
```

- [ ] **Step 6: Run test → PASS**

```bash
npm test -- tests/auth/login.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: authentication with NextAuth credentials provider"
```

---

## Task 2: Middleware & Route Protection

**Files:**
- Create: `src/middleware.ts`
- Modify: `src/app/(dashboard)/layout.tsx` (add sidebar/header shell)

**Interfaces:**
- Consumes: `auth()` from NextAuth
- Produces: Protected routes, redirect to `/login` if unauthenticated

- [ ] **Step 1: Write failing test for middleware**

```typescript
// tests/middleware.test.ts
test('redirects unauthenticated to /login', async () => {
  const res = await fetch('/calendar', { redirect: 'manual' });
  expect(res.status).toBe(307);
  expect(res.headers.get('location')).toContain('/login');
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement middleware**

```typescript
// src/middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register');
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth');

  if (isAuthPage && isLoggedIn) return NextResponse.redirect(new URL('/calendar', req.url));
  if (!isLoggedIn && !isAuthPage && !isApiAuth) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
});

export const config = { matcher: ['/((?!_next|favicon.ico|.*\\.png$).*)'] };
```

- [ ] **Step 4: Create dashboard layout with sidebar + header + notification bell**

```tsx
// src/app/(dashboard)/layout.tsx
// Sidebar: Calendar, Posts, Gallery, Templates, Brand, Settings
// Header: User avatar, NotificationBell, Logout
// <Outlet /> for children
```

- [ ] **Step 5: Run test → PASS**

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: middleware protection and dashboard layout"
```

---

## Task 3: Database Seeding & Brand Identity Singleton

**Files:**
- Create: `prisma/seed.ts`
- Create: `src/app/api/brand/route.ts`
- Create: `src/lib/notifications.ts`

**Interfaces:**
- Consumes: Prisma client
- Produces: Default users, singleton BrandIdentity, default AIConfig, default AIPresets

- [ ] **Step 1: Write seed script**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('123456', 12);
  await prisma.user.upsert({
    where: { email: 'voce@email.com' },
    update: {},
    create: { email: 'voce@email.com', name: 'Você', password, role: 'OWNER' },
  });
  await prisma.user.upsert({
    where: { email: 'esposa@email.com' },
    update: {},
    create: { email: 'esposa@email.com', name: 'Esposa', password, role: 'OWNER' },
  });

  await prisma.brandIdentity.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      colors: { primary: '#E85D75', secondary: '#F5C6A5', accent: '#88D4E8', background: '#FFF8F0', text: '#2D2D2D' },
      fonts: { heading: 'Playfair Display', body: 'Inter', headingUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap', bodyUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap' },
      logoLight: null, logoDark: null, watermark: null,
    },
  });

  await prisma.aIConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', provider: 'openai', apiKey: '', modelText: 'gpt-4o', modelImage: 'dall-e-3', promptDefaults: {} },
  });

  // Default presets
  const presets = [
    { name: 'Legenda Padrão', type: 'CAPTION', prompt: 'Você é um social media de confeitaria artesanal...', isDefault: true },
    { name: 'Hashtags Padrão', type: 'HASHTAGS', prompt: 'Gere 15 hashtags relevantes para confeitaria no Brasil...', isDefault: true },
    { name: 'Imagem Padrão', type: 'IMAGE', prompt: 'Foto profissional de {produto}, iluminação natural, fundo limpo, estilo lifestyle, alta resolução.', isDefault: true },
  ];
  for (const p of presets) {
    await prisma.aIPreset.upsert({ where: { id: `default-${p.type.toLowerCase()}` }, update: {}, create: { ...p, id: `default-${p.type.toLowerCase()}` } });
  }
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seed**

```bash
npx prisma db seed
```

- [ ] **Step 3: Create Brand API (GET/PUT singleton)**

```typescript
// src/app/api/brand/route.ts
export async function GET() { return Response.json(await prisma.brandIdentity.findFirstOrThrow({ where: { id: 'singleton' } })); }
export async function PUT(req: Request) { const data = await req.json(); return Response.json(await prisma.brandIdentity.update({ where: { id: 'singleton' }, data })); }
```

- [ ] **Step 4: Create notification helpers**

```typescript
// src/lib/notifications.ts
export async function createNotification(userId: string, type: NotificationType, title: string, message: string, data?: Json) {
  await prisma.notification.create({ data: { userId, type, title, message, data } });
  // Emit real-time via socket
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: database seeding and brand identity singleton API"
```

---

## Task 4: Calendar Page & Grid Component

**Files:**
- Create: `src/app/(dashboard)/calendar/page.tsx`
- Create: `src/components/calendar/CalendarGrid.tsx`, `DayCell.tsx`, `PostCard.tsx`, `CalendarFilters.tsx`, `CalendarLegend.tsx`
- Create: `src/hooks/useCalendar.ts`, `src/hooks/usePosts.ts`
- Create: `src/lib/validations/post.ts`

**Interfaces:**
- Consumes: `usePosts` hook, Post API
- Produces: Month/week/list views, drag-and-drop, filters, post cards

- [ ] **Step 1: Write failing test for calendar grid**

```typescript
// tests/calendar/grid.test.tsx
import { render, screen } from '@testing-library/react';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
test('renders 42 day cells for current month', () => {
  render(<CalendarGrid posts={[]} view="month" />);
  expect(screen.getAllByRole('gridcell')).toHaveLength(42);
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement Post API (GET/POST /api/posts, GET/PUT/DELETE /api/posts/[id])**

```typescript
// src/app/api/posts/route.ts
// GET: query params (view, start, end, type, status, author) → returns posts with media, author
// POST: validate with Zod → create post with status DRAFT

// src/app/api/posts/[id]/route.ts
// GET: single post with relations
// PUT: validate transitions (DRAFT↔APPROVED, APPROVED→PUBLISHED, PUBLISHED→ARCHIVED)
// DELETE: soft delete (status=ARCHIVED)
```

- [ ] **Step 4: Implement usePosts hook with TanStack Query**

```typescript
// src/hooks/usePosts.ts
export function usePosts(filters) { return useQuery({ queryKey: ['posts', filters], queryFn: () => fetchPosts(filters) }); }
export function useCreatePost() { return useMutation({ mutationFn: createPost, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }) }); }
export function useUpdatePost() { ... }
export function useDeletePost() { ... }
export function useDragDropPost() { ... } // optimistic update for scheduledAt
```

- [ ] **Step 5: Implement CalendarGrid with @dnd-kit**

```tsx
// CalendarGrid.tsx
// DndContext + SortableContext for month view
// DayCell: drops update scheduledAt via useDragDropPost
// PostCard: shows type icon, status badge, title/caption preview, author avatar
// Filters: PostType multi-select, Status multi-select, Author multi-select
// Legend: status colors, type icons
```

- [ ] **Step 6: Mobile view: grouped list + bottom sheet**

```tsx
// CalendarMobile.tsx
// Group posts by day, collapsible sections
// BottomSheet for editor (reuses PostEditor)
```

- [ ] **Step 7: Run test → PASS**

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: calendar page with grid, drag-drop, filters, mobile view"
```

---

## Task 5: Post Editor Page

**Files:**
- Create: `src/app/(dashboard)/posts/[id]/page.tsx`, `src/app/(dashboard)/posts/new/page.tsx`
- Create: `src/components/editor/PostEditor.tsx`, `MediaUploader.tsx`, `AIPanel.tsx`, `TemplateSelector.tsx`, `BrandQuickApply.tsx`, `VideoValidator.tsx`
- Create: `src/lib/validations/media.ts`, `src/lib/validations/template.ts`

**Interfaces:**
- Consumes: `usePosts`, `useMedia`, `useTemplates`, `useBrand`, AI API, Upload API
- Produces: Full post editor with media, caption, AI, templates, brand, video validation

- [ ] **Step 1: Write failing test for editor**

```typescript
// tests/editor/post-editor.test.tsx
test('saves post with caption and media', async () => {
  render(<PostEditor postId="new" />);
  await userEvent.type(screen.getByLabelText('Legenda'), 'Teste');
  await userEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));
  expect(screen.getByText(/rascunho salvo/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement PostEditor layout (left 70% / right 30%)**

```tsx
// PostEditor.tsx
// Tabs: Feed, Stories, Reels, WhatsApp Status, WhatsApp Catálogo
// Left: MediaUploader (drag-drop, reorder, max 10), Caption textarea + toolbar, AIPanel
// Right: TemplateSelector (cards, click = overwrite all), BrandQuickApply (palette, fonts, logo), VideoValidator (per type), Schedule config
// Footer: Save Draft, Approve, Publish (opens web), Delete (soft)
```

- [ ] **Step 4: Implement MediaUploader with Supabase upload**

```tsx
// MediaUploader.tsx
// Dropzone + file input
// Preview grid with drag handles (Sortable from @dnd-kit)
// Upload progress, error handling
// Calls /api/media (POST) for each file
```

- [ ] **Step 5: Implement AIPanel with streaming**

```tsx
// AIPanel.tsx
// Buttons: ✨ Gerar legenda, 🏷️ Hashtags, 🎨 Criar imagem
// Uses /api/ai/route.ts with streaming (Vercel AI SDK)
// Shows loading skeletons, inserts result into caption/hashtags/media
// Image generation: downloads from temp URL → uploads to Supabase → adds to MediaUploader
```

- [ ] **Step 6: Implement TemplateSelector (overwrite behavior)**

```tsx
// TemplateSelector.tsx
// Fetches templates by post type
// Card shows thumbnail, name
// Click → confirm "Substituir todo o conteúdo?" → applies template.config (media placeholders, caption template, colors, fonts)
```

- [ ] **Step 7: Implement VideoValidator**

```tsx
// VideoValidator.tsx
// On video upload, reads metadata (duration, dimensions)
// Validates per PostType:
//   REELS: 9:16, ≤90s
//   STORIES: 9:16, ≤15s
//   WHATSAPP_STATUS: 9:16, ≤30s
//   FEED: 4:5 or 1:1, ≤60s
// Shows error toast if invalid, prevents save
```

- [ ] **Step 8: Implement BrandQuickApply**

```tsx
// BrandQuickApply.tsx
// Shows current palette (5 colors), fonts (heading/body), logos
// Click color → applies to selected text/element in editor
// Click font → applies to caption
// Click logo → adds to media uploader
```

- [ ] **Step 9: Run test → PASS**

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: post editor with media, AI, templates, brand, video validation"
```

---

## Task 6: Media Gallery Page

**Files:**
- Create: `src/app/(dashboard)/gallery/page.tsx`
- Create: `src/components/editor/MediaUploader.tsx` (reuse), `MediaGrid.tsx`, `MediaFilters.tsx`
- Create: `src/hooks/useMedia.ts`

**Interfaces:**
- Consumes: Media API, useMedia hook
- Produces: Grid with lazy load, filters, multi-select, upload

- [ ] **Step 1: Write failing test for gallery**

```typescript
// tests/gallery/media-grid.test.tsx
test('displays uploaded media in grid', () => {
  render(<MediaGrid media={mockMedia} />);
  expect(screen.getAllByRole('img')).toHaveLength(mockMedia.length);
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement Media API**

```typescript
// src/app/api/media/route.ts
// POST: validate MIME + magic bytes, upload to Supabase Storage, create Media record
// GET: query params (type, postId, date) → paginated media
// DELETE: delete from Supabase + DB
```

- [ ] **Step 4: Implement useMedia hook**

```typescript
// src/hooks/useMedia.ts
export function useMedia(filters) { ... }
export function useUploadMedia() { ... } // progress, retry
export function useDeleteMedia() { ... }
```

- [ ] **Step 5: Implement gallery page with lazy load grid**

```tsx
// Gallery page
// MediaFilters: type (image/video), postId, date range
// MediaGrid: IntersectionObserver lazy load, click to select (multi), drag to editor
// Upload zone at top
```

- [ ] **Step 6: Run test → PASS**

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: media gallery with upload, lazy load, filters"
```

---

## Task 7: Templates Page & Builder

**Files:**
- Create: `src/app/(dashboard)/templates/page.tsx`
- Create: `src/components/templates/TemplateList.tsx`, `TemplateCard.tsx`, `TemplateBuilder.tsx`
- Create: `src/lib/validations/template.ts` (Zod schema for config JSON)

**Interfaces:**
- Consumes: Template API, BrandIdentity
- Produces: Template CRUD, visual builder (canvas-like), type-specific configs

- [ ] **Step 1: Write failing test for template builder**

```typescript
// tests/templates/builder.test.tsx
test('creates template with config', async () => {
  render(<TemplateBuilder type="FEED" />);
  // interact with builder
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(await fetch('/api/templates').then(r => r.json())).toContainEqual(expect.objectContaining({ type: 'FEED' }));
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement Template API**

```typescript
// src/app/api/templates/route.ts
// GET: all templates, grouped by type
// POST: validate config with Zod schema per type
// src/app/api/templates/[id]/route.ts
// GET/PUT/DELETE single template
```

- [ ] **Step 4: Define Template config Zod schemas**

```typescript
// src/lib/validations/template.ts
const baseConfig = z.object({
  background: z.union([z.string(), z.object({ color: z.string(), image: z.string().url().optional() })]),
  elements: z.array(z.object({
    type: z.enum(['text', 'image', 'logo', 'shape']),
    position: z.object({ x: z.number(), y: z.number() }),
    size: z.object({ width: z.number(), height: z.number() }),
    style: z.object({ color: z.string().optional(), fontFamily: z.string().optional(), fontSize: z.number().optional(), fontWeight: z.string().optional() }).optional(),
    placeholder: z.string().optional(), // e.g. "{{caption}}", "{{logo}}"
  })),
});

export const feedTemplateSchema = baseConfig;
export const storiesTemplateSchema = baseConfig.extend({ aspectRatio: z.literal('9:16') });
export const reelsTemplateSchema = baseConfig.extend({ aspectRatio: z.literal('9:16') });
export const whatsappStatusTemplateSchema = baseConfig.extend({ aspectRatio: z.literal('9:16') });
export const whatsappCatalogTemplateSchema = baseConfig.extend({ aspectRatio: z.literal('1:1') });
```

- [ ] **Step 5: Implement TemplateBuilder (simplified canvas)**

```tsx
// TemplateBuilder.tsx
// Fabric.js or custom canvas with drag-drop elements
// Toolbar: Add Text, Add Image Placeholder, Add Logo Placeholder, Add Shape
// Properties panel: position, size, style, placeholder binding
// Preview toggle: shows with sample data from BrandIdentity
// Save → validates config → POST /api/templates
```

- [ ] **Step 6: Implement TemplateList with type tabs**

```tsx
// TemplateList.tsx
// Tabs per PostType
// TemplateCard: thumbnail, name, type badge, actions (edit, duplicate, delete)
// Click card in editor → applies template (overwrites)
```

- [ ] **Step 7: Run test → PASS**

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: templates CRUD and visual builder with type-specific configs"
```

---

## Task 8: Brand Identity Page

**Files:**
- Create: `src/app/(dashboard)/brand/page.tsx`
- Create: `src/components/brand/ColorPicker.tsx`, `FontSelector.tsx`, `LogoUpload.tsx`, `PaletteHarmony.tsx`, `BrandExportImport.tsx`

**Interfaces:**
- Consumes: Brand API, Supabase upload
- Produces: Palette (5 colors + harmony), Fonts (Google Fonts search + preview), Logos (light/dark), Watermark, Export/Import JSON

- [ ] **Step 1: Write failing test for brand page**

```typescript
// tests/brand/page.test.tsx
test('updates palette and persists', async () => {
  render(<BrandPage />);
  await userEvent.click(screen.getByLabelText('Cor primária'));
  await userEvent.type(screen.getByRole('textbox'), '#FF0000');
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(await fetch('/api/brand').then(r => r.json())).toMatchObject({ colors: { primary: '#FF0000' } });
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement ColorPicker with harmony suggestions**

```tsx
// ColorPicker.tsx
// 5 inputs: primary, secondary, accent, background, text
// Each: color input + hex text + harmony button (generates analogous/complementary)
// Preview: shows all 5 together with contrast ratios
// Saves to BrandIdentity.colors
```

- [ ] **Step 4: Implement FontSelector with Google Fonts search**

```tsx
// FontSelector.tsx
// Two selectors: heading, body
// Search input → fetches Google Fonts API → shows preview with current text
// Select → saves font name + URL to BrandIdentity.fonts
// Preview area shows sample heading + body text
```

- [ ] **Step 5: Implement LogoUpload**

```tsx
// LogoUpload.tsx
// Two dropzones: Light background logo, Dark background logo
// Preview shows logo on both light/dark backgrounds
// Upload → Supabase → saves URLs to BrandIdentity
```

- [ ] **Step 6: Implement Export/Import**

```tsx
// BrandExportImport.tsx
// Export: downloads brand-identity.json (colors, fonts, logos, watermark)
// Import: file input → validates JSON → PUT /api/brand
```

- [ ] **Step 7: Run test → PASS**

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: brand identity page with palette, fonts, logos, export/import"
```

---

## Task 9: AI Integration (Text + Image Generation)

**Files:**
- Create: `src/app/api/ai/route.ts`
- Create: `src/lib/ai.ts` (helpers: getTextModel, getImageModel, generateCaption, generateHashtags, generateImage)
- Create: `src/lib/validations/ai.ts`

**Interfaces:**
- Consumes: AIConfig, AIPreset, BrandIdentity, PostType
- Produces: Streaming text generation, structured hashtags, image generation + Supabase upload

- [ ] **Step 1: Write failing test for AI caption generation**

```typescript
// tests/ai/caption.test.ts
import { generateCaption } from '@/lib/ai';
test('generates caption with product and brand', async () => {
  const caption = await generateCaption({ type: 'FEED', product: 'Bolo de cenoura', tone: 'acolhedor', brandIdentity: mockBrand });
  expect(caption).toContain('Bolo de cenoura');
  expect(caption.length).toBeGreaterThan(50);
});
```

- [ ] **Step 2: Run test → FAIL (needs API key)**

- [ ] **Step 3: Implement AI model helpers**

```typescript
// src/lib/ai.ts
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { prisma } from '@/lib/prisma';

async function getConfig() {
  return prisma.aIConfig.findFirstOrThrow({ where: { id: 'global' } });
}

export function getTextModel() {
  const config = await getConfig();
  return config.provider === 'anthropic' ? anthropic(config.modelText) : openai(config.modelText);
}

export function getImageModel() {
  const config = await getConfig();
  return config.provider === 'openai' ? openai.image(config.modelImage) : null; // Anthropic doesn't do images yet
}

export async function generateCaption(input) {
  const preset = input.presetId ? await prisma.aIPreset.findUnique({ where: { id: input.presetId } }) : await prisma.aIPreset.findFirst({ where: { type: 'CAPTION', isDefault: true } });
  const prompt = buildPrompt(preset?.prompt || defaultCaptionPrompt, input);
  const { text } = await generateText({ model: getTextModel(), prompt, temperature: 0.7 });
  return text;
}

export async function generateHashtags(input) { /* similar with generateObject + Zod schema */ }
export async function generateImage(prompt, brand) {
  const { image } = await generateImage({ model: getImageModel(), prompt: enhanceWithBrand(prompt, brand), aspectRatio: getAspectRatio(input.type) });
  // Download image.buffer → upload to Supabase → return Media record
}
```

- [ ] **Step 4: Implement AI API route with streaming**

```typescript
// src/app/api/ai/route.ts
export async function POST(req: Request) {
  const { action, input } = await req.json(); // action: 'caption' | 'hashtags' | 'image'
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      if (action === 'caption') {
        const result = await streamText({ model: getTextModel(), prompt: buildCaptionPrompt(input) });
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
      } else if (action === 'hashtags') {
        const { object } = await generateObject({ model: getTextModel(), schema: hashtagSchema, prompt: buildHashtagPrompt(input) });
        controller.enqueue(encoder.encode(JSON.stringify(object)));
      } else if (action === 'image') {
        const media = await generateImage(input.prompt, await getBrand());
        controller.enqueue(encoder.encode(JSON.stringify(media)));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
```

- [ ] **Step 5: Run test → PASS (with mock API key in test env)**

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: AI integration for caption, hashtags, image generation"
```

---

## Task 10: AI Presets CRUD (Settings)

**Files:**
- Create: `src/app/(dashboard)/settings/ai/page.tsx`
- Create: `src/components/settings/AIPresetList.tsx`, `AIPresetForm.tsx`, `AIConfigForm.tsx`

**Interfaces:**
- Consumes: AIPreset API, AIConfig API
- Produces: Preset CRUD per type, default toggle, config form

- [ ] **Step 1: Write failing test for presets**

```typescript
// tests/settings/ai-presets.test.tsx
test('creates and sets default preset', async () => {
  render(<AISettingsPage />);
  await userEvent.click(screen.getByRole('button', { name: /novo preset/i }));
  await userEvent.type(screen.getByLabelText('Nome'), 'Meu Preset');
  await userEvent.type(screen.getByLabelText('Prompt'), 'Gere legenda para {produto}');
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(screen.getByText('Meu Preset')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement AIPreset API**

```typescript
// src/app/api/ai/presets/route.ts
// GET: all presets grouped by type
// POST: create preset
// src/app/api/ai/presets/[id]/route.ts
// GET/PUT/DELETE single preset
// PUT /api/ai/presets/[id]/default → sets isDefault=true, others false
```

- [ ] **Step 4: Implement AIConfig API**

```typescript
// src/app/api/ai/config/route.ts
// GET/PUT global config (provider, apiKey encrypted, models)
```

- [ ] **Step 5: Implement settings page**

```tsx
// Tabs: Configuração Geral, Presets Legenda, Presets Hashtags, Presets Imagem
// AIConfigForm: provider select, API key (password), model selects
// AIPresetList: cards with name, preview, default badge, actions
// AIPresetForm: modal with name, type (fixed per tab), prompt textarea, variables helper
```

- [ ] **Step 6: Run test → PASS**

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: AI presets CRUD and config in settings"
```

---

## Task 11: Notifications (In-App + Email)

**Files:**
- Create: `src/app/api/notifications/route.ts`
- Create: `src/components/notifications/NotificationBell.tsx`, `NotificationList.tsx`, `NotificationItem.tsx`
- Create: `src/hooks/useNotifications.ts`
- Modify: `src/app/(dashboard)/layout.tsx` (add NotificationBell to header)

**Interfaces:**
- Consumes: Notification API, Socket.io
- Produces: Bell with count, dropdown list, mark read, email sending

- [ ] **Step 1: Write failing test for notifications**

```typescript
// tests/notifications/bell.test.tsx
test('shows unread count and marks read on click', async () => {
  render(<NotificationBell />);
  expect(screen.getByRole('button')).toHaveAttribute('aria-label', /3 não lidas/);
  await userEvent.click(screen.getByRole('button'));
  await userEvent.click(screen.getByRole('button', { name: /marcar todas como lidas/i }));
  expect(screen.getByRole('button')).toHaveAttribute('aria-label', /0 não lidas/);
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement Notification API**

```typescript
// src/app/api/notifications/route.ts
// GET: paginated notifications for current user
// PUT: mark as read (single or all)
```

- [ ] **Step 4: Implement useNotifications hook + Socket.io listener**

```typescript
// src/hooks/useNotifications.ts
export function useNotifications() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications });
  
  useEffect(() => {
    socket.on('notification', (n) => {
      queryClient.setQueryData(['notifications'], (old) => [n, ...(old || [])]);
      if (n.type === 'POST_APPROVED' || n.type === 'POST_PUBLISHED') {
        toast.success(n.title);
      }
    });
    return () => socket.off('notification');
  }, []);
  
  return { notifications: data, unreadCount: data?.filter(n => !n.read).length };
}
```

- [ ] **Step 5: Implement NotificationBell + List**

```tsx
// NotificationBell.tsx
// Button with badge count
// Dropdown: NotificationList (virtualized)
// NotificationItem: title, message, time, action link, mark read button
// Header: "Marcar todas como lidas"
```

- [ ] **Step 6: Trigger notifications on post status changes**

```typescript
// In POST /api/posts/[id] (status transitions)
if (newStatus === 'APPROVED' && oldStatus === 'DRAFT') {
  await createNotification(otherUserId, 'POST_APPROVED', 'Post aprovado', `${user.name} aprovou "${post.title}"`, { postId: post.id });
  await sendEmail(otherUser.email, 'Post aprovado', ...);
}
if (newStatus === 'PUBLISHED' && oldStatus === 'APPROVED') {
  await createNotification(otherUserId, 'POST_PUBLISHED', 'Post publicado', `${user.name} publicou "${post.title}"`, { postId: post.id });
}
```

- [ ] **Step 7: Run test → PASS**

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: in-app and email notifications for post approval/publish"
```

---

## Task 12: Real-time Collaboration (Socket.io)

**Files:**
- Create: `src/app/api/socket/route.ts` (Socket.io server)
- Create: `src/lib/socket.ts` (client + server instances)
- Create: `src/components/realtime/PresenceAvatars.tsx`, `CursorOverlay.tsx`, `ConflictToast.tsx`
- Create: `src/hooks/useRealtime.ts`
- Modify: `src/components/editor/PostEditor.tsx` (integrate presence/cursors)

**Interfaces:**
- Consumes: Socket.io, Post editor state
- Produces: User presence avatars, remote cursors, conflict detection + toast

- [ ] **Step 1: Write failing test for presence**

```typescript
// tests/realtime/presence.test.tsx
test('shows other user avatar when editing same post', () => {
  const { result } = renderHook(() => useRealtime('post-123'));
  act(() => { result.current.join('post-123'); });
  expect(result.current.presence).toHaveLength(1);
  // Simulate other user joining
  act(() => { socket.emit('presence:join', { postId: 'post-123', user: otherUser }); });
  expect(result.current.presence).toHaveLength(2);
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement Socket.io server**

```typescript
// src/app/api/socket/route.ts
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, { cors: { origin: process.env.NEXTAUTH_URL } });

io.on('connection', (socket) => {
  socket.on('join', ({ postId, user }) => {
    socket.join(`post:${postId}`);
    socket.to(`post:${postId}`).emit('presence:join', { postId, user });
  });
  socket.on('cursor', ({ postId, user, position }) => {
    socket.to(`post:${postId}`).emit('cursor:move', { postId, user, position });
  });
  socket.on('content:change', ({ postId, user, field, value }) => {
    socket.to(`post:${postId}`).emit('content:change', { postId, user, field, value });
  });
  socket.on('leave', ({ postId }) => {
    socket.leave(`post:${postId}`);
    socket.to(`post:${postId}`).emit('presence:leave', { postId, userId: socket.data.userId });
  });
});

export { io, httpServer };
```

- [ ] **Step 4: Implement client socket + useRealtime hook**

```typescript
// src/lib/socket.ts (client)
import { io } from 'socket.io-client';
export const socket = io({ autoConnect: false });

// src/hooks/useRealtime.ts
export function useRealtime(postId) {
  const [presence, setPresence] = useState<User[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  
  useEffect(() => {
    socket.connect();
    socket.emit('join', { postId, user: currentUser });
    socket.on('presence:join', (data) => setPresence(p => [...p.filter(u => u.id !== data.user.id), data.user]));
    socket.on('presence:leave', (data) => setPresence(p => p.filter(u => u.id !== data.userId)));
    socket.on('cursor:move', (data) => setCursors(c => ({ ...c, [data.user.id]: data.position })));
    socket.on('content:change', (data) => { /* show conflict toast if same field */ });
    return () => { socket.emit('leave', { postId }); socket.off('presence:join'); /* ... */ };
  }, [postId]);
  
  return { presence, cursors, sendCursor, sendContentChange };
}
```

- [ ] **Step 5: Implement PresenceAvatars + CursorOverlay**

```tsx
// PresenceAvatars.tsx
// Stack of avatars with name tooltip, max 3 + "+N"
// Online indicator (green dot)

// CursorOverlay.tsx
// Absolute positioned cursors with user color + name label
// Only shows when user is actively typing/selecting
```

- [ ] **Step 6: Integrate into PostEditor**

```tsx
// PostEditor.tsx
const { presence, cursors, sendCursor, sendContentChange } = useRealtime(post.id);
// On caption change → debounced sendContentChange('caption', value)
// On media reorder → sendContentChange('media', newOrder)
// On template apply → sendContentChange('template', templateId)
// Render <PresenceAvatars users={presence} /> in header
// Render <CursorOverlay cursors={cursors} /> over editor areas
```

- [ ] **Step 7: Run test → PASS**

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: real-time collaboration with presence, cursors, conflict detection"
```

---

## Task 13: Rate Limiting & Security Hardening

**Files:**
- Create: `src/lib/ratelimit.ts` (Upstash Redis)
- Modify: `src/app/api/ai/route.ts`, `src/app/api/media/route.ts`
- Create: `src/middleware.ts` (add rate limit headers)

**Interfaces:**
- Consumes: Upstash Redis, request IP/user
- Produces: 20 req/min limit on AI, upload validation, security headers

- [ ] **Step 1: Write failing test for rate limit**

```typescript
// tests/security/rate-limit.test.ts
test('returns 429 after 20 requests', async () => {
  for (let i = 0; i < 21; i++) {
    const res = await fetch('/api/ai', { method: 'POST', body: JSON.stringify({ action: 'caption', input: {} }) });
    if (i === 20) expect(res.status).toBe(429);
  }
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement Upstash rate limiter**

```typescript
// src/lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
export const aiRateLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'ratelimit:ai' });
export const uploadRateLimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(50, '1 m'), prefix: 'ratelimit:upload' });
```

- [ ] **Step 4: Apply to AI and upload routes**

```typescript
// src/app/api/ai/route.ts
const { success, limit, remaining, reset } = await aiRateLimit.limit(userId);
if (!success) return new Response('Rate limit exceeded', { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } });
```

- [ ] **Step 5: Add magic bytes validation to upload**

```typescript
// src/app/api/media/route.ts
import { fileTypeFromBuffer } from 'file-type';

const buffer = await file.arrayBuffer();
const type = await fileTypeFromBuffer(Buffer.from(buffer));
const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
if (!type || !allowed.includes(type.mime)) return Response.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 });
```

- [ ] **Step 6: Add security headers in next.config.js**

```javascript
// next.config.js
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }];
}
```

- [ ] **Step 7: Run test → PASS**

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: rate limiting, magic bytes validation, security headers"
```

---

## Task 14: PWA Configuration & Offline Read-Only

**Files:**
- Modify: `next.config.js` (withPWA config)
- Create: `public/manifest.json`, `public/sw.js` (or use next-pwa defaults)
- Create: `src/components/ui/OfflineBanner.tsx`

**Interfaces:**
- Consumes: next-pwa, service worker
- Produces: Installable PWA, offline calendar read-only

- [ ] **Step 1: Configure next-pwa**

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    { urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i, handler: 'CacheFirst', options: { cacheName: 'supabase-images', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
    { urlPattern: /\/api\/posts/, handler: 'NetworkFirst', options: { cacheName: 'posts-api', networkTimeoutSeconds: 5 } },
  ],
});
module.exports = withPWA(nextConfig);
```

- [ ] **Step 2: Create manifest.json**

```json
// public/manifest.json
{
  "name": "Confeitaria Content Manager",
  "short_name": "Confeitaria",
  "description": "Gerenciador de conteúdo para redes sociais",
  "start_url": "/calendar",
  "display": "standalone",
  "background_color": "#FFF8F0",
  "theme_color": "#E85D75",
  "icons": [{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" }, { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }]
}
```

- [ ] **Step 3: Implement OfflineBanner**

```tsx
// OfflineBanner.tsx
'use client';
useEffect(() => {
  const handleOnline = () => setOffline(false);
  const handleOffline = () => setOffline(true);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
}, []);
if (offline) return <Banner className="fixed bottom-0 left-0 right-0 bg-amber-600 text-white p-2 text-center">Modo offline: apenas visualização</Banner>;
return null;
```

- [ ] **Step 4: Add to dashboard layout**

```tsx
// layout.tsx
<OfflineBanner />
```

- [ ] **Step 5: Test PWA install + offline**

```bash
npm run build && npm run start
# Open in Chrome → Install → Disconnect network → Verify calendar loads read-only
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: PWA with offline read-only calendar"
```

---

## Task 15: Auto-Cleanup Job (30 Days Archived)

**Files:**
- Create: `src/app/api/cron/cleanup/route.ts`
- Create: `package.json` script or Vercel Cron config

**Interfaces:**
- Consumes: Prisma, Supabase
- Produces: Hard deletes posts with status=ARCHIVED older than 30 days + associated media

- [ ] **Step 1: Implement cleanup API**

```typescript
// src/app/api/cron/cleanup/route.ts
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 });
  
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const posts = await prisma.post.findMany({ where: { status: 'ARCHIVED', updatedAt: { lt: cutoff } }, include: { media: true } });
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  for (const post of posts) {
    for (const media of post.media) {
      await supabase.storage.from('media').remove([media.url.split('/').pop()]);
    }
    await prisma.post.delete({ where: { id: post.id } }); // cascade deletes media
  }
  
  return Response.json({ deleted: posts.length });
}
```

- [ ] **Step 2: Configure Vercel Cron**

```json
// vercel.json
{
  "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }]
}
```

- [ ] **Step 3: Test manually**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://seu-app.vercel.app/api/cron/cleanup
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: auto-cleanup job for archived posts older than 30 days"
```

---

## Task 16: Account Settings Page

**Files:**
- Create: `src/app/(dashboard)/settings/account/page.tsx`
- Create: `src/components/settings/AccountForm.tsx`, `PasswordForm.tsx`, `NotificationToggle.tsx`

**Interfaces:**
- Consumes: User API, Notification preferences
- Produces: Name/email/password update, email notification toggle

- [ ] **Step 1: Write failing test**

```typescript
// tests/settings/account.test.tsx
test('updates name and email', async () => {
  render(<AccountPage />);
  await userEvent.clear(screen.getByLabelText('Nome'));
  await userEvent.type(screen.getByLabelText('Nome'), 'Novo Nome');
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(await fetch('/api/user').then(r => r.json())).toMatchObject({ name: 'Novo Nome' });
});
```

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implement User API**

```typescript
// src/app/api/user/route.ts
// GET: current user
// PUT: update name, email (unique check), password (bcrypt)
```

- [ ] **Step 4: Implement account page**

```tsx
// Sections: Perfil (nome, email), Senha (atual, nova, confirma), Notificações (toggle email)
```

- [ ] **Step 5: Run test → PASS**

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: account settings with profile, password, notifications"
```

---

## Task 17: Polish, Testing & Deploy

**Files:**
- Modify: various (bug fixes, UX polish)
- Create: `vercel.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: all previous tasks
- Produces: Production-ready build, CI pipeline, deployed on Vercel

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --coverage
# Target: >80% coverage on critical paths (auth, posts, media, AI)
```

- [ ] **Step 2: Manual QA checklist**

```
[ ] Login/register flow
[ ] Calendar: month/week/list views, filters, drag-drop
[ ] Create post: all types, media upload, caption, AI buttons
[ ] Template: apply overwrites, builder creates valid config
[ ] Brand: palette, fonts, logos, export/import
[ ] AI: caption, hashtags, image (with mock keys)
[ ] Presets: CRUD, default toggle
[ ] Notifications: bell, list, email on approve/publish
[ ] Realtime: presence, cursors, conflict toast
[ ] Gallery: upload, lazy load, filters, multi-select
[ ] Mobile: calendar list, bottom sheet editor
[ ] PWA: install, offline read-only
[ ] Settings: AI config, presets, account
```

- [ ] **Step 3: Configure Vercel deploy**

```bash
# 1. Push to GitHub
# 2. Vercel: Import project
# 3. Add all env vars from .env.example
# 4. Deploy
# 5. Verify Turso connection, Supabase bucket, Upstash Redis
```

- [ ] **Step 4: Configure custom domain (optional)**

```bash
# Vercel: Domains → Add → DNS config
```

- [ ] **Step 5: Commit final**

```bash
git add .
git commit -m "chore: polish, CI, production deploy ready"
```

---

## Execution Handoff

**Plan complete and saved to** `docs/superpowers/plans/2026-11-06-confeitaria-content-manager-implementation.md`.

**Recommended execution approach: Subagent-driven** — because:
- 17 tasks with complex interdependencies (Socket.io, AI streaming, real-time, PWA)
- Each task has clear interfaces and testable deliverables
- Independent review per task catches integration issues early
- High cost of shipped mistakes (data loss, security, real-time bugs)

**Please review the plan. Does it capture what you want, and shall we proceed with Subagent-driven execution?**