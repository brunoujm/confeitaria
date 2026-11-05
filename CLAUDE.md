# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Freelab** - A task manager for Brazilian freelancers built with Next.js 14 (Pages Router), React 18, and Tailwind CSS. Displays a list of tasks with title, client, value (in BRL), and status (Em andamento, Concluído, Em espera). Includes a report view and task creation form.

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
npx jest tests/components/TaskCard.test.jsx
npx jest tests/components/TaskList.test.jsx
```

## Project Structure

```
freelab/
├── pages/
│   ├── _app.js          # Next.js entry point, imports global styles
│   └── index.js         # Home page with dashboard stats, TaskList, and ReportView
├── components/
│   ├── TaskCard.jsx     # Individual task card with status pills, delete/status change modals
│   └── TaskList.jsx     # Task list with filters, add task form, and TaskCard rendering
├── data/
│   └── tasks.js         # Static array of 3 example tasks (exported as `tasks`)
├── styles/
│   └── globals.css      # Tailwind imports + base styles
├── tests/
│   └── components/      # Jest + React Testing Library tests
├── tailwind.config.js   # Tailwind config (content: pages + components)
├── postcss.config.js    # PostCSS with tailwindcss + autoprefixer
├── jest.setup.js        # Testing Library DOM matchers
└── package.json
```

## Key Implementation Details

- **Language**: JavaScript (not TypeScript)
- **Data**: Static array in `data/tasks.js` - no backend/database
- **Currency**: Formatted via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- **Status colors**: 
  - Green: Concluído
  - Blue: Em andamento  
  - Amber: Em espera
  - Red: Pendente (fallback)
- **Tests**: Jest with jsdom, React Testing Library, babel-jest for JSX, CSS modules mocked via identity-obj-proxy

## Current Features (Beyond Original Spec)

The implementation has evolved beyond the original spec:

1. **Dashboard stats cards** (total, received, pending) on home page
2. **Report view** with detailed table, status breakdown, and totals (toggle via "Gerar relatório" button)
3. **Task filtering** (Todas, Pendente, Em Andamento, Concluído)
4. **Add task form** with validation (title, client, value, status)
5. **TaskCard enhancements**: 
   - Status change via pill buttons with confirmation modal
   - Delete with confirmation modal
   - Inline client display

## Testing Notes

- Tests are in `tests/components/`
- Run with `npm test` or `npx jest`
- Setup file at `jest.setup.js` imports `@testing-library/jest-dom`
- CSS modules mocked via `identity-obj-proxy`
- Test files: `TaskCard.test.jsx`, `TaskList.test.jsx`

## Git Workflow

- Main branch: `main`
- Current branch: `master`
- Recent commit: `1799d40 feat: implement Freelab task manager`

## Documentation

- Design spec: `docs/superpowers/specs/2026-11-05-freelab-design.md`
- Implementation plan: `docs/superpowers/plans/2026-11-05-freelab-implementation.md`

## Common Patterns

### Adding a new task
Tasks are managed in `TaskList.jsx` state. New tasks get `id: Date.now()` and are prepended to the list.

### Status values
Use exact strings: `'Em andamento'`, `'Concluído'`, `'Em espera'`, `'Pendente'`. Status config in `TaskCard.jsx` maps these to Tailwind classes.

### Currency formatting
```js
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
```

### Running a single test
```bash
npx jest tests/components/TaskCard.test.jsx --verbose
```