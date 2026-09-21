# HUY AI DIGITAL ECOSYSTEM — V2 RESPONSIVE SYSTEM SPECIFICATION

## 1. Responsive Philosophy & Viewport Targets

The **HUY TECHNOLOGY AI GROUP** web experience is engineered strictly **mobile-first**. 
- **Core Rule:** Every layout begins with a compact, touch-friendly 390px base, progressively enhancing as viewport width expands.
- **Zero Horizontal Scroll:** `overflow-x: hidden` is enforced on `<html>` and `<body>` with zero elements permitted to break viewport bounds.

---

## 2. Canonical Breakpoints Matrix

| Breakpoint Tier | Target Width | Representative Devices | Layout Columns | Container Max-Width | Horizontal Page Padding |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mobile** | **`390px`** | iPhone 13/14/15, Galaxy S22 | 1 Column | 100% | `16px` (`px-4`) |
| **Tablet** | **`768px`** | iPad Mini, iPad Air, Galaxy Tab | 2 Columns | 720px | `24px` (`px-6`) |
| **Laptop** | **`1280px`** | MacBook Air, 13" Laptops | 3 - 4 Columns | 1200px | `32px` (`px-8`) |
| **Desktop** | **`1440px+`**| External 27"+ Monitors, iMac | 4 - 6 Columns | 1380px | `40px` (`px-10`) |

---

## 3. Major Component Responsive Adaptations

### 3.1 Hero Section
- **Desktop (>= 1280px):** 2-column layout (50% copy & dual CTAs / 50% interactive canvas). Height: `calc(100vh - 80px)`.
- **Tablet (768px - 1279px):** 2-column stacked with reduced canvas scale (400px height).
- **Mobile (< 768px):** Single column. Headline adjusts from `72px` down to `36px`. Dual CTAs become full-width stacked buttons (`w-full`). Ecosystem visual transforms into a streamlined preview card.

### 3.2 Ecosystem Map Component
- **Desktop (>= 1280px):** Full radial constellation diagram (diameter `640px`). Center node (`org-01-huytech`) connected via animated SVG SVG bezier curves to 5 orbiting BUs.
- **Tablet (768px - 1279px):** Scaled constellation (diameter `480px`) with touch tap selection.
- **Mobile (< 768px) Fallback:** The complex canvas/SVG radial graph is automatically replaced with an **Interactive Tabbed Card Stack**.
  - Users switch between the 6 organizations using horizontal swipeable pill tabs.
  - Each tab renders a high-contrast `OrganizationCard` optimized for single-thumb scrolling.

### 3.3 Top Navigation (`AppHeader`)
- **Desktop (>= 1024px):** Inline brand logo, 8 navigation links with hover mega-menus, search bar, language switcher, and primary CTA button.
- **Mobile (< 1024px):** Compact bar with Brand logo + Burger menu icon. Tapping opens `MobileNavigation` full-screen drawer with accordion sub-menus.

### 3.4 Metric Cards (Social Proof)
- **Desktop:** 4-column horizontal grid (`grid-cols-4`).
- **Tablet:** 2-column grid (`grid-cols-2`).
- **Mobile:** 2-column compact grid (`grid-cols-2 gap-3`), ensuring key numbers are visible without excessive scrolling.

### 3.5 Contact Form & Lead Generation
- **Desktop:** Split view: left side has office addresses, direct hotlines, and partner trust badges; right side has intent-driven interactive form.
- **Mobile:** Single column stacked layout. Input fields maintain minimum `48px` height for effortless virtual keyboard input.

---

## 4. Touch & Viewport Safeguards

1. **Touch Target Size:** All buttons, links, and form toggles must maintain a minimum bounding box of **`44px x 44px`** to adhere to WCAG mobile standards.
2. **Font Scaling:** Base font size never drops below `14px` (`0.875rem`) on mobile to prevent automatic iOS Safari zoom-in on input focus.
3. **Safe Area Insets:** CSS variables `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` are respected on fixed header and mobile floating widgets (Zalo, AI Chat).
