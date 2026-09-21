# HUY AI DIGITAL ECOSYSTEM — V2 DESIGN TOKENS SPECIFICATION

## 1. Overview & Machine-Readable Origin

The design tokens defined in this document serve as the single source of truth for all styling, layout, typography, and motion across the **HUY TECHNOLOGY AI GROUP** ecosystem.

- **Primary Token Source:** [`config/ui/v2/design-tokens.json`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/config/ui/v2/design-tokens.json)
- **Organization Brand Tokens:** [`config/ui/v2/organization-brand-tokens.json`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/config/ui/v2/organization-brand-tokens.json)
- **Architecture Philosophy:** Semantic token abstraction decoupling design decisions from CSS class hardcoding.

---

## 2. Color Tokens

### 2.1 Dark Mode Semantic Palette (Default)

```css
:root {
  /* Canvas & Backgrounds */
  --color-bg-primary: #070B14;       /* Deep near-black obsidian navy */
  --color-bg-secondary: #0A1124;     /* Deep navy section divider */
  --color-bg-tertiary: #0F1A36;      /* Subtle elevated section */
  --color-bg-canvas: #04070D;        /* Underlay bedrock */

  /* Surfaces & Glassmorphism */
  --color-surface-primary: #0F172A;  /* Base card / modal container */
  --color-surface-secondary: #1E293B;/* Elevated card / hover state */
  --color-surface-elevated: #1E293BCC; /* Dropdowns, popovers */
  --color-surface-glass: rgba(15, 23, 42, 0.65); /* Translucent backdrop blur */
  --color-surface-glass-border: rgba(255, 255, 255, 0.08);
  --color-surface-glass-border-hover: rgba(0, 229, 255, 0.3);

  /* Typography */
  --color-text-primary: #FFFFFF;     /* High-emphasis body and headers */
  --color-text-secondary: #94A3B8;   /* Medium-emphasis descriptions */
  --color-text-muted: #64748B;       /* Low-emphasis captions, timestamps */
  --color-text-inverse: #070B14;     /* Text on high-contrast accent buttons */
  --color-text-accent: #00E5FF;      /* Interactive links, highlighted words */

  /* Borders & Dividers */
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-medium: rgba(255, 255, 255, 0.16);
  --color-border-strong: rgba(255, 255, 255, 0.24);
  --color-border-focus: #00E5FF;

  /* Brand Accents */
  --color-brand-primary: #00E5FF;    /* Electric Cyan */
  --color-brand-primary-hover: #33EBFF;
  --color-brand-secondary: #0070F3;  /* Deep Tech Blue */
  --color-brand-secondary-hover: #1E86FF;
  --color-brand-glow: rgba(0, 229, 255, 0.35);

  /* Semantic Alerts */
  --color-semantic-success: #10B981;
  --color-semantic-warning: #F59E0B;
  --color-semantic-error: #EF4444;
  --color-semantic-info: #3B82F6;
}
```

### 2.2 Light Mode Semantic Palette (Compatible Fallback)

```css
:root.light {
  --color-bg-primary: #F8FAFC;
  --color-bg-secondary: #F1F5F9;
  --color-bg-tertiary: #E2E8F0;
  --color-bg-canvas: #FFFFFF;

  --color-surface-primary: #FFFFFF;
  --color-surface-secondary: #F8FAFC;
  --color-surface-elevated: #FFFFFFEE;
  --color-surface-glass: rgba(255, 255, 255, 0.85);
  --color-surface-glass-border: rgba(0, 0, 0, 0.08);
  --color-surface-glass-border-hover: rgba(0, 112, 243, 0.3);

  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #94A3B8;
  --color-text-inverse: #FFFFFF;
  --color-text-accent: #0284C7;

  --color-border-subtle: rgba(0, 0, 0, 0.08);
  --color-border-medium: rgba(0, 0, 0, 0.16);
  --color-border-strong: rgba(0, 0, 0, 0.24);
  --color-border-focus: #0284C7;
}
```

