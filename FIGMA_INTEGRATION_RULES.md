# Regras de Integração Figma MCP

**Projeto**: Confeitaria Content Manager  
**Gerado**: 2026-11-08  
**Propósito**: Regras abrangentes para integrar designs Figma via Model Context Protocol (MCP)

---

## 1. Definições de Tokens

### Onde os Tokens São Definidos

Tokens de design são definidos principalmente em **duas localizações**:

1. **Banco de Dados (Prisma)** - Modelo `BrandIdentity` armazena tokens semânticos como strings JSON:
   - `prisma/schema.prisma` linhas 89-105

2. **Tipos TypeScript** - `src/types/index.ts` linhas 80-108 define a interface TypeScript

### Estrutura dos Tokens

```typescript
// Cores do BrandIdentity (10 tokens semânticos)
colors: {
  primary: string;        // Cor principal da marca - #E85D75 (rosa)
  secondary: string;      // Cor secundária da marca
  accent: string;         // Cor de destaque/accent
  background: string;     // Fundo da página/app
  surface: string;        // Fundo de cards/superfícies
  text: string;           // Cor de texto primária
  textMuted: string;      // Texto secundário/mudo
  success: string;        // Estado de sucesso
  warning: string;        // Estado de aviso
  error: string;          // Estado de erro
}

// Tipografia (2 famílias de fonte)
fonts: {
  heading: string;        // Google Font para títulos
  body: string;           // Google Font para corpo de texto
}

// Variantes de logo (3)
logos: {
  main: string;           // Logo principal (fundo claro)
  dark: string;           // Logo para fundos escuros
  watermark: string;      // Variante sutil de watermark
}

// Hashtags padrão
defaultHashtags: string[];
```

### Mapeamento de Variáveis CSS (Config Tailwind)

O projeto usa **variáveis CSS** para theming via `darkMode: 'class'` do Tailwind:

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Mapeamento semântico usando variáveis CSS
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
    },
  },
};
```

### Definição das Variáveis CSS (globals.css)

```css
/* src/app/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 340 82% 55%;       /* #E85D75 - Rosa da marca */
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 340 82% 55%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 340 82% 55%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 340 82% 55%;
}
```

### Regras de Transformação de Tokens

| Token Figma | Token Código | Transformação |
|-------------|--------------|---------------|
| `color.primary` | `--primary` (HSL) | Converter hex → HSL (0-360, 0-100%, 0-100%) |
| `color.background` | `--background` | Mesma |
| `font.heading` | `font-heading` CSS var | Nome Google Font → Variável CSS |
| `font.body` | `font-body` CSS var | Nome Google Font → Variável CSS |
| `spacing.*` | Escala spacing Tailwind | Pixels Figma → Tailwind `space-*` / `p-*` / `m-*` |
| `borderRadius.*` | `--radius` | Px Figma → rem (1rem = 16px) |

### Escopos de Variáveis Figma (para Code Connect)

Ao criar variáveis Figma para Code Connect, use estes escopos:

```javascript
// Variáveis de cor
scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE"]

// Variáveis de tipografia  
scopes: ["FONT_FAMILY", "FONT_WEIGHT", "FONT_SIZE", "LINE_HEIGHT", "LETTER_SPACING"]

// Variáveis de espaçamento
scopes: ["GAP", "FRAME_WIDTH", "FRAME_HEIGHT", "RECTANGLE_WIDTH", "RECTANGLE_HEIGHT"]
```

---

## 2. Biblioteca de Componentes

### Arquitetura de Componentes

**Localização**: `src/components/ui/` - Primitivos estilo shadcn/ui construídos sobre Radix UI

**Padrão**: Componentes compostos com `forwardRef` + utilitário `cn()` para merge de classes

### Componentes Principais

| Componente | Arquivo | Base Radix | Variantes |
|------------|---------|------------|-----------|
| Button | `Button.tsx` | Nenhum (custom) | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` + `default`, `sm`, `lg`, `icon` |
| Input | `Input.tsx` | Nenhum | Input HTML padrão |
| Card | `Card.tsx` | Nenhum | Composto: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| Select | `Select.tsx` | `@radix-ui/react-select` | Select simples |
| Dialog | `Dialog.tsx` | `@radix-ui/react-dialog` | Composto: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter |
| Tabs | `Tabs.tsx` | `@radix-ui/react-tabs` | Composto: Tabs, TabsList, TabsTrigger, TabsContent |
| DropdownMenu | `DropdownMenu.tsx` | `@radix-ui/react-dropdown-menu` | Composto |
| Avatar | `Avatar.tsx` | `@radix-ui/react-avatar` | Avatar, AvatarImage, AvatarFallback |
| Label | `Label.tsx` | `@radix-ui/react-label` | Label de formulário |
| Separator | `Separator.tsx` | `@radix-ui/react-separator` | Divisor visual |
| ScrollArea | `ScrollArea.tsx` | `@radix-ui/react-scroll-area` | Scrollbar customizada |

