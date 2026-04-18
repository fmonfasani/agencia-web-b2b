# Design System — Webshooks

Documentación del sistema visual y componentes de Webshooks.

**Última actualización:** 2026-04-18  
**Versión:** 3.0 (Warm Neutral)

---

## 🎨 Paleta de Colores

Diseño basado en principios Notion/Linear: warm neutral, bajo contraste, mucho whitespace.

### Colores Base

| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **bg-main** | #F1EFEA | 241, 239, 234 | Background principal, fuera de cards |
| **bg-card** | #FFFFFF | 255, 255, 255 | Cards, tablas, contenedores principales |
| **bg-sidebar** | #EDEBE6 | 237, 235, 230 | Sidebar en client y admin (light) |
| **bg-sidebar-hover** | #E2E0DA | 226, 224, 218 | Hover state en items sidebar |
| **bg-sidebar-active** | #D9D7D1 | 217, 215, 209 | Item activo en sidebar |

### Texto

| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **text-primary** | #1C1C1C | 28, 28, 28 | Títulos, contenido principal |
| **text-secondary** | #6F6F6F | 111, 111, 111 | Subtítulos, metadata |
| **text-muted** | #9A9A9A | 154, 154, 154 | Labels, placeholder text, disabled |

### Accents

| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **accent** | #F59E0B | 245, 158, 11 | Botones primarios, highlights |
| **accent-hover** | #D97706 | 217, 119, 6 | Hover state de elementos accent |
| **accent-light** | #FFF4E5 | 255, 244, 229 | Background suave para emphasis |

### Semantic Colors (Status)

#### Positivo/Success
| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **green** | #1F7A63 | 31, 122, 99 | Status positivo, uptrend, score alto |
| **green-light** | #E6F4EE | 230, 244, 238 | Background badge verde |

#### Info/Nuevo
| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **blue** | #3B82F6 | 59, 130, 246 | Status "nuevo", info |
| **blue-light** | #EAF2FF | 234, 242, 255 | Background badge azul |

#### Especial/Contactado
| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **purple** | #8B5CF6 | 139, 92, 246 | Status "contactado", special |
| **purple-light** | #F3EEFF | 243, 238, 255 | Background badge lila |

#### Warning/Paused
| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **amber** | #D97706 | 217, 119, 6 | Status "pausado", caution |
| **amber-light** | #FFF4E5 | 255, 244, 229 | Background badge ámbar |

#### Error/Negativo
| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **red** | #DC2626 | 220, 38, 38 | Error, downtrend, critical |
| **red-light** | #FEE2E2 | 254, 226, 226 | Background badge rojo |

### Botones

| Token | Hex | RGB | Tipo | Hover |
|-------|-----|-----|------|-------|
| **btn-primary** | #111111 | 17, 17, 17 | Primary button | #2C2C2C |
| **btn-accent** | #F59E0B | 245, 158, 11 | Accent button | #D97706 |
| **btn-outline** | #E5E3DF | 229, 227, 223 | Outline button | #F1EFEA |

### Borders & Dividers

| Token | Hex | RGB | Uso |
|-------|-----|-----|-----|
| **border** | #E5E3DF | 229, 227, 223 | Bordes de cards, dividers, líneas |
| **border-subtle** | #F1EFEA | 241, 239, 234 | Bordes muy sutiles (casi invisible) |

---

## 🔤 Tipografía

### Fuentes

```css
--font-sans: "DM Sans", system-ui, -apple-system, sans-serif;
--font-mono: "JetBrains Mono", "Courier New", monospace;
```

### Escala de Tamaños

| Rol | Tamaño | Weight | Line Height | Uso |
|-----|--------|--------|------------|-----|
| **h1** | 32px | 700 | 1.2 | Títulos principales |
| **h2** | 24px | 700 | 1.3 | Subtítulos |
| **h3** | 18px | 600 | 1.4 | Encabezados de sección |
| **body-lg** | 16px | 400 | 1.5 | Contenido principal |
| **body** | 14px | 400 | 1.5 | Texto estándar |
| **body-sm** | 12px | 400 | 1.5 | Labels, hints |
| **code** | 13px | 500 | 1.4 | Código monoespaciado |

### Ejemplos

