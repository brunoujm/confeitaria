# AUDITORIA COMPLETA - CONFEITARIA CONTENT MANAGER

---

## 1. RESUMO GERAL DO PROJETO

**Projeto**: Confeitaria Content Manager - Sistema de gerenciamento de conteúdo para redes sociais voltado a confeitarias brasileiras.

**Stack Principal**:
- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript (strict mode)
- **Estilização**: Tailwind CSS (darkMode: 'class') + Radix UI primitives
- **Banco de Dados**: Prisma ORM com SQLite (dev) / Turso libSQL (produção)
- **Autenticação**: NextAuth.js v5 beta (credentials provider, bcrypt 12 rounds, JWT 30 dias)
- **IA**: Vercel AI SDK (OpenAI gpt-4o/dall-e-3, Anthropic claude-3-5-sonnet)
- **Storage**: Supabase Storage (bucket "media") com validação magic bytes
- **Tempo Real**: Socket.io (presença, cursores remotos, detecção de conflitos)
- **Rate Limiting**: Upstash Redis (fail-closed em produção, fail-open em dev)
- **Estado**: TanStack Query v5 (React Query)
- **Drag-and-Drop**: @dnd-kit
- **Validação**: Zod schemas
- **PWA**: next-pwa (offline read-only calendar)
- **Testes**: Jest + React Testing Library + jsdom (31 testes)
- **Internacionalização**: next-intl (pt-BR, en)

**Status Atual**: Projeto em desenvolvimento ativo com 14 funcionalidades principais implementadas (conforme CLAUDE.md). Melhorias de segurança recentes aplicadas (2026-11-22).

---

## 2. ESTRUTURA ANALISADA

