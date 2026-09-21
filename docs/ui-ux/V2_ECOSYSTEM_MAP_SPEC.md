# HUY AI DIGITAL ECOSYSTEM — V2 ECOSYSTEM MAP COMPONENT SPECIFICATION

## 1. Overview & Architectural Role

The **`EcosystemMap`** is the signature interactive visualization of **HUY TECHNOLOGY AI GROUP**. It illustrates how the corporate parent coordinates the 5 specialized business units through high-performance, secure AI workflows.

- **Data Source:** Ingests exclusively from [`config/architecture/v2/public-ecosystem.json`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/config/architecture/v2/public-ecosystem.json).
- **Zero Sensitive Topology:** Does not expose internal IP addresses, server hostnames, PGMQ queues, database tables, or private agent IDs.

---

## 2. Radial Constellation Layout (Desktop >= 1024px)

The desktop layout is organized as a radial constellation centered on the parent holding:

```
                          ┌───────────────────────────┐
                          │   GVCNCDSAI AI SCHOOL     │
                          │        (org-02)           │
                          │    #00FF85 • Emerald      │
                          └─────────────┬─────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
┌──────────▼────────────┐  ┌────────────▼───────────┐  ┌─────────────▼──────────┐
│     SMARTTAX AI       │  │ HUY TECHNOLOGY AI GROUP│  │     HUY TECH MEDIA     │
│       (org-03)        ├──┤     (org-01 / Core)    ├──┤        (org-04)        │
│ #3B82F6 • Azure Blue  │  │   #00E5FF • Electric   │  │   #00D2FF • Tech Blue  │
└───────────────────────┘  └────────────┬───────────┘  └────────────────────────┘
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           │                                                         │
┌──────────▼────────────┐                               ┌────────────▼──────────┐
│   GVCNCDSAI MEDIA     │                               │  HUY CREATIVE MEDIA   │
│       (org-05)        │                               │        (org-06)       │
│  #10B981 • Edu Green  │                               │   #8B5CF6 • Violet    │
└───────────────────────┘                               └───────────────────────┘
```

### 2.1 Visual Mechanics
- **Center Node (`org-01-huytech`):** Diameter `140px`, pulsing ambient cyan aura (`#00E5FF`), branded with the central hexagon circuit emblem.
- **Satellite Nodes (Orbiting BUs):** Diameter `96px`, positioned equidistant along a `520px` circular orbit with assigned brand accent borders.
- **Connecting Rays:** SVG bezier curves connecting the central node to all 5 satellite nodes. An animated dashed glow represents real-time data packets flowing between entities.

---

## 3. Interaction Design

### 3.1 Desktop Interaction
1. **Default State:** Central node is active. A bottom summary panel highlights the group orchestration role and overall ecosystem statistics.
2. **Hover State (Node):**
   - The hovered satellite node scales up by `1.08x`.
   - The connecting SVG ray to that specific node illuminates with maximum intensity.
   - Other nodes dim slightly (`opacity: 0.6`) to focus attention.
   - A floating preview tooltip appears near the cursor.
3. **Click / Select State:**
   - The selected node locks as active.
   - The dynamic **Ecosystem Detail Drawer** slides open on the right or updates the persistent preview card, displaying:
     - Canonical Display Name
     - Brand Role Badge
     - Short Description
     - Public Capabilities Checklist
     - Flagship Products List
     - Verified External URL with external link badge (`↗`)
     - Operational Status: `ACTIVE`

### 3.2 Mobile Fallback Layout (< 1024px)
On mobile and tablet viewports where radial canvas interaction is cumbersome:
- The radial graph is **hidden** via CSS (`hidden lg:block`).
- A **Horizontal Organization Pill Bar** appears at the top (`overflow-x-auto scrollbar-hide`).
- Directly below, a responsive **Active Organization Showcase Card** is rendered, containing:
  - BU Icon + Canonical Name + Accent Tag
  - Two-sentence mission statement
  - Top 3 capabilities with bullet points
  - Primary CTA button linking directly to the BU website or detail view.
- Supports effortless horizontal swipe gestures or simple tap-to-switch.

---

## 4. Accessibility & Degradation Rules

1. **No-Animation Mode:** If `prefers-reduced-motion: reduce` is detected, ray animations, orbital rotations, and pulsing glows are disabled. Nodes remain static with standard solid borders.
2. **Screen Reader Support:**
   - The component is wrapped in `<div role="region" aria-label="Sơ đồ hệ sinh thái 6 doanh nghiệp HUY AI">`.
   - Each node is an accessible `<button aria-label="Xem chi tiết [Tên Doanh Nghiệp]" aria-pressed="true|false">`.
   - Keyboard `ArrowLeft` / `ArrowRight` cycles through the 6 organizations in sequence.
3. **Graceful Failure Fallback:**
   - If `public-ecosystem.json` fails to load, the component gracefully falls back to static hardcoded SVG nodes for the 6 canonical BUs without throwing unhandled exceptions.
