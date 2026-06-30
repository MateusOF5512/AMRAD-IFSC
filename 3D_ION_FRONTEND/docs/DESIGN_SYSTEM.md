# AMRAD — Design System

Sistema visual unificado da plataforma AMRAD. Objetivo: interface moderna, simples e direta — uma linguagem só em todas as telas.

---

## Princípios

1. **Clareza científica** — dados e formulários em primeiro plano; decoração mínima.
2. **Consistência** — mesmas cores, tipografia e espaçamento em todo o app.
3. **Leveza** — Tailwind + CSS variables; sem biblioteca de UI pesada.
4. **Acessibilidade** — contraste WCAG AA, foco visível, `prefers-reduced-motion`.

---

## Tipografia

### Fonte

| Papel | Família | Origem |
|-------|---------|--------|
| Sans (corpo + UI) | **Inter** | `next/font/google` → `--font-inter` |
| Mono (dados/código) | `ui-monospace, monospace` | sistema |

```tsx
// app/layout.tsx — já configurado
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
```

### Escala tipográfica

| Token | Classe Tailwind | Tamanho | Peso | Uso |
|-------|-----------------|---------|------|-----|
| `display` | `text-4xl font-bold tracking-tight` | 36px | 700 | Hero, landing |
| `h1` | `text-3xl font-bold text-foreground` | 30px | 700 | Título de página |
| `h2` | `text-2xl font-semibold text-foreground` | 24px | 600 | Seção principal |
| `h3` | `text-lg font-semibold text-foreground` | 18px | 600 | Card, subseção |
| `body` | `text-base text-foreground` | 16px | 400 | Texto padrão |
| `body-sm` | `text-sm text-muted` | 14px | 400 | Labels, descrições |
| `caption` | `text-xs text-muted` | 12px | 400 | Metadados, hints |
| `label` | `text-sm font-medium text-foreground` | 14px | 500 | Labels de formulário |

### Regras

- Títulos: `text-foreground` (slate-900).
- Texto secundário: `text-muted` (slate-500).
- Links: `text-primary hover:text-primary-hover`.
- Não misturar `gray-*` com `slate-*` — usar **slate** para neutros.

---

## Cores

### Paleta semântica (CSS variables)

| Token | Hex | Classe Tailwind | Uso |
|-------|-----|-----------------|-----|
| `--ion-primary` | `#16a34a` | `primary` / `green-600` | Marca, CTAs, nav ativa |
| `--ion-primary-hover` | `#15803d` | `primary-hover` | Hover de botões/links |
| `--ion-primary-light` | `#f0fdf4` | `primary-light` | Fundos suaves |
| `--ion-primary-muted` | `#dcfce7` | `primary-muted` | Badges, highlights |
| `--ion-admin` | `#ea580c` | `admin` / `orange-600` | Área administrativa |
| `--ion-admin-hover` | `#c2410c` | `admin-hover` | Hover admin |
| `--ion-admin-light` | `#fff7ed` | `admin-light` | Fundo admin |
| `--ion-foreground` | `#0f172a` | `foreground` | Texto principal |
| `--ion-muted` | `#64748b` | `muted` | Texto secundário |
| `--ion-background` | `#f8fafc` | `background` | Fundo de página |
| `--ion-surface` | `#ffffff` | `surface` | Cards, modais |
| `--ion-border` | `#e2e8f0` | `border` | Bordas padrão |
| `--ion-danger` | `#dc2626` | `danger` | Erros, logout, exclusão |
| `--ion-warning` | `#d97706` | `warning` | Avisos |
| `--ion-info` | `#2563eb` | `info` | Em progresso, info |

### Estados de feedback

| Estado | Fundo | Borda | Texto |
|--------|-------|-------|-------|
| Sucesso | `bg-primary-light` | `border-primary/30` | `text-primary` |
| Erro | `bg-red-50` | `border-red-200` | `text-red-700` |
| Aviso | `bg-amber-50` | `border-amber-200` | `text-amber-800` |
| Info | `bg-blue-50` | `border-blue-200` | `text-blue-800` |
| Pendente | `bg-slate-50` | `border-border` | `text-muted` |

### Regra de cor por contexto

- **Geral / pesquisador** → verde (`primary`)
- **Admin** → laranja (`admin`) — única exceção intencional
- **Não usar** arco-íris (blue/purple/amber por card) na mesma tela — variar só intensidade do verde ou neutros

---

## Espaçamento e layout

### Container

```
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```

Páginas com formulário estreito: `max-w-4xl` ou `max-w-md` (auth).

### Escala de espaçamento (Tailwind padrão)

