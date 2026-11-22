# Confeitaria Content Manager - Design Document

**Data:** 2026-11-06
**Status:** Aprovado para implementação

---

## 1. Intenção e Porquê

Criar uma ferramenta própria para gerenciar todo o conteúdo de redes sociais da confeitaria, substituindo o fluxo atual fragmentado (IAs externas + pastas locais + postagem manual) por uma plataforma centralizada onde ambos os sócios (marido e esposa) possam:

- **Criar** posts com apoio de IA integrada (textos + imagens)
- **Organizar** num calendário visual com drag-and-drop
- **Aprovar** colaborativamente antes de publicar
- **Publicar** manualmente agora, com base para agendamento automático no futuro
- **Manter** a identidade visual consistente (paleta, fontes, logos, templates)

---

## 2. Objetivos (Goals)

| Objetivo | Critério de Sucesso |
|---|---|
| Calendário visual funcional | Ver mês/semana, arrastar posts entre dias, filtrar por tipo |
| Criação assistida por IA | Botões "Gerar legenda", "Hashtags", "Criar imagem" funcionando |
| Upload de mídia local | Imagens/vídeos salvos na ferramenta, preview no card |
| Identidade visual centralizada | Paleta, fontes, logos, templates acessíveis no editor |
| Fluxo colaborativo simples | Ambos veem tudo, ambos podem editar/aprovar/publicar |
| Base para agendamento futuro | Estrutura de dados pronta para `scheduled_at` + worker |

---

## 3. Não-Objetivos (Non-Goals)

- Publicação automática via API do Instagram/WhatsApp (MVP = manual)
- Roles/permissões complexas (admin, editor, viewer)
- Analytics/métricas de engajamento
- Multi-empresa/equipe
- App mobile nativo (PWA responsivo basta)
- Versionamento/histórico de edições de posts

---

## 4. Anti-Objetivos (Anti-Goals)

- Ficar dependente de API externa instável no MVP
- Interface confusa que exija treinamento
- Dados presos num formato proprietário (export JSON/CSV sempre possível)
- Build/deploy complexo (deve rodar com `npm run dev` e deployar na Vercel em 1 clique)

---

## 5. Usuários e Fluxos Principais

### Personas
- **Você** (técnico, configura IA, gerencia deploy, cria posts)
- **Esposa** (confeiteira, foco visual/produto, cria/posts, aprova)

### Fluxo Principal: Criar → Agendar → Aprovar → Publicar

```
[Calendário] → Clique no dia → [Modal Novo Post]
    ↓
[Editor] → Tipo: Feed/Stories/Reels/WhatsApp
    ↓
[IA] → "Gerar legenda" / "Hashtags" / "Criar imagem"
    ↓
[Mídia] → Upload arrastar-soltar / Selecionar da galeria
    ↓
[Identidade] → Aplicar template / Paleta / Fonte / Logo
    ↓
[Salvar] → Post aparece no calendário com status "Rascunho"
    ↓
[Aprovar] → Botão "Aprovar" → Status "Aprovado"
    ↓
[Publicar] → Botão "Publicar" → Copia legenda + abre app / Status "Publicado"
```

---

## 6. Modelo de Dados (Prisma Schema)

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  password      String   // hash (bcrypt) - obrigatório
  role          Role     @default(OWNER) // OWNER apenas por enquanto
  emailNotifications Boolean @default(true) // notificações por email
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  posts         Post[]
  notifications Notification[]
}

enum PostType {
  FEED
  STORIES
  REELS
  WHATSAPP_STATUS    // Imagem/vídeo 24h (como Stories)
  WHATSAPP_CATALOG   // Produto com preço/descrição (sincroniza com WhatsApp Business API)
  // WHATSAPP_BROADCAST removido do MVP
}

enum PostStatus {
  DRAFT
  APPROVED
  PUBLISHED
  ARCHIVED
}