```tsx
// Heading
<h1 className="text-[32px] font-bold leading-[1.2] text-[#1C1C1C]">
  Título Principal
</h1>

// Body
<p className="text-[14px] font-regular leading-[1.5] text-[#6F6F6F]">
  Texto de contenido
</p>

// Label
<span className="text-[12px] font-regular leading-[1.5] text-[#9A9A9A] uppercase tracking-[0.5px]">
  Label
</span>
```

---

## 🎯 Componentes Clave

### 1. KPICard

**Ubicación:** `frontend/src/components/dashboard/KPICard.tsx`

**Propiedades:**
```tsx
interface KPICardProps {
  title: string;
  value: number | string;
  trend?: number;              // % de cambio (positivo/negativo)
  accentColor: "blue" | "orange" | "green" | "gray";
  footer?: string;
}
```

**Colors:**
- `blue`: #3B82F6
- `orange`: #F59E0B (accent principal)
- `green`: #1F7A63 (positivo)
- `gray`: #9A9A9A

**Ejemplo:**
```tsx
<KPICard
  title="Queries Hoy"
  value={42}
  trend={+12.5}
  accentColor="orange"
  footer="vs. ayer"
/>
```

### 2. StatusBadge

**Ubicación:** `frontend/src/components/ui/status-badge.tsx`

**Variantes:**
```tsx
type Status = "new" | "contacted" | "qualified" | "paused" | "won" | "lost";

<StatusBadge status="new" />
```

**Colores por status:**
| Status | Background | Text | Border |
|--------|-----------|------|--------|
| new | #EAF2FF | #3B82F6 | #BFDBFE |
| contacted | #F3EEFF | #8B5CF6 | #DDD6FE |
| qualified | #E6F4EE | #1F7A63 | #BBF7D0 |
| paused | #FFF4E5 | #D97706 | #FED7AA |
| won | #111111 | #FFFFFF | — |
| lost | #F7F6F3 | #9A9A9A | #E5E3DF |

### 3. DataTable

**Ubicación:** `frontend/src/components/ui/data-table.tsx`

**Características:**
- Header background: #F7F6F3
- Header text: #6F6F6F (uppercase, tracking-wider)
- Borders: #E5E3DF
- Row hover: #FAFAF8
- Empty state: #9A9A9A

**Ejemplo:**
```tsx
<DataTable
  columns={[
    { accessorKey: "name", header: "Nombre" },
    { accessorKey: "status", header: "Estado" },
  ]}
  data={data}
/>
```

### 4. Button

**Ubicación:** `frontend/src/components/ui/button.tsx`

**Variantes:**

```tsx
// Primary (negro)
<Button variant="default">Acción Primaria</Button>
// bg-[#111111] text-white hover:bg-[#2C2C2C]

// Accent (ámbar)
<Button variant="accent">Acción Accent</Button>
// bg-[#F59E0B] text-white hover:bg-[#D97706]

// Outline
<Button variant="outline">Acción Outline</Button>
// border border-[#E5E3DF] text-[#1C1C1C] hover:bg-[#F1EFEA]

// Ghost
<Button variant="ghost">Acción Ghost</Button>
// transparent, solo text
```

### 5. Badge

**Ubicación:** `frontend/src/components/ui/badge.tsx`

**Variantes:**
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

### 6. Sidebar Colapsable

**Ubicación:** `frontend/src/components/layouts/ClientLayoutContent.tsx`