| Uso | Classe |
|-----|--------|
| Gap entre campos | `space-y-4` |
| Padding de card | `p-6` |
| Padding de página | `py-8` |
| Gap entre seções | `mb-8` / `gap-8` |

### Grid comum

- Stats/cards: `grid grid-cols-1 sm:grid-cols-3 gap-6`
- Settings: `flex flex-col md:flex-row gap-8`

---

## Bordas e sombras

| Elemento | Radius | Sombra |
|----------|--------|--------|
| Botão | `rounded-lg` | — |
| Input | `rounded-lg` | — |
| Card | `rounded-xl` | `shadow-sm` |
| Card elevado | `rounded-xl` | `shadow-md` |
| Modal | `rounded-xl` | `shadow-lg` |
| Badge | `rounded-md` | — |

Borda padrão: `border border-border`.

---

## Componentes base

Local: `src/components/ui/`

| Componente | Variantes | Uso |
|------------|-----------|-----|
| `Button` | `primary`, `secondary`, `outline`, `ghost`, `danger`, `admin` | Todas as ações |
| `Card` | `default`, `elevated` | Containers de conteúdo |
| `Input` | — | Campos de texto (com `label`, `error`) |
| `Badge` | `default`, `success`, `warning`, `danger`, `info`, `admin` | Status, tags |
| `Alert` | `info`, `success`, `warning`, `danger` | Mensagens de feedback |
| `PageHeader` | — | Título + descrição de página |

### Botões — referência rápida

```tsx
<Button variant="primary">Salvar</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="danger">Excluir</Button>
<Button variant="admin">Ação admin</Button>
<Button size="sm">Pequeno</Button>
```

### Inputs — referência rápida

```tsx
<Input label="Nome" placeholder="..." />
<Input label="Email" type="email" error="Campo obrigatório" />
```

Classes utilitárias para inputs legados (sem componente):

```
w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface
focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
```

---

## Navegação

### Header

- Fundo: `bg-surface border-b border-border shadow-sm`
- Link ativo (geral): `text-primary font-semibold border-b-2 border-primary`
- Link ativo (admin): `text-admin font-semibold border-b-2 border-admin`
- CTA registrar: `Button variant="primary"`

### Footer

- Fundo: `bg-primary text-white`
- Links: `text-primary-light hover:text-white`

---

## Formulários (wizard de experimentos)

### SectionCard — status

| Status | Visual |
|--------|--------|
| `pending` | `bg-slate-50 border-border` |
| `in-progress` | `bg-blue-50 border-blue-200` |
| `completed` | `bg-primary-light border-primary/30` |
| `error` | `bg-red-50 border-red-200` |

### Botão de submit do wizard

- Ativo: `Button variant="primary" size="lg"` (full width)
- Desabilitado: `bg-slate-100 text-muted cursor-not-allowed`

---

## Ícones

Biblioteca: **lucide-react** (já instalada).

| Tamanho | Classe |
|---------|--------|
| Inline | `h-4 w-4` |
| Botão | `h-5 w-5` |
| Destaque | `h-6 w-6` |

Cor: herdar do texto pai ou `text-primary` / `text-muted`.

---

## Motion

- Transições: `transition-colors duration-150` (padrão)
- Hover scale: só no hero CTA (`hover:scale-105`) — não replicar em formulários
- Loading: `Loader2` com `animate-spin text-primary`
- Respeitar: `@media (prefers-reduced-motion: reduce)` — animações desligadas em `globals.css`

---

## Gráficos (Recharts)

Cores de série — paleta fixa derivada da marca:

```
#16a34a  primary
#2563eb  info
#d97706  warning
#7c3aed  violet (só 4ª série+)
#dc2626  danger
```

---

## Checklist para novas telas

- [ ] Fundo `bg-background`, conteúdo em `Card` ou `bg-surface`
- [ ] Título com `PageHeader` ou classes `h1`
- [ ] Botões via `<Button>` — não classes soltas
- [ ] Inputs via `<Input>` ou classes utilitárias documentadas
- [ ] Neutros em `slate`, não `gray`
- [ ] Admin usa `admin` (laranja), resto usa `primary` (verde)
- [ ] Sem gradientes coloridos em cards de stats — usar `primary-light` + borda sutil

---

## Arquivos de referência

| Arquivo | Responsabilidade |
|---------|------------------|
| `app/globals.css` | Tokens CSS + `@theme` Tailwind v4 |
| `app/layout.tsx` | Fonte Inter + estrutura global |
| `src/lib/cn.ts` | Merge de classes |
| `src/components/ui/*` | Primitivos reutilizáveis |
| `src/components/layout/Header.tsx` | Nav padrão |
| `src/components/layout/Footer.tsx` | Rodapé padrão |

---

*Última atualização: junho 2026 — v1.0*
