# HUY AI DIGITAL ECOSYSTEM — V2 INFORMATION ARCHITECTURE SPECIFICATION

## 1. Executive Summary & Three-Tier Experience Model

The information architecture of **HUY TECHNOLOGY AI GROUP** is structured across **Three Cohesive Experience Layers**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LAYER A: CORPORATE BRAND                        │
│        Who We Are • Group Vision • Executive Leadership • Trust        │
├────────────────────────────────────────────────────────────────────────┤
│                        LAYER B: ECOSYSTEM PORTAL                       │
│    6 Business Units • Flagship Platforms • Media Hubs • Product Line   │
├────────────────────────────────────────────────────────────────────────┤
│                     LAYER C: TECHNOLOGY & GOVERNANCE                   │
│   HAIP Architecture • AI Agency Operating Model • Responsible AI • R&D │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Layer A (Corporate Brand):** Establishes institutional credibility, group mission, leadership track record, and multi-intent contact routing.
2. **Layer B (Ecosystem Portal):** Guides visitors seamlessly through the 6 BUs (`Huy Tech`, `AI School`, `SmartTax`, `Tech Media`, `Edu Media`, `Creative Media`).
3. **Layer C (Technology & Governance):** Demonstrates architectural depth, the 5-tier AI operating model, security boundaries, and sovereign on-prem capabilities without disclosing internal credentials.

---

## 2. Global Navigation & Menu Architecture

### 2.1 Top-Level Navigation Structure

| Menu Item | Hierarchy Type | Target Route | Sub-Menu Category / MegaMenu Content |
| :--- | :--- | :--- | :--- |
| **Home** | Direct Link | `/` | Corporate homepage with 16 unified sections |
| **Ecosystem** | MegaMenu | `/ecosystem` | Overview of all 6 BUs + direct cards to each organization |
| **AI Agency** | Dropdown | `/ai-agency` | Operating model, multi-agent orchestration, human-in-the-loop |
| **Solutions** | MegaMenu | `/solutions` | AI Automation, Software Dev, Knowledge AI, TaxTech, EdTech |
| **Products** | Dropdown | `/products` | Teacher Schedule AI, SmartTax AI, AaaS Platform |
| **Research** | Direct Link | `/research` | Technical papers, HAIP whitepapers, multi-agent studies |
| **Resources** | Dropdown | `/resources` | Documentation, case studies, guides, community tools |
| **About** | Dropdown | `/about` | Group overview, leadership, mission, milestones |
| **Contact** | Direct Link | `/contact` | Intent-aware consultation and partnership portal |

### 2.2 Global Conversion Action Hierarchy
- **Primary CTA Button:** `"Khám phá hệ sinh thái"` (Explore Ecosystem) -> Triggers `/ecosystem` or scrolls to Section 04.
- **Secondary CTA Button:** `"Tư vấn AI Automation"` (Consultation) -> Triggers `/contact?intent=automation` or opens Lead Modal.
- **Control Center Access:** Discreet, low-prominence link in the header top bar or footer:
  - *Location:* Top right utility bar or footer bottom row.
  - *Label:* `"Control Center ↗"` or `"Khu Vực Quản Trị"`.
  - *Behavior:* Directs authenticated operators to the separate management portal (`/admin` or dedicated app). It never competes visually with public conversion buttons.

---

## 3. URL Architecture & Routing Map

The URL structure is organized into clean, semantic paths supporting SEO indexability:

```
https://www.huycncdsai.io.vn
│
├── /                                            (Homepage - 16 Sections)
├── /ecosystem                                   (Ecosystem Overview)
│   ├── /ecosystem/huy-technology               (Parent Holding & Core Tech)
│   ├── /ecosystem/ai-school                    (GVCNCDSAI AI School)
│   ├── /ecosystem/smarttax                     (SmartTax AI Overview)
│   ├── /ecosystem/tech-media                   (Huy Tech Media Hub)
│   ├── /ecosystem/education-media              (GVCNCDSAI Media Hub)
│   └── /ecosystem/creative-media               (Huy Creative Media Hub)
│
├── /ai-agency                                   (Operating Model & Governance)
│
├── /solutions                                   (Enterprise Solutions Catalog)
│   ├── /solutions/ai-automation                (Workflow & n8n/Make Automation)
│   ├── /solutions/software-development         (Custom Enterprise Software)
│   ├── /solutions/knowledge-ai                 (Private Enterprise RAG & KBs)
│   └── /solutions/business-automation          (ERP, CRM, and Operations AI)
│
├── /products                                    (Ecosystem Product Showcase)
├── /research                                    (R&D, HAIP Protocol Whitepapers)
├── /resources                                   (Public Ebooks, Guides, Articles)
├── /case-studies                                (Verified Enterprise Deployments)
├── /about                                       (Corporate Profile & Story)
├── /leadership                                  (Founder & Executive Governance)
└── /contact                                     (Multi-Intent Lead Routing)
```

---

## 4. Breadcrumb & Hierarchy Schema

Every secondary and tertiary page renders a dynamic breadcrumb conforming to the schema:
```
Home > [Section] > [Page Title]
```
Example:
- `Home > Ecosystem > SmartTax AI`
- `Home > Solutions > AI Automation`

Breadcrumb trails generate corresponding `schema.org/BreadcrumbList` JSON-LD tags for rich snippets in search engine results.
