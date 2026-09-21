# HUY AI DIGITAL ECOSYSTEM — V2 COMPONENT SYSTEM SPECIFICATION

## 1. Architecture & Component Principles

The **HUY AI Component System** is designed for modularity, WCAG 2.2 AA accessibility, and seamless alignment with the V2 Design Tokens.

- **Component Standard:** React 19 + TypeScript strict props interface.
- **CSS Strategy:** Semantic Tailwind classes and CSS Variables (no inline hardcoded colors).
- **Interactive States:** Every interactive component must define `default`, `hover`, `focus-visible`, `active`, and `disabled` states.
- **Accessibility:** Built-in ARIA roles, keyboard operability (`Enter`, `Space`, `Escape`, Arrow keys), and focus rings.

---

## 2. Global Navigation & Layout Components

### 2.1 `AppHeader`
- **Role:** Sticky top-level header bar with responsive navigation, brand logo, mega-menu triggers, search, and primary conversion CTA.
- **Props:**
  ```typescript
  interface AppHeaderProps {
    brandName?: string; // Default: "HUY TECHNOLOGY AI GROUP"
    activeRoute?: string;
    onControlCenterClick?: () => void;
  }
  ```
- **States:**
  - *Default:* Glassmorphic translucent surface (`bg-surface-glass`), subtle border `rgba(255,255,255,0.08)`.
  - *Scrolled (> 50px):* Backdrop blur increases to `24px`, background darkens for contrast.
  - *Mobile (< 768px):* Collapses nav links into `MobileNavigation` drawer trigger.

### 2.2 `MegaMenu`
- **Role:** Full-width or anchored popover displaying grouped ecosystem links (Organisations, Solutions, Products, Research).
- **Props:**
  ```typescript
  interface MegaMenuProps {
    isOpen: boolean;
    activeCategory: 'ecosystem' | 'solutions' | 'products' | 'research';
    onClose: () => void;
  }
  ```
- **Accessibility:** `aria-expanded`, keyboard `Tab` trapping, closes on `Escape` key.

### 2.3 `MobileNavigation`
- **Role:** Off-canvas drawer sliding from right or top on mobile viewports (< 768px).
- **Features:** Accordion sections for sub-routes, direct CTA buttons, language switch, zero horizontal overflow.

### 2.4 `Breadcrumb`
- **Role:** Navigation trail for nested pages (`Home / Ecosystem / SmartTax AI`).
- **Schema:** Renders valid JSON-LD `BreadcrumbList` for Google SEO crawling.

### 2.5 `Footer`
- **Role:** Multi-column corporate footer with ecosystem navigation, legal disclaimers, contact details, social channels, and discreet Control Center access.

---

## 3. Brand & Ecosystem Visualization Components

### 3.1 `HeroSection`
- **Role:** The prime conversion above-the-fold component.
- **Layout (2-Column Desktop, 1-Column Mobile):**
  - *Left Column:* Corporate brand label, H1 headline ("Kiến tạo hệ sinh thái vận hành bằng AI"), supporting copy, Dual CTAs (`Khám phá hệ sinh thái` & `Tư vấn AI Automation`).
  - *Right Column:* Interactive `EcosystemMap` visual container.
- **Rules:** Founder portrait does NOT dominate the Hero; technology & ecosystem take center stage.

### 3.2 `EcosystemMap`
- **Role:** Flagship interactive visualization of HUY AI GROUP and its 5 connected operating organizations.
- **Data Source:** Ingests strictly from `config/architecture/v2/public-ecosystem.json`.
- **Interactions:**
  - *Desktop:* Radial constellation; hover node to illuminate data rays and display mini-card; click to select and preview capabilities.
  - *Mobile (< 768px):* Gracefully degrades into an interactive stacked carousel / accordion list.