### Padrão de Estilização de Componentes

```typescript
// Button.tsx - Sistema de variantes usando cva (class-variance-authority)
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);
```

### Componentes de Feature (Não-Primitivos UI)

| Componente | Localização | Propósito |
|------------|-------------|-----------|
| CalendarGrid | `src/components/calendar/CalendarGrid.tsx` | Calendário mês/semana com drag-drop |
| DayCell | `src/components/calendar/DayCell.tsx` | Célula de dia individual |
| PostCard | `src/components/calendar/PostCard.tsx` | Preview de post no calendário |
| PostEditor | `src/components/editor/PostEditor.tsx` | Criação/edição completa de post |
| MediaUploader | `src/components/editor/MediaUploader.tsx` | Upload Supabase Storage |
| AIPanel | `src/components/editor/AIPanel.tsx` | Geração IA (legenda/hashtags/imagem) |
| TemplateSelector | `src/components/editor/TemplateSelector.tsx` | Seletor de templates |
| BrandQuickApply | `src/components/editor/BrandQuickApply.tsx` | Aplicação de marca em um clique |
| TemplateList | `src/components/templates/TemplateList.tsx` | UI CRUD de templates |
| TemplateBuilder | `src/components/templates/TemplateBuilder.tsx` | Builder visual de templates |
| ColorPicker | `src/components/brand/ColorPicker.tsx` | Gestão de cores da marca |
| FontSelector | `src/components/brand/FontSelector.tsx` | Integração Google Fonts |
| LogoUpload | `src/components/brand/LogoUpload.tsx` | Upload de variantes de logo |
| NotificationBell | `src/components/notifications/NotificationBell.tsx` | Dropdown de notificações |
| PresenceAvatars | `src/components/realtime/PresenceAvatars.tsx` | Avatares colaborativos |
| CursorOverlay | `src/components/realtime/CursorOverlay.tsx` | Exibição de cursores remotos |

---

## 3. Frameworks & Bibliotecas

### Stack Principal

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Framework | Next.js | 14 (App Router) |
| Linguagem | TypeScript | 5.x |
| React | React | 18 |
| Estilização | Tailwind CSS | 3.x |
| UI Primitivos | Radix UI | Latest |
| Estado | TanStack Query | 5.x |
| Validação | Zod | 3.x |
| Database ORM | Prisma | 5.x |
| Database | SQLite (local) / Turso libSQL (prod) | - |
| Auth | NextAuth.js | 4.x |
| IA | Vercel AI SDK | Latest |
| Storage | Supabase Storage | - |
| Real-time | Socket.io | 4.x |
| Drag & Drop | @dnd-kit | Latest |
| Ícones | lucide-react | Latest |
| PWA | next-pwa | Latest |
| Rate Limiting | Upstash Redis | - |

### Sistema de Build

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
};
```

### Dependências Principais (package.json)

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-dropdown-menu": "latest",
    "@radix-ui/react-label": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-separator": "latest",
    "@radix-ui/react-slot": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-avatar": "latest",
    "@radix-ui/react-scroll-area": "latest",
    "@tanstack/react-query": "5.x",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "lucide-react": "latest",
    "zod": "latest",
    "@prisma/client": "5.x",
    "next-auth": "4.x",
    "bcryptjs": "latest",
    "ai": "latest",
    "@supabase/supabase-js": "latest",
    "socket.io": "4.x",
    "@dnd-kit/core": "latest",
    "@dnd-kit/sortable": "latest",
    "@dnd-kit/utilities": "latest",
    "next-pwa": "latest",
    "@upstash/ratelimit": "latest",
    "@upstash/redis": "latest"
  }
}
```

---

## 4. Gestão de Assets

### Arquitetura de Storage

| Tipo de Asset | Storage | Acesso |
|---------------|---------|--------|
| Uploads do usuário (imagens/vídeos) | Supabase Storage bucket `media` | URLs públicas |
| Assets estáticos (ícones, logos) | Pasta `public/` | Serviço direto |
| Logos da marca | Supabase Storage + ref DB | URLs públicas |
| Thumbnails de templates | Supabase Storage | URLs públicas |

