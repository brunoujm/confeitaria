# Bugs e Problemas Encontrados — Auditoria Pós-Sprints

**Data:** 2026-11-24
**Auditor:** Senior Developer Agent
**Commit base:** dc08c65

---

## Classificação de Prioridade

| Prioridade | Definição | SLA Sugerido |
|------------|-----------|--------------|
| **P0** | Crítico — Bloqueia produção, segurança, perda de dados | Imediato |
| **P1** | Alto — Funcionalidade quebrada, UX severa, regressão | 24-48h |
| **P2** | Médio — Degradação performance, acessibilidade, DX | 1 semana |
| **P3** | Baixo — Código não ideal, warnings, tech debt | Próximo sprint |
| **P4** | Informacional — Sugestões, melhorias futuras | Backlog |

---

## Lista Consolidada de Problemas

### P0 — Críticos (3 itens)

| ID | Título | Sprint | Arquivo | Descrição |
|----|--------|--------|---------|-----------|
| BUG-001 | **Validação de Env Vars Ausente** | 3 | — | App inicia sem validar `.env`; falhas cripticas em runtime se `NEXTAUTH_SECRET`, `DATABASE_URL`, etc. ausentes |
| BUG-002 | **CI/CD Pipeline Inexistente** | 3 | — | Sem automação de TypeScript, ESLint, Testes, Build em PRs; regressões não detectadas |
| BUG-003 | **Sentry Não Integrado** | 3 | `src/components/ui/ErrorBoundary.tsx:54-56` | Preparado mas `@sentry/nextjs` não instalado; zero observabilidade em produção |

---

### P1 — Altos (5 itens)

| ID | Título | Sprint | Arquivo | Descrição |
|----|--------|--------|---------|-----------|
| BUG-004 | **Cobertura de Testes ~15%** | 3 | `tests/` | Apenas 31 testes (auth + video validation); faltam: API, componentes, hooks, E2E |
| BUG-005 | **Acessibilidade: alt-text ausente (7 ocorrências)** | 3 | `brand/page.tsx`, `gallery/page.tsx`, `ai/page.tsx`, `Avatar.tsx` | `<img>` sem `alt`; viola WCAG 2.1 AA; ESLint `jsx-a11y/alt-text` warnings |
| BUG-006 | **Acessibilidade: `<img>` em vez de `<Image />` (15+ ocorrências)** | 3 | Múltiplos componentes | Não usa otimização Next.js; LCP/bandwidth impactados; `@next/next/no-img-element` warnings |
| BUG-007 | **useRealtime: Memory Leak Teórico** | 2 | `src/hooks/useRealtime.ts:133` | Dependências do `useEffect` incluem callbacks; se pai não memoizar, re-registra listeners a cada render |
| BUG-008 | **N+1 Potencial no Frontend (posts/page.tsx)** | 2 | `src/app/(dashboard)/posts/page.tsx` | Componente pode acessar relações não pré-carregadas pela API (media, template além de thumbnail) |

---

### P2 — Médios (8 itens)