model Post {
  id            String     @id @default(cuid())
  title         String?    // opcional, para identificação interna
  type          PostType
  status        PostStatus @default(DRAFT)
  caption       String?    @db.Text
  hashtags      String[]   @default([])
  scheduledAt   DateTime?  // para futuro agendamento
  publishedAt   DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  authorId      String
  author        User       @relation(fields: [authorId], references: [id])
  media         Media[]
  templateId    String?
  template      Template?  @relation(fields: [templateId], references: [id])
}

model Media {
  id        String   @id @default(cuid())
  type      MediaType // IMAGE, VIDEO
  url       String   // caminho local / supabase
  thumbnail String?  // para vídeo
  order     Int      @default(0) // ordem no carrossel
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

enum MediaType {
  IMAGE
  VIDEO
}

model Template {
  id          String   @id @default(cuid())
  name        String
  type        PostType
  description String?
  // JSON com configuração visual: cores, fontes, posições, placeholders
  config      Json
  thumbnail   String?  // preview do template
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  posts       Post[]
}

model BrandIdentity {
  id          String   @id @default(cuid())
  // Paleta de cores (hex)
  colors      Json     // { primary: "#...", secondary: "#...", accent: "#...", background: "#...", text: "#..." }
  // Fontes (nome + url Google Fonts ou upload)
  fonts       Json     // { heading: "Font Name", body: "Font Name", headingUrl: "...", bodyUrl: "..." }
  // Logos
  logoLight   String?  // url
  logoDark    String?  // url
  // Watermark padrão
  watermark   String?  // url
  updatedAt   DateTime @updatedAt

  @@unique([]) // Singleton: apenas uma marca para todo o negócio
}

// Configuração de IA (global - apenas um registro)
model AIConfig {
  id           String @id @default(cuid())
  provider     String  // "openai" | "anthropic"
  apiKey       String  // criptografado
  modelText    String  // "gpt-4o" | "claude-3-5-sonnet"
  modelImage   String  // "dall-e-3" | "gpt-image-1"
  promptDefaults Json  // prompts padrão para legenda, hashtags, imagem
  updatedAt    DateTime @updatedAt
}

// Presets de prompt de IA (CRUD nas configurações)
model AIPreset {
  id          String   @id @default(cuid())
  name        String   // ex: "Legenda Natal", "Hashtags Reels", "Imagem Produto"
  type        PresetType // CAPTION, HASHTAGS, IMAGE
  prompt      String   @db.Text
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum PresetType {
  CAPTION
  HASHTAGS
  IMAGE
}

// Notificações in-app + email
model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  message   String
  data      Json?            // { postId, actionUrl, etc }
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())
}