### Configuração Supabase Storage

```typescript
// src/lib/upload.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const BUCKET = 'media';

// Validação: MIME + magic bytes (pacote file-type)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
```

### Fluxo de Upload

```typescript
// 1. Cliente valida tipo/tamanho do arquivo
// 2. Upload para Supabase Storage
const { data, error } = await supabase.storage
  .from(BUCKET)
  .upload(`${userId}/${Date.now()}-${fileName}`, file, {
    contentType: file.type,
    upsert: false,
  });

// 3. Obter URL pública
const { data: { publicUrl } } = supabase.storage
  .from(BUCKET)
  .getPublicUrl(data.path);

// 4. Salvar registro Media no DB
await prisma.media.create({
  data: {
    url: publicUrl,
    type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
    size: file.size,
    width: metadata.width,
    height: metadata.height,
    duration: metadata.duration,
    postId: post.id,
  },
});
```

### Otimização de Assets

- **Imagens**: Conversão WebP recomendada (ainda não implementada)
- **Vídeos**: Sem transcodificação (armazenados como enviados)
- **CDN**: CDN Supabase serve assets automaticamente
- **Cache**: PWA usa estratégia `CacheFirst` para imagens Supabase

### Regras de Importação de Assets Figma

Ao importar do Figma via MCP:
1. **Baixar todos assets estáticos** via resposta `get_design_context`
2. **Upload para Supabase Storage** usando ferramenta `upload_assets`
3. **Referenciar URLs locais** no código - nunca usar URLs temporárias Figma
4. **Preservar dimensões SVG** - não sobrescrever width/height raiz
5. **Usar posições exatas** do design para posicionamento de assets

---

## 5. Sistema de Ícones

### Biblioteca de Ícones

**Principal**: `lucide-react` (tree-shakeable, componentes React)

### Padrão de Uso

```tsx
import { 
  LayoutDashboard, 
  FileText, 
  Images, 
  LayoutGrid, 
  Palette, 
  Settings,
  LogOut,
  User,
  Bell,
  Menu,
  X,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Image,
  Video,
  Calendar,
  Clock,
  Check,
  X as XIcon,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Search,
  Filter,
  Tag,
  Hash,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

// Uso em componentes
<LayoutDashboard className="h-5 w-5" aria-hidden="true" />
<Bell className="h-5 w-5" />
<Plus className="h-4 w-4" />
```

### Convenções de Tamanho

| Contexto | Tamanho | Classe |
|----------|---------|--------|
| Sidebar navegação | 20px | `h-5 w-5` |
| Ações header | 20px | `h-5 w-5` |
| Ícones botão | 16px | `h-4 w-4` |
| Ícones inline texto | 14px | `h-3.5 w-3.5` |
| Estados vazios | 48-64px | `h-12 w-12` a `h-16 w-16` |

### Mapeamento de Ícones Figma

Ao sincronizar do Figma:
- Mapear componentes ícone Figma → equivalentes `lucide-react` por nome
- Para ícones customizados não no Lucide: exportar como SVG, colocar em `public/icons/`, importar como componente React
- Usar `aria-hidden="true"` em ícones decorativos
- Fornecer labels acessíveis via elemento pai ou `aria-label`

---

## 6. Abordagem de Estilização

### Metodologia CSS

**Primária**: Tailwind CSS utility-first com variáveis CSS para theming

**Padrões**:
- Utilitário `cn()` para merge condicional de classes (`clsx` + `tailwind-merge`)
- Variáveis CSS para cores semânticas (habilita dark mode + theming marca)
- Variantes de componente via `class-variance-authority` (cva)
- Sem CSS Modules, sem Styled Components, sem inline styles (exceto valores dinâmicos)

### Função Utilitária

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Estilos Globais

```css
/* src/app/globals.css - Padrões principais */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer utilities {
  /* Utilitários customizados para sistema de marca */
  .text-balance {
    text-wrap: balance;
  }
}
```

### Design Responsivo

**Breakpoints** (padrão Tailwind):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Padrões Usados**:
- Mobile-first: estilos base + overrides `lg:` / `xl:`
- Sidebar: `lg:pl-64` (oculto no mobile, overlay via estado)
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Calendário: Mês (desktop) → Lista (mobile)

### Dark Mode