### Arquivos de Configuração
| Arquivo | Status | Observações |
|---------|--------|-------------|
| `package.json` | ✅ Lido | Dependências completas, versões fixas |
| `tsconfig.json` | ✅ Lido | Strict mode habilitado, path aliases @/* |
| `next.config.js` | ✅ Lido | PWA, Sentry, headers de segurança, transpilePackages |
| `prisma/schema.prisma` | ✅ Lido | Schema completo com 8 models, enums como strings |
| `vercel.json` | ✅ Lido | Cron job, security headers, socket.io rewrites |
| `.env.example` | ✅ Lido | Todas as variáveis documentadas |
| `middleware.ts` | ✅ Lido | next-intl + security headers (CSP, X-Frame-Options, etc.) |
| `postcss.config.js` | ✅ Lido | Tailwind + autoprefixer |

### Bibliotecas Core (`src/lib/`)
| Arquivo | Status | Observações |
|---------|--------|-------------|
| `auth.ts` | ✅ Lido | NextAuth config, JWT callbacks, authorized callback |
| `prisma.ts` | ✅ Lido | Singleton com logging em dev |
| `ratelimit.ts` | ✅ Lido | Upstash Redis, fail-closed em produção |
| `env.ts` | ✅ Lido | Validação Zod abrangente com warnings dev/prod |
| `brand.ts` | ✅ Lido | parseBrand/serializeBrand para JSON fields |
| `video-validation.ts` | ✅ Lido | Validação específica por plataforma (REELS, STORIES, FEED, WHATSAPP) |
| `video-metadata.ts` | ✅ Lido | ffprobe integration para metadados server-side |
| `validations/post.ts` | ✅ Lido | Zod schemas para create/update posts, filtros, tipos |
| `validations/media.ts` | ✅ Lido | Schemas para upload de mídia |
| `validations/template.ts` | ✅ Lido | Schemas para templates |
| `validations/brand.ts` | ✅ Lido | Schemas para brand identity |
| `validations/ai.ts` | ✅ Lido | Schemas para configurações IA |
| `ai.ts` | ✅ Lido | Vercel AI SDK helpers |
| `upload.ts` | ✅ Lido | Supabase Storage handling |
| `socket.ts` | ✅ Lido | Socket.io client |
| `notifications.ts` | ✅ Lido | Notification helpers |
| `utils.ts` | ✅ Lido | cn() helper, formatters |

### API Routes (`src/app/api/`)
| Rota | Status | Observações |
|------|--------|-------------|
| `ai/route.ts` | ✅ Lido | Geração caption/hashtags/image, sanitização input, rate limiting, Zod |
| `posts/route.ts` | ✅ Lido | GET/POST com ownership checks, rate limiting |
| `posts/[id]/route.ts` | ✅ Lido | GET/PATCH/DELETE com ownership, validação transição status |
| `templates/route.ts` | ✅ Lido | CRUD com controle acesso público/privado |
| `templates/[id]/route.ts` | ✅ Lido | CRUD individual |
| `brand/route.ts` | ✅ Lido | Singleton brand identity com default management |
| `brand/[id]/route.ts` | ✅ Lido | Operações individuais |
| `notifications/route.ts` | ✅ Lido | CRUD notificações com contadores unread |
| `notifications/[id]/read/route.ts` | ✅ Lido | Marcar como lida |
| `media/route.ts` | ✅ Lido | Upload com magic bytes + ffprobe, DELETE com ownership |
| `auth/register/route.ts` | ✅ Lido | Registro com bcrypt hashing |
| `cron/cleanup/route.ts` | ✅ Lido | Transação atômica + deleção Supabase media |
| `socket/route.ts` | ✅ Lido | Socket.io server com Redis adapter support |
| `auth/[...nextauth]/route.ts` | ✅ Lido | NextAuth routes |

### Componentes Principais (`src/components/`)
| Componente | Status | Observações |
|------------|--------|-------------|
| `editor/PostEditor.tsx` | ✅ Lido | Editor completo com abas, real-time, tabs (content/media/AI/settings) |
| `calendar/CalendarGrid.tsx` | ✅ Lido | Month/week/list views com @dnd-kit drag-and-drop |
| `editor/MediaUploader.tsx` | ✅ Lido | Drag-drop upload com progress, preview, validação client-side |
| `editor/AIPanel.tsx` | ✅ Lido | Painel 3 abas (caption/hashtags/image) com streaming |
| `realtime/CursorOverlay.tsx` | ✅ Lido | Renderização cursores remotos com cores usuários |
| `ui/Toast.tsx` | ✅ Lido | Sistema toast com provider context |
| `ui/DropdownMenu.tsx` | ✅ Lido | Menu dropdown acessível com navegação teclado |
| `ui/*` (Button, Input, Select, Dialog, Card, etc.) | ✅ Lido | Primitivas Radix-based |

### Hooks (`src/hooks/`)
| Hook | Status | Observações |
|------|--------|-------------|
| `usePosts.ts` | ✅ Lido | TanStack Query hooks CRUD posts com invalidação correta |
| `useRealtime.ts` | ✅ Lido | Socket.io connection management, presença, cursores, conflitos |
| `useMedia.ts` | ✅ Lido | Media management hooks |
| `useCalendar.ts` | ✅ Lido | Calendar state management |
| `useNotifications.ts` | ✅ Lido | Notifications hooks |

### Testes (`tests/`)
| Arquivo | Status | Testes |
|---------|--------|--------|
| `auth/login.test.tsx` | ✅ Lido | 6 testes - validação login + NextAuth |
| `auth/register.test.tsx` | ✅ Lido | 7 testes - validação registro + API |
| `security/video-validation.test.ts` | ✅ Lido | 18 testes - validação server-side vídeo por plataforma |

---

## 3. PROBLEMAS ENCONTRADOS

### 3.1 CRÍTICOS (Severidade: ALTA)

| # | Arquivo | Linha | Problema | Consequência | Evidência |
|---|---------|-------|----------|--------------|-----------|
| 1 | `src/app/api/media/route.ts` | 184-210 | **Race condition**: Buffer lido uma vez para magic bytes, depois novamente para ffprobe/upload. Arquivo grande pode causar memory pressure | OOM em uploads grandes simultâneos; validação ffprobe falha silenciosamente se buffer consumido | `const arrayBuffer = await file.arrayBuffer(); const buffer = Buffer.from(arrayBuffer);` - buffer único usado para tudo |
| 2 | `src/lib/prisma.ts` | 1-15 | **Memory leak potencial**: Singleton PrismaClient sem `$disconnect` em desenvolvimento com hot reload | Conexões não fechadas acumulam em dev; exaustão pool conexões | `globalForPrisma.prisma = new PrismaClient({ log: [...] })` - sem cleanup |
| 3 | `src/app/api/cron/cleanup/route.ts` | 45-65 | **Race condition no cron**: Verifica posts arquivados, depois deleta mídia Supabase, depois deleta posts - janela onde novo arquivo pode ser associado | Órfãos no storage Supabase; posts deletados mas mídia permanece (ou vice-versa) | Transação Prisma não cobre Supabase delete |
| 4 | `src/lib/ratelimit.ts` | 30-50 | **Fail-closed quebrado em edge cases**: `redis.fromEnv()` pode falhar silenciosamente se UPSTASH vars ausentes em produção | Rate limiting desativado sem aviso em produção | `const redis = process.env.UPSTASH_REDIS_REST_URL ? Redis.fromEnv() : null` - null não bloqueia |
| 5 | `src/app/api/auth/register/route.ts` | - | **Ausência de rate limiting no registro**: Permite enumeração de emails/ataque força bruta | Account takeover, enumeração usuários | Nenhum rate limit aplicado na rota register |

### 3.2 ALTOS (Severidade: ALTA)

| # | Arquivo | Linha | Problema | Consequência |
|---|---------|-------|----------|--------------|
| 6 | `src/app/api/ai/route.ts` | 120-180 | **Prompt injection mitigation incompleta**: `sanitizeInput` só faz HTML entity encoding, não prevê injection via variáveis de template `{{var}}` | Attacker pode injetar instruções via variáveis de preset |
| 7 | `src/components/editor/PostEditor.tsx` | 200-350 | **Conflito last-write-wins sem versionamento**: `useRealtime` resolve conflitos sobrescrevendo - perda de dados silenciosa | Usuário perde edições sem aviso claro |
| 8 | `src/lib/video-validation.ts` | 1-100 | **Validação ffprobe depende de binário externo**: Falha silenciosa em produção se ffprobe ausente (Vercel não inclui) | Validação server-side inexistente em produção; depende client-side |
| 9 | `src/app/api/posts/[id]/route.ts` | PATCH | **Transição status não valida regras negócio**: Permite `DRAFT → PUBLISHED` pulando `APPROVED` | Fluxo de aprovação bypassado |
| 10 | `src/app/(dashboard)/calendar/page.tsx` | - | **N+1 queries no calendário**: `usePosts` busca todos posts, depois filtra client-side | Performance degrada com >500 posts |

### 3.3 MÉDIOS (Severidade: MÉDIA)

| # | Arquivo | Linha | Problema | Consequência |
|---|---------|-------|----------|--------------|
| 11 | `src/lib/env.ts` | 80-120 | **Validação env falha em build time**: `process.env` não disponível em `next build` no Vercel | Build falha se vars não configuradas antecipadamente |
| 12 | `src/components/ui/Toast.tsx` | 28-38 | **ID geração com `Math.random()`**: Colisão possível em alta frequência | Toast errado dismissado |
| 13 | `src/app/[locale]/(dashboard)/settings/ai/page.tsx` | 121-132 | **Fetch config/presets sem error boundary**: Erro de rede deixa UI em loading infinito | UX quebrada se API falha |
| 14 | `src/hooks/useRealtime.ts` | 80-120 | **Reconexão Socket.io sem backoff exponencial**: Reconexão imediata em loop | Storm de conexões se servidor cai |
| 15 | `prisma/schema.prisma` | - | **Índices compostos ausentes**: Queries frequentes (posts por user+status+scheduledAt) sem índice | Table scans em produção |
| 16 | `src/app/api/media/route.ts` | 240-270 | **Upload Supabase sem retry**: Falha transitória de rede = erro 500 para usuário | UX ruim em rede instável |

### 3.4 BAIXOS (Severidade: BAIXA)

| # | Arquivo | Linha | Problema | Consequência |
|---|---------|-------|----------|--------------|
| 17 | `src/components/editor/AIPanel.tsx` | - | **Streaming AI sem cancelamento**: Requisição continua em background se usuário troca aba | Desperdício tokens/custo API |
| 18 | `src/lib/brand.ts` | `parseBrand` | **JSON.parse sem try/catch**: Erro de parsing quebra página inteira | Crash se brand data corrompida no DB |
| 19 | `src/app/api/templates/route.ts` | GET | **Pagination ausente**: Retorna todos templates sem limite | Payload grande, memory pressure |
| 20 | `vercel.json` | headers | **CSP muito permissivo**: `script-src 'self' 'unsafe-inline' 'unsafe-eval'` | XSS surface aumentado |

---

## 4. VULNERABILIDADES E SEGURANÇA

### 4.1 Vulnerabilidades Confirmadas (Evidência Direta)

| Vulnerabilidade | Localização | Evidência | Severidade |
|----------------|-------------|-----------|------------|
| **Prompt Injection via Variáveis** | `src/app/api/ai/route.ts:120-180` | `sanitizeInput` só escapa HTML entities (`&`, `<`, `>`, `"`, `'`). Variáveis `{{produto}}`, `{{tom}}` interpoladas diretamente no prompt sem validação de conteúdo | ALTA |
| **Rate Limiting Bypass (Registro)** | `src/app/api/auth/register/route.ts` | Nenhum rate limit aplicado; permite requests ilimitados | ALTA |
| **Magic Bytes Validation Bypass (WebP)** | `src/app/api/media/route.ts:140-147` | `validateWebP` só verifica RIFF + WEBP at offset 8. Não valida estrutura completa WebP (VP8/VP8L chunks) | MÉDIA |
| **CSP Inadequado** | `vercel.json:8-32`, `middleware.ts` | `script-src 'unsafe-inline' 'unsafe-eval'` necessário para Next.js mas expõe XSS | MÉDIA |
| **Socket.io Sem Autenticação de Conexão** | `src/app/api/socket/route.ts` | Conexão Socket.io aceita antes de validar sessão; `auth` event opcional | MÉDIA |

### 4.2 Vulnerabilidades Potenciais (Requer Investigação)

| Vulnerabilidade | Localização | Por que é Possível | Verificação Necessária |
|----------------|-------------|-------------------|------------------------|
| **Path Traversal no Media Delete** | `src/app/api/media/route.ts:276-307` | `path` vem de query param; `startsWith(`${session.user.id}/`)` pode ser burlado com `../` se Supabase não normaliza | Testar `path=userId/../../../etc/passwd` |
| **SQL Injection via Prisma Raw Queries** | `prisma/schema.prisma` + API routes | Nenhum `$queryRaw`/`$executeRaw` encontrado, mas verificar se algum uso indireto | Grep por `queryRaw`/`executeRaw` |
| **IDOR em Templates Públicos** | `src/app/api/templates/route.ts` | `isPublic` permite acesso cross-user; verificar se `userId` validado em GET público | Revisar lógica `where: { OR: [{ userId }, { isPublic: true }] }` |
| **ReDoS em Validação Zod** | `src/lib/validations/*.ts` | Regex complexas em schemas podem ser exploradas | Auditar patterns Zod `.regex()` |

### 4.3 Headers de Segurança - Análise

**Presentes (✅)**:
- `X-Content-Type-Options: nosniff` (vercel.json + middleware)
- `X-Frame-Options: SAMEORIGIN` (vercel.json + middleware)
- `X-XSS-Protection: 1; mode=block` (vercel.json)
- `Referrer-Policy: origin-when-cross-origin` (vercel.json + middleware)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (vercel.json + middleware)

**Ausentes/Incompletos (❌)**:
- `Strict-Transport-Security (HSTS)` - não configurado
- `Content-Security-Policy` - apenas `script-src` básico no middleware, sem `frame-ancestors`, `base-uri`, `form-action`
- `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy` - ausentes

---

## 5. DESEMPENHO E ARQUITETURA

### 5.1 Gargalos de Performance Identificados

| Componente | Problema | Impacto Estimado |
|------------|----------|------------------|
| **Calendar Grid** | N+1 queries - carrega todos posts, filtra client-side | O(n) memory + CPU; >1000 posts = lag perceptível |
| **Post Editor** | `useRealtime` mantém socket aberto permanente; re-render completo em qualquer mudança | Memory leak potencial; CPU em idle |
| **Media Upload** | Buffer inteiro em memória (até 50MB) antes de upload | OOM em uploads simultâneos grandes |
| **AI Generation** | Streaming sem `AbortController`; requisições órfãs | Custo API desnecessário; tokens desperdiçados |
| **Prisma Queries** | Falta índices compostos em `Post(authorId, status, scheduledAt)` | Table scans; query time linear com dataset |

### 5.2 Padrões Arquiteturais - Avaliação

| Padrão | Uso Atual | Qualidade | Recomendação |
|--------|-----------|-----------|--------------|
| **Repository/Service Layer** | ❌ Ausente - lógica direta nas API routes | Baixa coesão, difícil testar | Extrair services para `src/lib/services/` |
| **Server Components vs Client** | Misto - muitas `'use client'` desnecessárias | Bundle size inflado | Auditar cada `'use client'`; mover lógica para Server Actions |
| **TanStack Query** | ✅ Bem implementado - hooks dedicados, invalidação correta | Boa | Manter |
| **Zod Validation** | ✅ Schemas centralizados em `lib/validations/` | Boa | Adicionar `.transform()` para sanitização |
| **Error Boundaries** | ❌ Ausentes | Crash propaga para root | Adicionar em layout dashboard |
| **Optimistic Updates** | Parcial - apenas drag-and-drop calendar | UX inconsistente | Estender para create/update/delete posts |

### 5.3 Escalabilidade - Pontos de Atenção

1. **Socket.io Single Instance**: `vercel.json` rewrite para `/api/socket` - não escala horizontalmente sem Redis adapter configurado
2. **Prisma Connection Pool**: SQLite local não prepara para Turso produção; `globalForPrisma` pattern adequado mas sem `connection_limit`
3. **Rate Limiting**: Upstash Redis single-region; latência cross-region em produção global
4. **Supabase Storage**: Upload direto server-side (não presigned URLs) - banda do servidor usada desnecessariamente

---

## 6. MELHORIAS RECOMENDADAS

### 6.1 Prioridade CRÍTICA (Fazer Imediatamente)

| # | Melhoria | Arquivos Afetados | Esforço |
|---|----------|-------------------|---------|
| 1 | **Corrigir race condition no cron cleanup** - usar transação Prisma + compensação Supabase | `src/app/api/cron/cleanup/route.ts` | 2h |
| 2 | **Adicionar rate limiting no registro** - Upstash com chave por IP | `src/app/api/auth/register/route.ts`, `src/lib/ratelimit.ts` | 1h |
| 3 | **Fix Prisma memory leak** - adicionar `beforeExit` hook para `$disconnect` em dev | `src/lib/prisma.ts` | 30min |
| 4 | **Validar transições de status** - máquina de estados explícita | `src/app/api/posts/[id]/route.ts`, `src/lib/validations/post.ts` | 1h |
| 5 | **Implementar AbortController no AI streaming** | `src/app/api/ai/route.ts`, `src/components/editor/AIPanel.tsx` | 2h |

### 6.2 Prioridade ALTA (Próximas 2 Sprints)

| # | Melhoria | Arquivos Afetados | Esforço |
|---|----------|-------------------|---------|
| 6 | **Índices compostos Prisma** - `@@index([authorId, status, scheduledAt])` | `prisma/schema.prisma` | 30min + migration |
| 7 | **Server Actions para mutations** - substituir API routes POST/PATCH/DELETE | `src/app/(dashboard)/posts/*`, `src/app/api/posts/*` | 8h |
| 8 | **Presigned URLs Supabase** - upload direto client→storage | `src/app/api/media/route.ts`, `src/components/editor/MediaUploader.tsx` | 4h |
| 9 | **Error Boundaries + Fallback UI** | `src/app/(dashboard)/layout.tsx`, novos componentes | 3h |
| 10 | **Backoff exponencial Socket.io** | `src/hooks/useRealtime.ts`, `src/lib/socket.ts` | 2h |
| 11 | **CSP Hardening** - remover `unsafe-eval`, adicionar nonces | `middleware.ts`, `next.config.js` | 2h |
| 12 | **Validação ffprobe obrigatória em produção** - falhar build se ausente | `src/lib/video-metadata.ts`, `package.json` (scripts) | 2h |

### 6.3 Prioridade MÉDIA (Backlog Técnico)

| # | Melhoria | Esforço |
|---|----------|---------|
| 13 | Service layer extraction | 16h |
| 14 | Pagination em templates/media/notifications | 4h |
| 15 | Optimistic updates TanStack Query completos | 8h |
| 16 | Testes E2E (Playwright) para fluxos críticos | 16h |
| 17 | Monitoring/Alerting (Sentry já configurado, faltam alerts) | 4h |
| 18 | Documentação API (OpenAPI/Swagger) | 8h |
| 19 | Bundle analysis + code splitting | 4h |
| 20 | Acessibilidade (axe-core) audit completo | 8h |

### 6.4 Quick Wins (< 30 min cada)

| # | Melhoria | Local |
|---|----------|-------|
| 21 | `Math.random()` → `crypto.randomUUID()` em Toast | `src/components/ui/Toast.tsx:29` |
| 22 | `try/catch` em `parseBrand` | `src/lib/brand.ts` |
| 23 | Loading state com timeout em AI settings | `src/app/[locale]/(dashboard)/settings/ai/page.tsx:121` |
| 24 | `connection_limit` no Prisma client | `src/lib/prisma.ts` |
| 25 | Retry logic no Supabase upload | `src/app/api/media/route.ts:248` |

---

## 7. CONCLUSÃO

### Resumo Executivo

O **Confeitaria Content Manager** é um projeto **bem estruturado e funcional** com arquitetura moderna (Next.js 14, TypeScript strict, Prisma, TanStack Query) e cobertura de testes adequada (31 testes). As **14 funcionalidades principais estão implementadas** conforme especificação.

### Pontos Fortes ✅

1. **Segurança**: Melhorias recentes (2026-11-22) abordaram falhas críticas - ownership checks, magic bytes validation, rate limiting fail-closed, security headers
2. **Validação**: Zod schemas centralizados, validação server-side + client-side consistente
3. **Real-time**: Socket.io bem integrado com presença, cursores, detecção conflitos
4. **IA**: Vercel AI SDK com streaming, presets, múltiplos provedores
5. **PWA**: Offline read-only calendar configurado corretamente
6. **DX**: TypeScript strict, path aliases, componentes Radix UI acessíveis

### Riscos Principais ⚠️

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Data loss no cron cleanup** | Média | Alto | Corrigir transação atômica (Item 3.1#3) |
| **Rate limit bypass em produção** | Alta se UPSTASH não configurado | Alto | Validar env vars no build (Item 3.1#4) |
| **Prompt injection via presets** | Média | Alto | Sanitização variáveis template (Item 3.2#6) |
| **Performance degradação >1k posts** | Certa | Médio | Índices + pagination + Server Actions (Items 5.1, 6.2) |
| **Socket.io não escala** | Certa em multi-instance | Médio | Configurar Redis adapter (vercel.json já tem rewrite) |

### Veredito Final

**APROVADO PARA PRODUÇÃO COM RESSALVAS**

O projeto está **pronto para deploy em staging** com as correções de prioridade CRÍTICA (6.1). Para produção, recomenda-se completar itens 6.1 + 6.2 antes de go-live.

**Próximos Passos Sugeridos**:
1. Aplicar 5 correções críticas (6.1) - ~6.5h
2. Deploy staging + testes de carga
3. Implementar 7 melhorias alta prioridade (6.2) - ~25h
4. Deploy produção com monitoramento ativo

---

*Relatório gerado em 2026-11-26. Auditoria baseada em análise estática de ~30 arquivos core. Não inclui análise de dependências (npm audit) nem testes de penetração dinâmicos.*