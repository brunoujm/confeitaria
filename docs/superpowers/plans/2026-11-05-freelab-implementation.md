# Freelab - Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma aplicação Next.js com Tailwind CSS chamada Freelab, um gerenciador de tarefas para freelancers brasileiros, com tarefas contendo título, cliente, valor em R$ e status, e 3 tarefas de exemplo com clientes fictícios.

**Architecture:** Next.js App Router (pages router, simples) com componentes React puros. Os dados ficam em um arquivo estático (JSON/JS) que exporta um array de tarefas. Não há backend nem persistência.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS 3, PostCSS, Autoprefixer.

**Spec:** docs/superpowers/specs/2026-11-05-freelab-design.md

## Global Constraints

- Linguagem: JavaScript (conforme escolha do usuário).
- Cada tarefa tem: `id`, `title`, `client`, `value`, `status`.
- 3 tarefas de exemplo com clientes fictícios.
- Valor exibido formatado como moeda brasileira (R$).
- Estilo com Tailwind CSS.
- Executável localmente com `npm run dev`.
- Não usar TypeScript, backend, banco de dados ou autenticação.

## Review Focus

- Dados ausentes ou array vazio → a página não quebra, mostra vazio ou mensagem padrão.
- Valor negativo ou zero → ainda assim exibe "R$ 0,00".
- Status inválido → exibe o texto informado sem estilizar de forma inesperada.

---

### Task 1: Criar estrutura de pastas e inicializar npm

**Files:**
- Create: `package.json`
- Create: `.gitignore`

**Interfaces:**
- None

- [ ] **Step 1: Criar package.json**

```json
{
  "name": "freelab",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.27",
    "autoprefixer": "^10.4.16"
  }
}
```

- [ ] **Step 2: Criar .gitignore**

```gitignore
node_modules/
.next/
*.log
.DS_Store
```

- [ ] **Step 3: Executar npm install**

Run: `npm install`

Expected: Pacotes instalados, sem erros.

---

### Task 2: Configurar Tailwind CSS e PostCSS

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `styles/globals.css`

**Interfaces:**
- `globals.css` será importado em `pages/_app.js`.

- [ ] **Step 1: Criar tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 2: Criar postcss.config.js**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: Criar styles/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
```

---

### Task 3: Criar páginas e layout base

**Files:**
- Create: `pages/_app.js`
- Create: `pages/index.js`

**Interfaces:**
- `_app.js` importa `styles/globals.css`.
- `index.js` renderiza o componente `TaskList`.

- [ ] **Step 1: Criar pages/_app.js**

```jsx
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
```

- [ ] **Step 2: Criar pages/index.js**

```jsx
import TaskList from '../components/TaskList';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Freelab</h1>
      <TaskList />
    </main>
  );
}
```

---

### Task 4: Criar dados de exemplo das tarefas

**Files:**
- Create: `data/tasks.js`

**Interfaces:**
- Exporta um array `tasks` de objetos `{ id, title, client, value, status }`.

- [ ] **Step 1: Criar data/tasks.js**

```js
export const tasks = [
  {
    id: 1,
    title: 'Criação de site institucional',
    client: 'Empresa Alfa Ltda',
    value: 2500,
    status: 'Em andamento',
  },
  {
    id: 2,
    title: 'Desenvolvimento de app móvel',
    client: 'Beta Soluções',
    value: 4200,
    status: 'Concluído',
  },
  {
    id: 3,
    title: 'Consultoria de UX/UI',
    client: 'Gamma Consultoria',
    value: 1800,
    status: 'Em espera',
  },
];
```

---

### Task 5: Criar componente TaskCard

**Files:**
- Create: `components/TaskCard.jsx`
- Create: `tests/components/TaskCard.test.jsx`

**Interfaces:**
- Recebe props: `title`, `client`, `value`, `status`.
- Produz: JSX com título, cliente, valor formatado como R$ e status.

- [ ] **Step 1: Escrever o teste falhando**

```jsx
import { render, screen } from '@testing-library/react';
import TaskCard from '../../components/TaskCard';