```typescript
// tailwind.config.ts
darkMode: 'class'  // Controlado via <html class="dark">

// Uso em componentes
<div className="bg-background text-foreground">
  <Card className="bg-card border-border">
    <Button variant="default">Usa variável CSS --primary</Button>
  </Card>
</div>
```

### Integração Theming Marca

```typescript
// Aplicando cores da marca do DB para variáveis CSS
// Em brand/page.tsx - ao salvar:
const root = document.documentElement;
root.style.setProperty('--primary', `hsl(${brand.colors.primary})`);
root.style.setProperty('--secondary', `hsl(${brand.colors.secondary})`);
// ... etc para todas 10 cores

// Fontes
root.style.setProperty('--font-heading', `"${brand.fonts.heading}", sans-serif`);
root.style.setProperty('--font-body', `"${brand.fonts.body}", sans-serif`);
```

---

## 7. Estrutura do Projeto

### Organização Geral

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group: sem sidebar
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Route group: protegido, com sidebar
│   │   ├── layout.tsx            # Sidebar + Header + NotificationBell
│   │   ├── calendar/page.tsx     # View calendário (mês/semana/lista)
│   │   ├── posts/
│   │   │   ├── [id]/page.tsx     # Editor de post
│   │   │   └── new/page.tsx      # Novo post
│   │   ├── gallery/page.tsx      # Galeria de mídia
│   │   ├── templates/page.tsx    # Gestão templates + builder
│   │   ├── brand/page.tsx        # Identidade visual (cores, fontes, logos)
│   │   ├── settings/
│   │   │   ├── ai/page.tsx       # Config IA + presets
│   │   │   └── account/page.tsx  # Config conta
│   │   └── notifications/page.tsx
│   ├── api/                      # API Routes
│   │   ├── auth/[...nextauth]/   # NextAuth
│   │   ├── posts/                # CRUD posts
│   │   ├── posts/[id]/           # Ops post único
│   │   ├── media/                # Upload/list mídia
│   │   ├── templates/            # CRUD templates
│   │   ├── brand/                # Brand identity singleton
│   │   ├── ai/                   # Geração IA
│   │   ├── ai/presets/           # CRUD presets IA
│   │   ├── notifications/        # CRUD notificações
│   │   └── user/                 # Perfil/senha usuário
│   ├── globals.css               # Estilos globais + variáveis CSS
│   ├── layout.tsx                # Root layout + SessionProvider
│   └── page.tsx                  # Redireciona para /calendar
├── components/
│   ├── ui/                       # Primitivos estilo shadcn (22 componentes)
│   ├── calendar/                 # Componentes específicos calendário
│   ├── editor/                   # Componentes editor post
│   ├── brand/                    # Componentes gestão marca
│   ├── templates/                # Componentes templates
│   ├── notifications/            # Componentes notificações
│   └── realtime/                 # Colaboração real-time
├── hooks/                        # Custom React hooks (TanStack Query)
│   ├── usePosts.ts
│   ├── useMedia.ts
│   ├── useCalendar.ts
│   ├── useNotifications.ts
│   └── useRealtime.ts
├── lib/                          # Utilitários & configuração
│   ├── prisma.ts                 # Prisma singleton
│   ├── auth.ts                   # Config NextAuth
│   ├── ai.ts                     # Helpers Vercel AI SDK
│   ├── upload.ts                 # Supabase Storage
│   ├── socket.ts                 # Cliente Socket.io
│   ├── notifications.ts          # Helpers notificações
│   ├── utils.ts                  # cn(), formatters
│   ├── ratelimit.ts              # Upstash Redis
│   └── validations/              # Schemas Zod
│       ├── post.ts
│       ├── media.ts
│       ├── template.ts
│       ├── brand.ts
│       └── ai.ts
└── types/
    └── index.ts                  # Todas interfaces TypeScript
```

### Padrão de Organização por Feature

Cada feature segue esta estrutura:
```
feature/
├── components/       # Componentes específicos da feature
├── hooks/            # Hooks específicos da feature
├── validations/      # Schemas Zod
└── page.tsx          # Página rota (se aplicável)
```

### Padrão de Acesso ao Banco

```typescript
// src/lib/prisma.ts - Padrão Singleton
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Padrão de API Route

```typescript
// src/app/api/posts/route.ts
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPostSchema } from '@/lib/validations/post';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await req.json();
  const validated = createPostSchema.parse(body);

  const post = await prisma.post.create({
    data: { ...validated, authorId: session.user.id },
  });

  return Response.json(post);
}
```