enum NotificationType {
  POST_APPROVED
  POST_PUBLISHED
  POST_COMMENT
  MENTION
  SYSTEM
}
```

---

## 7. Arquitetura Técnica

### Stack
| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Next.js 14 (App Router) | React server components, routing, API routes, deploy Vercel |
| Linguagem | TypeScript | Tipagem segura no modelo de dados |
| Estilo | Tailwind CSS | Velocidade, design system nativo, dark mode |
| Banco | **Turso (libSQL) + Prisma** | SQLite compatível serverless, zero config, roda local/Vercel |
| Auth | NextAuth.js (credentials) | Simples, 2 usuários, magic link opcional |
| IA | Vercel AI SDK + OpenAI/Anthropic | Streaming, tipado, fácil trocar provider |
| Upload | **Supabase Storage** | Persistente no Vercel, gratuito, CDN global |
| Validação | Zod | Schemas compartilhados client/server |
| Estado | React Query (TanStack Query) | Cache, mutações, invalidação automática |
| Calendário | `@dnd-kit` + custom grid | Drag-and-drop acessível, leve |
| Real-time | **Socket.io** | Colaboração simultânea, presença, cursores |
| Rate Limit | **Upstash Redis** (ou in-memory) | 20 req/min em `/api/ai/*` |

### Estrutura de Pastas (App Router)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + header + notification bell
│   │   ├── calendar/page.tsx       # Calendário principal
│   │   ├── posts/
│   │   │   ├── [id]/page.tsx       # Editor de post
│   │   │   └── new/page.tsx        # Novo post
│   │   ├── gallery/page.tsx        # Galeria de mídia
│   │   ├── templates/page.tsx      # Templates visuais
│   │   ├── brand/page.tsx          # Identidade visual
│   │   └── settings/
│   │       ├── ai/page.tsx         # Config IA + presets
│   │       └── account/page.tsx    # Conta + notificações
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── posts/route.ts          # CRUD posts
│   │   ├── posts/[id]/route.ts
│   │   ├── media/route.ts          # Upload (Supabase)
│   │   ├── templates/route.ts
│   │   ├── brand/route.ts
│   │   ├── ai/route.ts             # Geração de texto/imagem
│   │   ├── notifications/route.ts  # CRUD notificações
│   │   └── socket/route.ts         # Socket.io server
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    # Redirect → /calendar
├── components/
│   ├── ui/                         # Shadcn-style primitives
│   ├── calendar/                   # CalendarGrid, DayCell, PostCard
│   ├── editor/                     # PostEditor, MediaUploader, AIPanel
│   ├── brand/                      # ColorPicker, FontSelector, LogoUpload
│   ├── templates/                  # TemplateCard, TemplateBuilder
│   ├── notifications/              # NotificationBell, NotificationList
│   └── realtime/                   # PresenceAvatars, CursorOverlay
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── ai.ts                       # Vercel AI SDK helpers
│   ├── upload.ts                   # Supabase Storage handling
│   ├── socket.ts                   # Socket.io client/server
│   ├── notifications.ts            # Notification helpers
│   ├── utils.ts
│   └── validations/                # Zod schemas
├── hooks/
│   ├── usePosts.ts
│   ├── useMedia.ts
│   ├── useCalendar.ts
│   ├── useNotifications.ts
│   └── useRealtime.ts
└── types/
    └── index.ts
```

---

## 8. Telas e Componentes Principais

### 8.1 Calendário (`/calendar`)
- **View**: Mês (default) / Semana / Lista
- **Filtros**: Tipo de post, Status, Autor
- **Drag-and-drop**: Mover post entre dias (atualiza `scheduledAt`)
- **Clique no dia vazio** → Novo post rápido
- **Clique no post** → Abre editor em modal ou navega para `/posts/[id]`
- **Posts agendados**: Badge "Agendado" + cor/ícone distinto (amarelo/relógio)
- **Mobile**: Lista agrupada por dia + bottom sheet para editor

### 8.2 Editor de Post (`/posts/[id]` ou Modal)
- **Header**: Tipo (tabs: Feed/Stories/Reels/WhatsApp Status/WhatsApp Catálogo), Status badge, Autor
- **Painel Esquerdo (70%)**:
  - Área de mídia: Grid de upload + preview + reorder (drag handles para carrossel, máx 10 imagens)
  - Legenda: Textarea com toolbar (negrito, emoji, @menção, #hashtag)
  - Botões IA: ✨ Gerar legenda | 🏷️ Hashtags | 🎨 Criar imagem (style reference)
- **Painel Direito (30%)**:
  - Templates salvos (cards clicáveis **sobrescrevem tudo**: mídia, legenda, layout)
  - Identidade visual: Paleta, Fontes, Logo (quick apply)
  - Config: Agendamento, Primeira legenda como comentário
  - **Validação vídeo**: Aspect ratio/duração por tipo (Reels 9:16 ≤90s, Stories 9:16 ≤15s, Feed 4:5/1:1 ≤60s)
- **Footer**: Salvar rascunho | Aprovar | Publicar (abre no navegador) | Excluir (soft delete + auto-limpeza 30d)
- **Colaboração real-time**: WebSocket para edição simultânea (presença, cursores, conflitos)

### 8.3 Galeria de Mídia (`/gallery`)
- Grid responsivo com lazy load
- Filtro: Tipo (imagem/vídeo), Por post, Por data
- Seleção múltipla para inserir no editor
- Upload direto (drag-and-drop)

### 8.4 Templates (`/templates`)
- Lista de templates por tipo de post
- **Criar template**: Editor visual simplificado (canvas-like) → salva JSON config
- Aplicar template: Preenche posições, cores, fontes no post atual

### 8.5 Identidade Visual (`/brand`)
- **Paleta**: 5 cores (primary, secondary, accent, background, text) com color picker + harmonia automática
- **Fontes**: 2 seletores (heading, body) com preview + Google Fonts search
- **Logos**: Upload light/dark + preview em fundos claros/escuros
- **Watermark**: Upload + opacidade/posição padrão
- **Exportar/Importar**: JSON para backup

### 8.6 Configurações IA (`/settings/ai`)

### 8.7 Configurações Gerais (`/settings`)
- **Conta**: Nome, email, senha
- **Notificações**: Toggle email (in-app sempre ativo)
- **IA**: (conforme seção 8.6)
- Provider: OpenAI / Anthropic
- API Key (input password, salvo criptografado)
- Modelos: Texto / Imagem
- **Presets de Prompt** (CRUD completo):
  - Lista de presets por tipo: Legenda / Hashtags / Imagem
  - Criar/Editar/Excluir/Definir como padrão
  - Variáveis disponíveis: `{produto}`, `{ocasião}`, `{tom}`, `{cta}`, `{marca}`
- Prompts padrão editáveis (fallback se não houver preset):
  - Legenda: "Você é um social media de confeitaria artesanal. Tom: acolhedor, apetitoso, brasileiro. Inclua CTA."
  - Hashtags: "Gere 15 hashtags relevantes para confeitaria no Brasil, misture populares e nicho."
  - Imagem: "Foto profissional de {produto}, iluminação natural, fundo limpo, estilo lifestyle, alta resolução."

---

## 9. Integração IA (Detalhamento)

### Vercel AI SDK - `lib/ai.ts`
```typescript
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject, streamText } from 'ai';

// Helpers que leem AIConfig e retornam modelo apropriado
export function getTextModel() { /* ... */ }
export function getImageModel() { /* ... */ }