test('renderiza todas as props da tarefa', () => {
  render(<TaskCard title="Setup" client="Cliente Teste" value={1000} status="Em andamento" />);
  expect(screen.getByText('Setup')).toBeInTheDocument();
  expect(screen.getByText('Cliente: Cliente Teste')).toBeInTheDocument();
  expect(screen.getByText('Valor: R$ 1000,00')).toBeInTheDocument();
  expect(screen.getByText('Status: Em andamento')).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar o teste para confirmar falha**

Run: `npx jest tests/components/TaskCard.test.jsx`

Expected: FAIL (módulo `TaskCard` ainda não existe).

- [ ] **Step 3: Criar o componente TaskCard.jsx**

```jsx
export default function TaskCard({ title, client, value, status }) {
  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

  const statusColor =
    status === 'Concluído'
      ? 'text-green-600 bg-green-100'
      : status === 'Em andamento'
        ? 'text-blue-600 bg-blue-100'
        : 'text-gray-600 bg-gray-100';

  return (
    <article className="border rounded-lg p-4 bg-white shadow-sm mb-4">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="text-gray-700 mb-2">Cliente: {client}</p>
      <p className="text-gray-700 mb-2">Valor: {valorFormatado}</p>
      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
        Status: {status}
      </span>
    </article>
  );
}
```

- [ ] **Step 4: Rodar o teste para confirmar sucesso**

Run: `npx jest tests/components/TaskCard.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/TaskCard.jsx tests/components/TaskCard.test.jsx
git commit -m "feat: adicionar componente TaskCard"
```

---

### Task 6: Criar componente TaskList

**Files:**
- Create: `components/TaskList.jsx`
- Create: `tests/components/TaskList.test.jsx`

**Interfaces:**
- Importa `tasks` de `../data/tasks`.
- Recebe `TaskCard` e renderiza um mapa.

- [ ] **Step 1: Escrever o teste falhando**

```jsx
import { render, screen } from '@testing-library/react';
import TaskList from '../../components/TaskList';

test('renderiza todas as tarefas', () => {
  render(<TaskList />);
  expect(screen.getByText('Criação de site institucional')).toBeInTheDocument();
  expect(screen.getByText('Desenvolvimento de app móvel')).toBeInTheDocument();
  expect(screen.getByText('Consultoria de UX/UI')).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar o teste para confirmar falha**

Run: `npx jest tests/components/TaskList.test.jsx`

Expected: FAIL.

- [ ] **Step 3: Criar o componente TaskList.jsx**

```jsx
import { tasks } from '../data/tasks';
import TaskCard from './TaskCard';

export default function TaskList() {
  return (
    <div className="grid gap-4">
      {tasks.map((task) => (
        <TaskCard key={task.id} {...task} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rodar o teste para confirmar sucesso**

Run: `npx jest tests/components/TaskList.test.jsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/TaskList.jsx tests/components/TaskList.test.jsx
git commit -m "feat: adicionar componente TaskList"
```

---

### Task 7: Instalar dependências de teste e configurar Jest

**Files:**
- Modify: `package.json` (adicionar `devDependencies`)

**Interfaces:**
- Adicionar `jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.

- [ ] **Step 1: Adicionar devDependencies no package.json**

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@testing-library/react": "^14.2.0",
    "@testing-library/jest-dom": "^6.2.0",
    "babel-jest": "^29.7.0"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
    "moduleNameMapper": {
      "\\.(css|less|scss|sass)$": "identity-obj-proxy"
    }
  }
}
```

- [ ] **Step 2: Criar jest.setup.js**

```js
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Executar npm install**

Run: `npm install`

Expected: Pacotes de teste instalados.

- [ ] **Step 4: Commit**

```bash
git add package.json jest.setup.js
git commit -m "feat: configurar ambiente de teste"
```

---

### Task 8: Adicionar README.md

**Files:**
- Create: `README.md`

**Interfaces:**
- Instruções para rodar o projeto localmente.

- [ ] **Step 1: Escrever README.md**

```markdown
# Freelab

Gerenciador de tarefas para freelancers brasileiros.

## Como rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Tecnologias

- Next.js 14
- React 18
- Tailwind CSS

## Tarefas de exemplo

- Criação de site institucional – Empresa Alfa Ltda – R$ 2.500,00 – Em andamento
- Desenvolvimento de app móvel – Beta Soluções – R$ 4.200,00 – Concluído
- Consultoria de UX/UI – Gamma Consultoria – R$ 1.800,00 – Em espera
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: adicionar README"
```

---

### Task 9: Executar todos os testes e build de produção

**Files:**
- None

- [ ] **Step 1: Rodar todos os testes**

Run: `npx jest --verbose`

Expected: Todos os testes passam.

- [ ] **Step 2: Rodar build de produção**

Run: `npm run build`

Expected: Build concluído com sucesso.

- [ ] **Step 3: Commit final**

```bash
git add .
git commit -m "feat: concluir implementação do Freelab"
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-11-05-freelab-implementation.md`.**  
Por favor, revise o plano. Ele captura o que você quer para o Freelab?

**Qual abordagem de execução você prefere?**

- **Subagent-driven** – Um subagente novo implementa cada tarefa e um revisor novo confere antes da próxima, com revisão de branch completa no final. Mais detalhado; custa um novo contexto por tarefa e por revisão.
- **Native** – Eu implemento todas as tarefas nesta sessão, depois um revisor novo confere toda a branch de uma vez. Mais barato e rápido; revisão independente apenas no final.

Qual abordagem usar?