### Padrão de Busca de Dados (TanStack Query)

```typescript
// src/hooks/usePosts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function usePosts(filters: PostFilters) {
  return useQuery({
    queryKey: ['posts', filters],
    queryFn: () => fetch('/api/posts?' + new URLSearchParams(filters)).then(r => r.json()),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => fetch('/api/posts', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
}
```

---

## Fluxo de Integração Figma MCP

### 1. Design → Código (get_design_context)

```typescript
// skillNames obrigatórios para logging
const skillNames = 'resource:figma-design-to-code,resource:figma-use';

// Chamar com nodeId e fileKey da URL Figma
const context = await get_design_context({
  fileKey: 'FIGMA_FILE_KEY',
  nodeId: 'NODE_ID',
  clientLanguages: 'typescript,react',
  clientFrameworks: 'nextjs,tailwind,radix-ui',
  skillNames,
});

// Retorna: string código, URLs assets, screenshot para verificação
```

### 2. Código → Design (use_figma)

```typescript
// Criar/atualizar componentes Figma do código
await use_figma({
  fileKey: 'FIGMA_FILE_KEY',
  code: `
    // Código Figma Plugin API
    const frame = figma.createFrame();
    frame.name = "PostCard";
    // ... construir componente dos padrões código
  `,
  description: 'Sincronizar componente PostCard do codebase',
  skillNames: 'resource:figma-use,resource:figma-generate-design',
});
```

### 3. Mapeamento Code Connect

Mapear componentes Figma para componentes código:

```typescript
await add_code_connect_map({
  fileKey: 'FIGMA_FILE_KEY',
  nodeId: 'COMPONENT_NODE_ID',
  source: 'src/components/ui/Button.tsx',
  componentName: 'Button',
  label: 'React',
});
```

### 4. Sincronismo Design System

**Tokens**: Enviar BrandIdentity do DB → Variáveis Figma
**Componentes**: Enviar primitivos ui/ → Biblioteca Componentes Figma
**Templates**: Sincronizar saída TemplateBuilder → Componentes Figma

---

## Regras-Chave de Integração

### FAÇA ✅
- Usar `get_design_context` com screenshot para verificação visual
- Mapear tokens semânticos (não valores brutos) via variáveis CSS
- Reutilizar componentes Radix UI existentes via Code Connect
- Baixar todos assets via resposta `get_design_context`
- Upload assets para Supabase Storage, referenciar URLs locais
- Usar utilitário `cn()` para composição de classes
- Seguir padrões responsivos mobile-first
- Usar TanStack Query para busca de dados

### NÃO FAÇA ❌
- Hardcodear valores de cor (usar `--primary`, `--background`, etc.)
- Criar novos primitivos UI quando equivalentes Radix/shadcn existem
- Usar inline styles para valores estáticos
- Referenciar URLs temporárias Figma assets no código
- Sobrescrever atributos width/height raiz SVG
- Pular carregamento fonte antes de mutações texto no Figma
- Usar `figma.currentPage` (usar `await figma.setCurrentPageAsync()`)
- Esquecer de retornar IDs nodes criados/mutados do `use_figma`

---

## Variáveis de Ambiente Necessárias

```env
# Figma MCP
FIGMA_ACCESS_TOKEN=figd_xxx...

# Database (Turso)
DATABASE_URL=libsql://xxx.turso.io
DATABASE_AUTH_TOKEN=xxx

# Auth
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
SUPABASE_BUCKET=media

# IA
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

---

## Checklist de Verificação

Após integração Figma → Código:
- [ ] Todas cores semânticas mapeiam para variáveis CSS
- [ ] Tipografia usa Google Fonts via variáveis CSS
- [ ] Componentes reutilizam primitivos Radix UI
- [ ] Assets baixados e enviados para Supabase
- [ ] Breakpoints responsivos matcham design
- [ ] Dark mode funciona via prefixo `dark:`
- [ ] Theming marca aplica via injeção variáveis CSS
- [ ] Mapeamentos Code Connect criados para componentes reutilizáveis
- [ ] Atributos acessibilidade preservados (aria-*, roles)

Após sincronismo Código → Figma:
- [ ] Variantes componente matcham definições cva código
- [ ] Auto-layout usado para containers responsivos
- [ ] Variáveis vinculadas a tokens design Figma
- [ ] Descrições componentes definidas para documentação
- [ ] Assets referenciam URLs Supabase corretas