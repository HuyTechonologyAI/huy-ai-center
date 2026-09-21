# HUY AI DIGITAL ECOSYSTEM — V2.0 UI/UX DESIGN SYSTEM & ARCHITECTURE

## 1. Executive Summary & Context

**Project:** HUY AI AGENCY GROUP V2.0  
**Foundation:** Phase 06J-A.1 (Architecture Freeze) & Phase 06J-B (Reconciliation Pass)  
**Target Brand:** **HUY TECHNOLOGY AI GROUP**  
**Primary Public Domain:** `https://www.huycncdsai.io.vn`  
**Safe Data Projection:** `config/architecture/v2/public-ecosystem.json`  
**Design Tokens:** `config/ui/v2/design-tokens.json`, `config/ui/v2/organization-brand-tokens.json`

This directory contains the canonical UX Architecture, Design System, Component Specifications, Wireframes, and Migration Strategies to evolve `huycncdsai.io.vn` from an individual training website into the flagship enterprise headquarters and corporate portal for **HUY TECHNOLOGY AI GROUP**.

---

## 2. Directory Structure & Documentation Map

| Specification Document | Scope & Purpose |
| :--- | :--- |
| [`V2_BRAND_SYSTEM.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_BRAND_SYSTEM.md) | Corporate brand identity, positioning statements, tone of voice, 6 BU brand architecture, ethical boundaries |
| [`V2_DESIGN_TOKENS.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_DESIGN_TOKENS.md) | Design tokens catalog: colors, typography, spacing, radii, elevations, breakpoints, z-indices |
| [`V2_COLOR_SYSTEM.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_COLOR_SYSTEM.md) | Semantic color system, Dark-first palette, 6 BU accent definitions, light mode mappings, WCAG 2.2 AA contrast |
| [`V2_TYPOGRAPHY.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_TYPOGRAPHY.md) | Font hierarchy, Space Grotesk / Sora (Display), Inter / Jakarta (Body), JetBrains Mono (Tech), Vietnamese glyph support |
| [`V2_COMPONENT_SYSTEM.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_COMPONENT_SYSTEM.md) | Specifications for 27+ reusable enterprise components, props contracts, and variants |
| [`V2_RESPONSIVE_SYSTEM.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_RESPONSIVE_SYSTEM.md) | Mobile-first layout system: 390px, 768px, 1280px, 1440px+, adaptive navigation, and fallback mechanisms |
| [`V2_ACCESSIBILITY.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_ACCESSIBILITY.md) | WCAG 2.2 AA accessibility standards, keyboard navigation, focus rings, ARIA landmarks, contrast ratios |
| [`V2_MOTION_SYSTEM.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_MOTION_SYSTEM.md) | Animation principles, micro-interactions, Framer Motion variants, `prefers-reduced-motion` compliance |
| [`V2_INFORMATION_ARCHITECTURE.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_INFORMATION_ARCHITECTURE.md) | 3 UX layers (Brand, Ecosystem, Technology), sitemap, URL architecture, and mega-menu navigation |
| [`V2_HOMEPAGE_SPEC.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_HOMEPAGE_SPEC.md) | Canonical 16-section homepage blueprint, 30-second scan rule, Hero specification, and conversion pathways |
| [`V2_ECOSYSTEM_MAP_SPEC.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_ECOSYSTEM_MAP_SPEC.md) | Interactive Ecosystem Map component: central node + 5 orbiting BUs, mobile fallback, public data binding |
| [`V2_CONTENT_MIGRATION.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_CONTENT_MIGRATION.md) | Audit of existing pages, Content Migration Matrix (KEEP, MOVE, ARCHIVE), cross-site handoff rules |
| [`V2_SEO_ARCHITECTURE.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_SEO_ARCHITECTURE.md) | Metadata, OpenGraph, JSON-LD schemas (Organization, Person, Service, Breadcrumb), sitemap & robots |
| [`V2_CONTROL_CENTER_HANDOFF.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_CONTROL_CENTER_HANDOFF.md) | Architectural boundary between public corporate UI and internal Control Center, Risk UI language (R0-R4) |
| [`V2_ANALYTICS_PLAN.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_ANALYTICS_PLAN.md) | Privacy-conscious event taxonomy, telemetry points, zero PII collection, conversion funnel metrics |
| [`V2_WIREFRAMES.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/ui-ux/V2_WIREFRAMES.md) | Low-fidelity structural wireframes for 10 core desktop & mobile viewports |

---

## 3. Core Architectural Principles

1. **Enterprise Technology + Futuristic Minimalism:**  
   Clean geometric layouts, deep navy canvas, crisp typographic hierarchy, restrained electric blue/cyan accents. Zero crypto aesthetic, zero gaudy neon or heavy particle clutter.
2. **Strict Public Data Boundary:**  
   The public UI only renders safe projections from `config/architecture/v2/public-ecosystem.json`. Internal agent IDs, departmental routing keys, RLS policies, raw budget ceilings, and backend secrets are never exposed.
3. **Ecosystem Cohesion with BU Identity:**  
   All 6 business units share layout, typography, components, and navigation principles, while maintaining distinct accent color identities.
4. **Zero Production Mutation in Phase 06J-UX-A:**  
   This phase establishes the canonical architectural blueprints, machine-readable design tokens, and consistency tests without modifying production DNS, Vercel deployments, or live database tables.
