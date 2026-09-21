# HUY AI DIGITAL ECOSYSTEM — V2 COLOR SYSTEM SPECIFICATION

## 1. Design Philosophy & Atmosphere

The color system for **HUY TECHNOLOGY AI GROUP** creates a high-trust, cutting-edge enterprise aesthetic:
- **Atmosphere:** Deep obsidian navy foundation reminiscent of advanced AI control rooms, punctuated by precise, luminous cyan and brand accents.
- **Rules:**
  - No gaudy multi-color rainbow gradients across a single component.
  - Dark-first architecture with 100% WCAG 2.2 AA contrast compliance.
  - Zero hardcoded hex values in component files; all styling must use semantic tokens.

---

## 2. Base Dark Foundation Tokens

| Semantic Role | Token Name | Hex Code | Contrast vs Primary Text | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Bedrock** | `--color-bg-canvas` | `#04070D` | 19.8:1 (AAA) | Deep background behind main layout |
| **Primary Background** | `--color-bg-primary` | `#070B14` | 18.2:1 (AAA) | Default section background |
| **Secondary Background**| `--color-bg-secondary` | `#0A1124` | 16.4:1 (AAA) | Alternating section background |
| **Tertiary Background** | `--color-bg-tertiary` | `#0F1A36` | 13.9:1 (AAA) | Deep cards, footer containers |
| **Primary Surface** | `--color-surface-primary` | `#0F172A` | 14.2:1 (AAA) | Cards, panels, dialogue modals |
| **Elevated Surface** | `--color-surface-secondary`| `#1E293B` | 9.8:1 (AAA) | Dropdown menus, hovered cards |
| **Glass Backdrop** | `--color-surface-glass` | `rgba(15,23,42,0.65)` | N/A | Floating navigation bar, blur filter 16px |
| **Primary Text** | `--color-text-primary` | `#FFFFFF` | N/A | Headers, bold text, high-emphasis body |
| **Secondary Text** | `--color-text-secondary` | `#94A3B8` | 7.1:1 (AA) | Descriptions, subtitles, secondary metadata |
| **Muted Text** | `--color-text-muted` | `#64748B` | 4.6:1 (AA) | Timestamps, copyright notices, disabled states |

---

## 3. Six Business Unit Accent System

Each of the 6 canonical business units has an assigned chromatic identity. Components dynamically ingest these tokens to distinguish BU ownership while retaining ecosystem harmony.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ECOSYSTEM BRAND PALETTE                         │
├───────────────────────┬───────────────────────┬────────────────────────┤
│ org-01-huytech        │ org-02-aischool       │ org-03-smarttax        │
│ Cyan / Electric Blue  │ Emerald Green / Mint  │ Azure Blue / Restrained│
│ #00E5FF & #0070F3     │ #00FF85 & #10B981     │ #3B82F6 & #F59E0B      │
├───────────────────────┼───────────────────────┼────────────────────────┤
│ org-04-media-tech     │ org-05-media-edu      │ org-06-media-creative  │
│ Deep Electric Blue    │ Pedagogical Green     │ Violet / Vivid Magenta │
│ #00D2FF & #0055FF     │ #10B981 & #059669     │ #8B5CF6 & #EC4899      │
└───────────────────────┴───────────────────────┴────────────────────────┘
```

### 3.1 Token Details by Business Unit

```json
{
  "org-01-huytech": {
    "primary": "#00E5FF",
    "secondary": "#0070F3",
    "surface": "rgba(0, 229, 255, 0.06)",
    "border": "rgba(0, 229, 255, 0.25)",
    "badge_bg": "rgba(0, 229, 255, 0.12)",
    "badge_text": "#00E5FF"
  },
  "org-02-aischool": {
    "primary": "#00FF85",
    "secondary": "#10B981",
    "surface": "rgba(0, 255, 133, 0.06)",
    "border": "rgba(0, 255, 133, 0.25)",
    "badge_bg": "rgba(0, 255, 133, 0.12)",
    "badge_text": "#00FF85"
  },
  "org-03-smarttax": {
    "primary": "#3B82F6",
    "secondary": "#F59E0B",
    "surface": "rgba(59, 130, 246, 0.06)",
    "border": "rgba(59, 130, 246, 0.25)",
    "badge_bg": "rgba(59, 130, 246, 0.12)",
    "badge_text": "#60A5FA"
  },
  "org-04-media-tech": {
    "primary": "#00D2FF",
    "secondary": "#0055FF",
    "surface": "rgba(0, 210, 255, 0.06)",
    "border": "rgba(0, 210, 255, 0.25)",
    "badge_bg": "rgba(0, 210, 255, 0.12)",
    "badge_text": "#00D2FF"
  },
  "org-05-media-edu": {
    "primary": "#10B981",
    "secondary": "#059669",
    "surface": "rgba(16, 185, 129, 0.06)",
    "border": "rgba(16, 185, 129, 0.25)",
    "badge_bg": "rgba(16, 185, 129, 0.12)",
    "badge_text": "#34D399"
  },
  "org-06-media-creative": {
    "primary": "#8B5CF6",
    "secondary": "#EC4899",
    "surface": "rgba(139, 92, 246, 0.06)",
    "border": "rgba(139, 92, 246, 0.25)",
    "badge_bg": "rgba(139, 92, 246, 0.12)",
    "badge_text": "#C084FC"
  }
}
```

---

## 4. Control Center Risk UI Tokens (R0 - R4)

Designed for internal governance, dashboard widgets, and task safety status:

| Risk Code | Risk Tier | Badge Background | Text / Dot Color | Semantic Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **`R0`** | Read / Safe | `rgba(148, 163, 184, 0.15)` | `#94A3B8` | Read-only operations, search, public KB |
| **`R1`** | Draft / Low | `rgba(59, 130, 246, 0.15)` | `#60A5FA` | Draft generation, local file preview |
| **`R2`** | Controlled | `rgba(16, 185, 129, 0.15)` | `#34D399` | Departmental task execution, verified tools |
| **`R3`** | Approval Req | `rgba(245, 158, 11, 0.15)` | `#FBBF24` | Cross-BU delegation, customer notifications |
| **`R4`** | Critical | `rgba(239, 68, 68, 0.15)` | `#F87171` | Production write, high budget, credentials |

---

## 5. Light Mode Semantic Compatibility

For institutional visitors requiring high-luminance reading, semantic tokens map directly to an enterprise slate light mode:
- Background: `#F8FAFC`
- Surfaces: `#FFFFFF` with `rgba(0,0,0,0.08)` border
- Text: `#0F172A` (Primary, 15.6:1 contrast) / `#475569` (Secondary, 7.3:1 contrast)
- Brand Accents: `#0284C7` (Cyan shift for light contrast >= 4.5:1)