| ID | Título | Sprint | Arquivo | Descrição |
|----|--------|--------|---------|-----------|
| BUG-009 | **Duplicação de Regras de Validação de Vídeo** | 2 | `video-validation.ts`, `VideoValidator.tsx`, `video-metadata.ts` | Mesmas regras de plataforma duplicadas em 3 locais (server pure, client React, server API) |
| BUG-010 | **post:update Socket Não Atualiza TanStack Query Cache** | 2+3 | `useRealtime.ts`, `usePosts.ts` | Evento real-time recebe updates mas faz refetch completo via `invalidateQueries` em vez de `setQueryData` otimista |
| BUG-011 | **Redis Adapter Socket.io Não Testado Multi-Instância** | 2 | `src/app/api/socket/route.ts:41-53` | Código condicional existe mas nunca validado com 2+ instâncias + Redis |
| BUG-012 | **Toast Inacessível em global-error.tsx** | 3 | `src/app/global-error.tsx` | Error page fora do provider tree; offline detection não usa Toast unificado |
| BUG-013 | **Console.logs em Produção (11 ocorrências)** | 2 | `socket/route.ts`, `calendar/page.tsx`, `PostEditor.tsx`, `templates/page.tsx` | `no-console` warnings; logs de debug em código de produção |
| BUG-014 | **Tipos `any` Explícitos (25 ocorrências)** | 2 | `auth.ts`, `posts/[id]/route.ts`, `ai/page.tsx`, `settings/ai/page.tsx`, etc. | `@typescript-eslint/no-explicit-any` warnings; type safety reduzida |
| BUG-015 | **Dependências useMemo/useCallback Incorretas (8 ocorrências)** | 2 | `usePosts.ts`, `PostEditor.tsx`, `useRealtime.ts` | `react-hooks/exhaustive-deps` warnings; pode causar bugs sutis |
| BUG-016 | **Variáveis/Imports Não Utilizados (36 ocorrências)** | 1+2 | Múltiplos arquivos | `@typescript-eslint/no-unused-vars` warnings; ruído no código |

---

### P3 — Baixos (6 itens)

| ID | Título | Sprint | Arquivo | Descrição |
|----|--------|--------|---------|-----------|
| BUG-017 | **Internacionalização Ausente** | 3 | — | Strings hardcoded pt-BR; sem `next-intl`; expansão futura dificultada |
| BUG-018 | **Documentação Pública Ausente** | 3 | — | Sem `README.md`, `docs/api/`, `CONTRIBUTING.md`, `CHANGELOG.md` |
| BUG-019 | **Seed com Senhas Hardcoded** | 1 | `prisma/seed.ts` (implícito) | Usuários padrão `voce@email.com` / `123456` — inseguro se seed rodar em prod |
| BUG-020 | **Enums como Strings no Prisma** | 1 | `prisma/schema.prisma` | PostType, PostStatus, MediaType, etc. como `String` — sem type safety no DB |
| BUG-021 | **SystemPrompt sem Sanitização em AI Presets** | 1 | `src/app/api/ai/presets/route.ts` | Presets podem conter prompts injetados; sanitization só em `/api/ai` POST |
| BUG-022 | **Índice Composto Faltando em Notifications** | 1 | `prisma/schema.prisma` | Query por `userId + read + createdAt` sem índice; performance degradada em escala |

---

### P4 — Informacionais (4 itens)

| ID | Título | Sprint | Arquivo | Descrição |
|----|--------|--------|---------|-----------|
| BUG-023 | **Bundle Size Não Monitorado** | 2 | — | Sem `@next/bundle-analyzer` ou CI check de tamanho |
| BUG-024 | **Service Worker Não Versionado** | 1 | `next-pwa` config | Cache strategies definidas mas sem versionamento/busting estratégico |
| BUG-025 | **Timezone Handling Implícito** | 1 | `date-fns` com `ptBR` locale | `scheduledAt` salvo como UTC mas exibido em local; possível confusão DST |

---

## Resumo por Prioridade

| Prioridade | Quantidade | % do Total |
|------------|------------|------------|
| P0 | 3 | 12% |
| P1 | 5 | 20% |
| P2 | 8 | 32% |
| P3 | 6 | 24% |
| P4 | 4 | 16% |
| **Total** | **26** | **100%** |

---

## Top 5 para Correção Imediata (Pré-Produção)

1. **BUG-001** — Env Validation (fail-fast startup)
2. **BUG-002** — CI/CD Pipeline (quality gate)
3. **BUG-003** — Sentry Integration (observability)
4. **BUG-004** — Test Coverage (confidence)
5. **BUG-005/006** — Acessibilidade (compliance legal/ético)

---

## Bugs Já Corrigidos Durante Auditoria

*Nenhum bug corrigido durante esta auditoria — apenas documentados. Correções serão registradas em `CORRECOES-ADICIONAIS.md` se executadas.*