export async function generateCaption(input: {
  type: PostType;
  product?: string;
  occasion?: string;
  tone: string;
  cta?: string;
  brandIdentity: BrandIdentity;
  presetId?: string; // opcional: usa preset específico
}) {
  const prompt = buildCaptionPrompt(input);
  const { text } = await generateText({
    model: getTextModel(),
    prompt,
    temperature: 0.7,
  });
  return text;
}

export async function generateHashtags(input: {
  caption: string;
  type: PostType;
  location: string; // "Brasil"
  niche: string;    // "confeitaria artesanal"
  presetId?: string;
}) {
  const { object } = await generateObject({
    model: getTextModel(),
    schema: z.object({ hashtags: z.array(z.string()).min(10).max(20) }),
    prompt: buildHashtagPrompt(input),
  });
  return object.hashtags;
}

export async function generateImage(prompt: string, brandIdentity: BrandIdentity) {
  // Style reference apenas - não garante cores exatas da marca
  const enhancedPrompt = enhanceWithBrand(prompt, brandIdentity);
  const { image } = await generateImage({
    model: getImageModel(),
    prompt: enhancedPrompt,
    aspectRatio: getAspectRatio(postType),
  });
  return image; // URL temporária → baixar e salvar no Supabase Storage
}
```

---

## 10. Autenticação e Segurança

- **NextAuth.js** com provider `credentials`
- **Senha**: bcrypt (12 rounds)
- **Sessão**: JWT (stateless, 30 dias)
- **Middleware**: Protege rotas `(dashboard)/**` e `api/**`
- **API Key IA**: Criptografada com `crypto` nativo (AES-256-GCM) + `ENCRYPTION_KEY` no `.env`
- **Upload**: Validação de tipo (MIME), tamanho máx (10MB img, 50MB vídeo), sanitização de nome

---

## 11. Responsividade e PWA

- **Breakpoints**: Mobile (< 640px), Tablet (640-1024), Desktop (> 1024)
- **Calendário mobile**: Lista agrupada por dia + bottom sheet para editor
- **PWA**: `next-pwa` → manifest + service worker → "Adicionar à tela inicial"
- **Offline MVP**: **Read-only apenas** (cache de assets + calendário). Mutações requerem online.

---

## 12. Deploy e Variáveis de Ambiente

### `.env.example`
```env
# Database (Turso/libSQL)
DATABASE_URL="libsql://seu-db.turso.io"
DATABASE_AUTH_TOKEN="seu-auth-token"

# Auth
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Encryption (32 bytes base64)
ENCRYPTION_KEY="..."

# AI - OpenAI
OPENAI_API_KEY="sk-..."

# AI - Anthropic (alternativo)
ANTHROPIC_API_KEY="sk-ant-..."

# Supabase Storage
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_SERVICE_KEY="service-role-key"
SUPABASE_BUCKET="media"

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Socket.io (opcional: para produção com múltiplas instâncias)
# REDIS_URL="redis://..."
```

### Deploy Vercel
1. Push para GitHub
2. Import na Vercel
3. Adicionar env vars
4. Deploy automático

---

## 13. Roadmap Pós-MVP

| Fase | Funcionalidade |
|---|---|
| **v1.1** | Agendamento automático (cron job + Instagram Graph API / WhatsApp Cloud API) |
| **v1.2** | Analytics básicas (views, likes, comentários via webhook) |
| **v1.3** | Catálogo de produtos sincronizado com WhatsApp Business |
| **v1.4** | Colaboração: comentários em posts, @menções, notificações |
| **v1.5** | Multi-loja/equipe, roles, white-label |

---

## 14. Decisões do Arquiteto (Builder Calls)

| Decisão | Justificativa |
|---|---|
| Next.js App Router (não Pages) | Futuro-proof, RSC, streaming, melhor DX |
| **Turso (libSQL) + Prisma** (não SQLite file) | SQLite compatível com serverless/Vercel, zero config |
| NextAuth credentials (não OAuth) | 2 usuários conhecidos, sem dependência externa |
| **Supabase Storage desde dia 1** (não local) | Persistente no Vercel, gratuito, migração trivial |
| Vercel AI SDK (não chamadas diretas) | Streaming, tipado, troca de provider trivial |
| `@dnd-kit` (não react-beautiful-dnd) | Acessível, mantido, TypeScript nativo |
| Tailwind (não CSS Modules/Styled) | Design system rápido, dark mode nativo, bundle pequeno |
| **WebSocket (Socket.io) para colaboração real-time** | Edição simultânea, presença, cursores, conflitos |
| **Rate limiting 20 req/min** em `/api/ai/*` | Controle de custo, Upstash Redis ou in-memory |
| **Validação magic bytes** (`file-type` package) | Segurança upload além de MIME |
| **Soft delete + auto-limpeza 30d** | Recuperação acidental, limpeza automática |

---

## 15. Próximos Passos

1. **Aprovação deste design** ✅ (este documento)
2. **Plano de implementação** (`superpowers:writing-plans`) com tarefas sequenciais
3. **Setup do projeto** (Next.js, Prisma, Tailwind, NextAuth)
4. **Implementação por fases** (ver plano)
5. **Testes manuais** com dados reais da confeitaria
6. **Deploy na Vercel** + configuração de domínio próprio