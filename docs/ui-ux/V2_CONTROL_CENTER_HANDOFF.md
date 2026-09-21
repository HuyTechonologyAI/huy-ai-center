# HUY AI DIGITAL ECOSYSTEM — V2 CONTROL CENTER UX DESIGN HANDOFF

## 1. Architectural Separation & Security Perimeter

**Architectural Boundary:**  
The **HUY AI Control Center** is a separate, strictly authenticated administrative product surface. It is NEVER directly rendered or exposed within the public marketing pages of `https://www.huycncdsai.io.vn`.

```
┌────────────────────────────────────────────────────────┐
│ PUBLIC CORPORATE PORTAL (huycncdsai.io.vn)             │
│ - Audience: Enterprise Clients, Schools, Public        │
│ - Goal: Trust, Brand Authority, Solutions, Leads       │
│ - Tech: Public Projection, Zero Backend Secrets        │
└───────────────────────────┬────────────────────────────┘
                            │ (Zero Direct Internal Routes)
┌───────────────────────────▼────────────────────────────┐
│ AI CONTROL CENTER (Authenticated Operations Surface)   │
│ - Audience: Executive Leadership, AI Ops, CPA Reviewers│
│ - Goal: Agent Orchestration, Approvals, Node Health    │
│ - Tech: Supabase Auth / RBAC / PGMQ Inspection / HAIP  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Design Token Inheritance

The Control Center inherits foundational design tokens from the **HUY AI Design System** to preserve family unity while catering to dense operational data displays:
- **Typography:** Display uses `Space Grotesk`, Body uses `Plus Jakarta Sans`, and Logs/Code strictly use `JetBrains Mono`.
- **Color Base:** Canvas `#04070D`, Surface `#0F172A`, High-contrast borders `#1E293B`.
- **Organization Accents:** Ingests the 6 BU brand tokens to visually tag tasks by originating organization (`org-01` to `org-06`).
- **Dense Spacing Mode:** Uses a compact 4px baseline (`p-2`, `h-8` tables) allowing operators to monitor high-frequency telemetry without excessive vertical scrolling.

---

## 3. Control Center Information Architecture (16 Operational Modules)

The internal navigation sidebar is structured into 16 dedicated operational surfaces:

| Module Icon | Module Name | Primary Operational Purpose |
| :--- | :--- | :--- |
| `LayoutDashboard` | **Overview** | Real-time ecosystem health, active tasks count, queue latency |
| `Building2` | **Organizations** | The 6 canonical BUs, cost center burn rates, budget ceilings |
| `Network` | **Departments** | The 65 canonical departments, active rosters, capability maps |
| `Bot` | **Agents** | 25 MVP agents, versioning, runtime status, health pings |
| `ListTodo` | **Tasks** | Live PGMQ inspection, lifecycle states (16 canonical states) |
| `ShieldAlert` | **Approvals** | Human-in-the-Loop approval queue (R3 & R4 tasks, 24h SLA) |
| `GitBranch` | **Workflows** | n8n webhooks, Langflow pipelines, multi-step orchestration |
| `Cpu` | **Models** | 5 Model Tiers (Tier 0 - Tier 4), latency, fallback metrics |
| `Wrench` | **Tools** | 21 canonical tool permissions, sensitive tool audit trails |
| `Database` | **Knowledge** | RAG vector embeddings, namespace scopes (`kb://<org>/*`) |
| `Radio` | **Media** | Media asset pipeline, syndication queue, multi-channel posts |
| `Lock` | **Security** | RLS audit, unauthorized delegation blocks, incident alerts |
| `CircleDollarSign`| **Costs** | Token usage by cost center, daily budget caps, burn velocity |
| `Server` | **Nodes** | On-prem compute status (`huy-ai-node-01` Dell M4800, Ollama) |
| `Radar` | **GitHub Radar** | Automated repository tracking, PR audits, dependency alerts |
| `Settings` | **System** | Dispatcher configuration, environment variables, maintenance |

---

## 4. Canonical Risk UI Language (R0 - R4)

The Control Center visually tags every agent card, task row, and tool execution with a standardized risk badge:

```
┌──────┬──────────────────────┬──────────────────────┬─────────────┬─────────────────────────────────┐
│ Code │ Classification       │ Badge Style          │ Text Color  │ Governance Rule                 │
├──────┼──────────────────────┼──────────────────────┼─────────────┼─────────────────────────────────┤
│ R0   │ Read / Safe          │ Gray bg (15%)        │ #94A3B8     │ Automated execution, no review  │
│ R1   │ Draft / Low Risk     │ Blue bg (15%)        │ #60A5FA     │ Internal draft, no external side│
│ R2   │ Controlled           │ Emerald bg (15%)     │ #34D399     │ Departmental verified action    │
│ R3   │ Approval Required    │ Amber bg (15%)       │ #FBBF24     │ Gated: Needs Level 2/3 human OK │
│ R4   │ Critical / Sovereign │ Red bg (15%)         │ #F87171     │ Gated: Needs Level 4 human CEO  │
└──────┴──────────────────────┴──────────────────────┴─────────────┴─────────────────────────────────┘
```

### 4.1 Risk Badge Component Contract
```typescript
interface RiskBadgeProps {
  level: 0 | 1 | 2 | 3 | 4;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}
```

---

## 5. Implementation Separation Checklist

- [x] Control Center routes (`/admin/*`) are excluded from public sitemaps and disallow-listed in `robots.txt`.
- [x] No database connection strings or service role keys are imported in marketing bundles.
- [x] Public marketing components never call Control Center RPCs or administrative endpoints.
- [x] Full operational deployment of the Control Center interface is deferred to dedicated administrative phases.