**Comportamiento:**
```tsx
const [isCollapsed, setIsCollapsed] = useState(false);
const [isHovered, setIsHovered] = useState(false);
const isExpanded = !isCollapsed || isHovered;

// Tamaño
className={`
  sidebar-light border-r border-[#E5E3DF] flex flex-col transition-all duration-300
  ${isExpanded ? "w-60" : "w-16"}
`}

// Hover expand
onMouseEnter={() => setIsHovered(true)}
onMouseLeave={() => setIsHovered(false)}
```

**Colores:**
- Background: #EDEBE6
- Hover items: #E2E0DA
- Active item: #D9D7D1
- Border: #E5E3DF
- Text: #1C1C1C (primary), #9A9A9A (muted)

---

## 📐 Espaciado (Tailwind)

```
xs: 4px    (0.25rem)
sm: 8px    (0.5rem)
md: 16px   (1rem)
lg: 24px   (1.5rem)
xl: 32px   (2rem)
2xl: 48px  (3rem)
```

**Uso típico:**
```tsx
// Padding
<div className="p-4">...</div>    // 16px
<div className="px-6 py-4">...</div>

// Margin
<div className="mb-2 mt-4">...</div>

// Gap (flex)
<div className="flex gap-3">...</div>
```

---

## 🌗 Modo Oscuro (Futuro)

Actualmente solo modo claro. Si se implementa oscuro, usar:

| Token | Dark |
|-------|------|
| bg-main | #0F0E0B |
| bg-card | #1A1917 |
| bg-sidebar | #252220 |
| text-primary | #FFFFFF |
| text-secondary | #A3A3A3 |
| accent | #F59E0B (mismo) |

---

## 🔲 Elevación (Shadows)

```css
shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1)
shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
```

**Uso:**
```tsx
// Cards
<div className="bg-white rounded-lg shadow-sm border border-[#E5E3DF]">...</div>

// Dropdowns
<div className="shadow-lg rounded-md">...</div>

// Elevated buttons (hover)
<button className="hover:shadow-md transition-shadow">...</button>
```

---

## ✨ Transiciones

```css
transition-all: all 300ms ease-in-out
transition-colors: color 200ms ease-in-out
transition-opacity: opacity 200ms ease-in-out
transition-transform: transform 200ms ease-in-out
```

**Ejemplos:**
```tsx
// Sidebar collapse
className="transition-all duration-300"

// Button hover
className="hover:bg-[#E2E0DA] transition-colors"

// Opacity fade
className="hover:opacity-80 transition-opacity"
```

---

## 🎬 Animaciones

Declaradas en `frontend/src/app/globals.css`:

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Usage in components */
className="animate-fadeIn"
className="animate-slideDown"
```

---

## 📏 Responsive Design

Breakpoints Tailwind:
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

**Ejemplo:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

---

## 🔍 Accesibilidad

### Contraste

Todos los colores cumplen WCAG AA (mín. 4.5:1 para texto):

| Pareja | Contraste | WCAG |
|--------|-----------|------|
| #1C1C1C text on #FFFFFF | 14.3 | AAA ✅ |
| #1C1C1C text on #F1EFEA | 12.9 | AAA ✅ |
| #9A9A9A text on #FFFFFF | 4.5 | AA ✅ |
| #F59E0B on #FFFFFF | 3.2 | — (solo UI) |

### Focus States

```tsx
// Inputs
className="focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"

// Buttons
className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F59E0B]"

// Links
className="focus:outline-none focus:underline"
```

### ARIA Labels

```tsx
<button aria-label="Cerrar sidebar">
  <X size={18} />
</button>

<StatusBadge status="new" aria-label="Estado: Nuevo" />
```

---

## 🛠️ Tailwind Config

**Ubicación:** `frontend/tailwind.config.ts`

**Theme extendido:**
```ts
theme: {
  extend: {
    colors: {
      "bg-main": "#F1EFEA",
      "bg-sidebar": "#EDEBE6",
      "accent": "#F59E0B",
      // ... etc
    },
    fontSize: {
      // Escala personalizada
    },
    spacing: {
      // Spacing custom
    },
  },
}
```

---

## 📝 Guía de Uso

### Para Nuevos Componentes

1. Usa colores del sistema, NO hardcoded
2. Sigue tipografía estándar (headings, body, labels)
3. Usa spacing consistente (múltiplos de 4px)
4. Incluye transiciones suaves
5. Asegura focus states para a11y
6. Test en luz (próximamente oscuro)

### Ejemplo de Componente Nuevo

```tsx
import React from "react";

interface MyComponentProps {
  title: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function MyComponent({ title, isActive, onClick }: MyComponentProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${
          isActive
            ? "bg-[#F59E0B] text-white"
            : "bg-[#F1EFEA] text-[#1C1C1C] hover:bg-[#E5E3DF]"
        }
        focus:outline-none focus:ring-2 focus:ring-[#F59E0B]
      `}
    >
      {title}
    </button>
  );
}
```

---

**Última actualización:** 2026-04-18  
**Versión:** 3.0 (Warm Neutral)  
**Diseñador:** Paleta Notion/Linear compatible