---

## 3. Typography Tokens

| Token | CSS Variable | Value | Purpose |
| :--- | :--- | :--- | :--- |
| **Display Font** | `--font-family-display` | `'Space Grotesk', 'Sora', sans-serif` | H1, H2, Hero titles, prominent brand metrics |
| **Body Font** | `--font-family-body` | `'Plus Jakarta Sans', 'Inter', sans-serif` | Paragraphs, descriptions, form labels, UI buttons |
| **Monospace** | `--font-family-mono` | `'JetBrains Mono', monospace` | Code snippets, HAIP IDs, risk badges, timestamps |

### 3.1 Font Size & Line Height Scale

```css
--font-size-xs:   0.75rem;    /* 12px | Line-height: 1.15 */
--font-size-sm:   0.875rem;   /* 14px | Line-height: 1.3  */
--font-size-base: 1rem;       /* 16px | Line-height: 1.5  */
--font-size-lg:   1.125rem;   /* 18px | Line-height: 1.5  */
--font-size-xl:   1.25rem;    /* 20px | Line-height: 1.4  */
--font-size-2xl:  1.5rem;     /* 24px | Line-height: 1.3  */
--font-size-3xl:  1.875rem;   /* 30px | Line-height: 1.25 */
--font-size-4xl:  2.25rem;    /* 36px | Line-height: 1.2  */
--font-size-5xl:  3rem;       /* 48px | Line-height: 1.15 */
--font-size-6xl:  3.75rem;    /* 60px | Line-height: 1.1  */
--font-size-7xl:  4.5rem;     /* 72px | Line-height: 1.05 */
```

---

## 4. Spacing & Radius Tokens

### 4.1 4px Base Grid Spacing

```css
--space-1: 4px;    --space-5: 20px;   --space-16: 64px;
--space-2: 8px;    --space-6: 24px;   --space-20: 80px;
--space-3: 12px;   --space-8: 32px;   --space-24: 96px;
--space-4: 16px;   --space-10: 40px;  --space-32: 128px;
--space-12: 48px;
```

### 4.2 Border Radii

```css
--radius-none: 0px;
--radius-sm: 4px;     /* Subtle tags, pills */
--radius-md: 8px;     /* Form inputs, small buttons */
--radius-lg: 12px;    /* Cards, dropdowns */
--radius-xl: 16px;    /* Feature panels, modals */
--radius-2xl: 24px;   /* Hero containers, ecosystem nodes */
--radius-3xl: 32px;   /* Signature flagship cards */
--radius-full: 9999px;/* Pill badges, circular avatar frames */
```

---

## 5. Elevation, Shadows & Glow Tokens

```css
--elevation-0: none;
--elevation-1: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3);
--elevation-2: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4);
--elevation-3: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5);
--elevation-4: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6);

/* Ambient Glows */
--glow-primary: 0 0 20px rgba(0, 229, 255, 0.25);
--glow-primary-strong: 0 0 35px rgba(0, 229, 255, 0.45);
```

---

## 6. Layout Breakpoints & Containers

```css
--breakpoint-mobile:  390px;
--breakpoint-tablet:  768px;
--breakpoint-laptop:  1280px;
--breakpoint-desktop: 1440px;

--container-max-w-sm: 640px;
--container-max-w-md: 768px;
--container-max-w-lg: 1024px;
--container-max-w-xl: 1280px;
--container-max-w-2xl: 1440px;
```

---

## 7. Motion & Transitions

```css
--duration-instant: 100ms;
--duration-fast: 200ms;
--duration-normal: 350ms;
--duration-slow: 500ms;
--duration-reveal: 700ms;

--easing-ease-out: cubic-bezier(0, 0, 0.2, 1);
--easing-spring: cubic-bezier(0.16, 1, 0.3, 1);
```

All animations MUST strictly observe `@media (prefers-reduced-motion: reduce)` by falling back to instantaneous opacity shifts.
