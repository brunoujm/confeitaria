# Changelog Técnico

Registro de todas as correções, melhorias e alterações técnicas realizadas no projeto Confeitaria Content Manager.

---

## [2026-11-23] — Criação do Senior Developer Agent

**Problema identificado:**
Necessidade de um agente autônomo especializado em manutenção e evolução de software, capaz de diagnosticar, corrigir, testar e documentar problemas seguindo metodologia rigorosa de engenharia de software sênior.

**Causa raiz:**
Ausência de um agente reutilizável com identidade própria, metodologia estruturada (6 etapas), documentação técnica padronizada e foco em qualidade, segurança e integridade do projeto.

**Arquivos criados:**
- `.claude/agents/senior-developer-agent.md` — Agente completo com identidade, metodologia, regras e especialidades
- `docs/CHANGELOG-TECNICO.md` — Este arquivo de registro técnico

**Correções realizadas:**
1. Criação do arquivo de agente `.claude/agents/senior-developer-agent.md` com:
   - Identidade completa (nome, cargo, especialidades)
   - 6 etapas obrigatórias de execução (Entender → Diagnosticar → Planejar → Executar → Validar → Documentar)
   - Regras de comportamento (12 regras)
   - Diretrizes de análise visual e UX/UI
   - Proteção e integridade do projeto (Git, arquivos sensíveis)
   - Relatório final obrigatório
   - Princípio fundamental de engenharia sênior
   - Especialidades técnicas (Frontend, Backend, Segurança, Qualidade)
   - Comandos de validação padrão
   - Instruções de uso

2. Criação da estrutura de documentação técnica em `docs/CHANGELOG-TECNICO.md`

**Justificativa técnica:**
- Agentes no Claude Code são definidos via arquivos Markdown em `.claude/agents/` com frontmatter YAML
- Metodologia de 6 etapas garante rastreabilidade, qualidade e prevenção de regressões
- Documentação obrigatória em `CHANGELOG-TECNICO.md` cria histórico auditável
- Formato em português brasileiro atende ao requisito de comunicação na língua do usuário
- Agente reutilizável em diferentes projetos via cópia do arquivo `.md`

**Validação:**
- ✅ Arquivo de agente criado com frontmatter correto (name, description, tools, model)
- ✅ Estrutura seguindo convenções do Claude Code
- ✅ Pasta `docs` criada
- ✅ CHANGELOG-TECNICO.md inicializado com formato padronizado
- ✅ Sintaxe Markdown válida

**Status:** Concluído

---

## [2026-11-23] — Correção de Erros TypeScript e ESLint

**Problema identificado:**
Dois erros bloqueando o build e lint do projeto:
1. Erro TypeScript TS1127/TS1005 em `src/app/api/posts/[id]/route.ts` linha 70 - template literal inválido com caracteres de escape incorretos
2. Erros ESLint `react/no-unescaped-entities` em `src/app/(dashboard)/settings/account/page.tsx` linha 413 - aspas duplas não escapadas em JSX

**Causa raiz:**
1. No arquivo `src/app/api/posts/[id]/route.ts`, a string de identificação do rate limiter foi escrita com sintaxe inválida: `\posts:\` em vez de template literal correto
2. No arquivo `src/app/(dashboard)/settings/account/page.tsx`, duas ocorrências da string `Digite "EXCLUIR" para confirmar` continham aspas duplas literais dentro de JSX, que devem ser escapadas como entidades HTML `"`

**Arquivos modificados:**
- `src/app/api/posts/[id]/route.ts`
- `src/app/(dashboard)/settings/account/page.tsx`
- `.eslintrc.js` (criado)

**Correções realizadas:**
1. **src/app/api/posts/[id]/route.ts** (linha 70):
   - Alterado: `const rateLimitResult = await checkRateLimit(apiRateLimiter, \posts:\);`
   - Para: `const rateLimitResult = await checkRateLimit(apiRateLimiter, \`posts:${session.user.id}\`);`

2. **src/app/(dashboard)/settings/account/page.tsx** (linhas 165 e 413):
   - Alterado: `Digite "EXCLUIR" para confirmar`
   - Para: `Digite "EXCLUIR" para confirmar`
   (Duas ocorrências: uma no erro de validação e outra no Label do formulário)

3. **.eslintrc.js** (criado):
   - Arquivo de configuração ESLint no formato legado (CommonJS) compatível com ESLint 8.57
   - Estende `next/core-web-vitals`, `plugin:@typescript-eslint/recommended`, `plugin:react-hooks/recommended`
   - Regras configuradas para warnings em `no-explicit-any`, `no-unused-vars`, `consistent-type-imports`
   - Erro em `react/no-unescaped-entities`
   - Ignore patterns para node_modules, .next, dist, build, config files, prisma, public

**Justificativa técnica:**
- O erro TypeScript impedia a compilação (`npx tsc --noEmit` falhava)
- Os erros ESLint impediam o lint clean (`npm run lint` falhava)
- O template literal correto usa backticks (\`) e interpolação `${session.user.id}` para identificar unicamente o usuário no rate limiter
- Entidades HTML `"` são o padrão correto para aspas duplas dentro de JSX (React)
- O arquivo `.eslintrc.js` foi recriado pois estava ausente do projeto (conforme histórico em CORRECOES_REALIZADAS.md)

**Validação:**
- TypeScript: `npx tsc --noEmit` — OK (0 erros)
- Lint: `ESLINT_USE_FLAT_CONFIG=false ./node_modules/.bin/eslint -c .eslintrc.js --no-ignore "src/**/*.{ts,tsx,js,jsx}"` — OK (0 erros, 134 warnings)
- Testes: `npm test` — 31/31 passing
- Build: `npm run build` — OK (compilação bem-sucedida, apenas warnings)

**Status:** Concluído

---

## Formato de Registro (Template)

Para futuras correções, utilizar o seguinte formato:

```markdown
## [YYYY-MM-DD] — TÍTULO DA CORREÇÃO

**Problema identificado:**
Explicação do problema encontrado.

**Causa raiz:**
Explicação técnica da origem do problema.

**Arquivos modificados:**
- `caminho/arquivo1.ts`
- `caminho/arquivo2.tsx`

**Correções realizadas:**
Descrição detalhada das mudanças.

**Justificativa técnica:**
Por que essa solução foi escolhida.

**Validação:**
- TypeScript: `npx tsc --noEmit` — OK
- Lint: `npm run lint` — OK
- Testes: `npm test` — 31/31 passing
- Build: `npm run build` — OK

**Status:** Concluído / Parcialmente concluído / Pendente
```