### 3.3 `OrganizationCard`
- **Role:** Card displaying a single business unit with its brand accent, role, capabilities, products, and external link.
- **Props:**
  ```typescript
  interface OrganizationCardProps {
    id: string; // e.g. "org-03-smarttax"
    displayName: string;
    brandRole: string;
    description: string;
    capabilities: string[];
    productGroups: string[];
    websiteUrl: string;
    accentColor: string; // Token reference
    status: 'ACTIVE' | 'MAINTENANCE';
  }
  ```

### 3.4 `AgentHierarchyDiagram`
- **Role:** Publicly explains the 5-layer AI Agency operating model (Human Direction -> Group AI -> Company AI -> Department AI -> Specialist AI -> AI Tools).
- **Security Rule:** Does NOT expose internal agent IDs or system prompts. Emphasizes governance, controlled delegation, and Human-in-the-Loop oversight.

---

## 4. Content & Service Cards

### 4.1 `SolutionCard`
- **Role:** Highlights specific enterprise automation solutions (e.g., Enterprise Workflow Automation, Private AI Infrastructure, CV 5512 Education Copilot, Tax Document OCR).
- **Props:** `title`, `description`, `icon`, `targetAudience`, `benefits[]`, `ctaText`, `ctaHref`.

### 4.2 `ProductCard`
- **Role:** Deep dive into specific software applications (Smart Teacher Schedule, SmartTax AI, AaaS Platform).
- **Features:** Badge tier (SaaS / On-Prem / Cloud), screenshot preview, live status indicator.

### 4.3 `TechnologyCard` & `SecurityCard`
- **Role:** Explains HAIP protocol, Zero-Trust data isolation, on-prem compute nodes, and private RAG without leaking internal topology.

### 4.4 `CaseStudyCard`
- **Role:** Verified enterprise transformations and educational deployments (metrics, challenge, AI solution, outcome).

### 4.5 `MediaCard`
- **Role:** Articles, technical videos, and podcasts from HUY TECH MEDIA, GVCNCDSAI MEDIA, or HUY CREATIVE MEDIA.

### 4.6 `FounderCard`
- **Role:** Executive leadership profile of Ngô Quốc Huy, engineering background, national credentials, and corporate mission. Positioned in Section 13.

### 4.7 `ResearchCard` & `ArticleCard`
- **Role:** Technical whitepapers, autonomous agent studies, and architecture deep dives.

---

## 5. UI Controls & Data Entry

### 5.1 `CTAButton`
- **Variants:**
  - `primary`: Gradient cyan-to-blue fill, white text, subtle glow hover.
  - `secondary`: Ghost translucent background, cyan border `1px`, cyan text.
  - `outline`: Neutral white border `1px`, white text.
  - `danger`: Red border & text for critical confirmation.
- **Sizes:** `sm` (36px height), `md` (44px height - minimum touch target), `lg` (52px height).

### 5.2 `SectionHeader`
- **Role:** Standardized title block for all 16 homepage sections.
- **Props:** `tagLabel` (uppercase pill badge), `title` (H2 with gradient accent), `description` (Body large), `align` (`center` | `left`).

### 5.3 `MetricCard`
- **Role:** Displays key figures with animated counter (`1.200+ Học viên`, `65 Phòng ban`, `6 Doanh nghiệp`).

### 5.4 `StatusBadge` & `RiskBadge`
- **Role:** Visual tag representing active operational state or Control Center risk tier (`R0` - `R4`).

### 5.5 `Tabs` & `Accordion`
- **Role:** Accessible collapsible widgets with keyboard arrow navigation.

### 5.6 `Modal` & `Drawer`
- **Role:** Focus-trapped dialogues for consultations, lead capture, or ecosystem deep dive modals.

### 5.7 `FormField` & `ContactForm`
- **Role:** Enterprise lead generation with multi-intent routing (AI Automation, Education, TaxTech, Partnership, Media).
- **Validation:** Accessible inline error messages (`aria-invalid`, `aria-describedby`).
