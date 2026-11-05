---
name: freelab-design
description: Especificação inicial do projeto Freelab, gestor de tarefas para freelancers brasileiros.
---
# Especificação do Projeto Freelab

## Visão Geral
Freelab é uma aplicação web construída com **Next.js** e **Tailwind CSS** que funciona como um gerenciador simples de tarefas para a comunidade de freelancers no Brasil. Cada tarefa possui:

- **Título** – Nome da tarefa.
- **Cliente** – Nome do cliente.
- **Valor** – Quantia em reais (R$).
- **Status** – Estado atual (`Em andamento`, `Concluído`, `Em espera` …).

O objetivo não é criar um SaaS completo, mas sim um protótipo funcional que demonstra as propriedades básicas definidas acima, com uma UI limpa e responsiva, e que possa ser rapidamente demonstrado e testado.

## Escopo
- Front‑end SPA com as páginas necessárias para listar tarefas e exibi‑las.
- Dados armazenados localmente em um arquivo JSON/JavaScript, sem backend.
- Estilo com Tailwind CSS.
- Build e execução local via `npm run dev`.
- Documentação básica no README.

## Arquitetura
```
freelab/
├─ pages/
│  ├─ index.tsx           # Página principal que lista as tarefas
│  └─ _app.tsx            # Entrada do Next.js (imports de CSS global)
├─ components/
│  ├─ TaskList.tsx        # Lista de tarefas (com mapa)
│  ├─ TaskCard.tsx        # Cartão de tarefa (UI simples)
│  └─ ... (possíveis extensões)
├─ data/
│  └─ tasks.ts           # Array estático com exemplos
├─ styles/
│  └─ globals.css        # Tailwind CSS imports
├─ public/
│  └─ (imagens ou assets base)
├─ tailwind.config.js    # Configuração do Tailwind
├─ postcss.config.js     # Configuração PostCSS
├─ package.json           # Dependências npm
└─ README.md              # Instruções de uso
```

## Modelo de Dados
```ts
interface Task {
  id: number;
  title: string;
  client: string;
  value: number; // valor em reais
  status: 'Em andamento' | 'Concluído' | 'Em espera' | string;
}
```
- **id**: identificador numérico.
- **title**: string.
- **client**: string.
- **value**: número (representa R$).
- **status**: texto (enum simples).

## Componentes de UI
1. **TaskCard** – Exibe título, cliente, valor e status.
   - Estiliza o status com cores do Tailwind (ex: verde para concluído).
2. **TaskList** – Rendeza a lista de `TaskCard`.
   - Recebe o array de tarefas por props.

## Rotas
- `/` – Página inicial, lista de tarefas.
- Nenhuma página de detalhes ou edição no escopo atual.

## Estilo
- **Tailwind CSS** em `globals.css`:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- Configuração em `tailwind.config.js` com `content` apontando para `pages` e `components`.
- PostCSS configurado em `postcss.config.js`.

## Build e Execução
1. Instale as dependências: `npm install`.
2. Inicie o servidor de desenvolvimento: `npm run dev`.
3. Abra `http://localhost:3000`.

## Dependências
- `next` - framework React.
- `react`, `react-dom` - dependências React.
- `tailwindcss`, `postcss`, `autoprefixer` - para Tailwind.

## Observações
- O projeto não inclui autenticação nem persistência real; os dados são estáticos.
- Se quiser persistir dados no futuro, poderá adicionar uma API Route simples ou usar Notion/Google Sheets via API, mas isso está fora do escopo.
- Para testar localmente sem alterar o arquivo, basta editar `data/tasks.ts`.

---
## Pergunta para o usuário
Por favor, revise este documento de design em `docs/superpowers/specs/2026-11-05-freelab-design.md`. Se estiver tudo de acordo, diga "Aprovado" ou sugira alterações.
