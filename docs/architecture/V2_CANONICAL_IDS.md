# HUY AI AGENCY GROUP V2.0 — CANONICAL IDENTIFIERS SPECIFICATION

**DOCUMENT ID:** V2_CANONICAL_IDS  
**SYSTEM:** HUY AI AGENCY GROUP V2.0  
**PHASE:** 06J-B (RECONCILIATION & CONFIGURATION DESIGN)  
**STATUS:** FROZEN CANONICAL REGISTRY  

---

## 1. CANONICAL ORGANIZATIONS (6 BUSINESS UNITS)

All systems, envelopes, and configurations must use exactly these 6 identifiers:

| Organization ID | Organization Name | Strategic Role | Cost Center | Default Tier |
|:---|:---|:---|:---:|:---:|
| `org-01-huytech` | **HUY TECHNOLOGY AI GROUP** | Parent Holding / Technology / Group Control | `CC-01-HUYTECH` | `INTERNAL` |
| `org-02-aischool` | **GVCNCDSAI AI SCHOOL** | Education / AI School | `CC-02-AISCHOOL` | `CONFIDENTIAL` |
| `org-03-smarttax` | **SMARTTAX AI** | Tax / Legal / Compliance | `CC-03-SMARTTAX` | `RESTRICTED` |
| `org-04-media-tech` | **HUY TECH MEDIA** | Technology / AI / Automation Media | `CC-04-MEDIA-TECH` | `PUBLIC` |
| `org-05-media-edu` | **GVCNCDSAI MEDIA** | Education / Teacher / Student / STEM Media | `CC-05-MEDIA-EDU` | `PUBLIC` |
| `org-06-media-creative` | **HUY CREATIVE MEDIA** | Music / Entertainment / Creative Media | `CC-06-MEDIA-CREATIVE` | `PUBLIC` |

> [!IMPORTANT]
> **No Standalone Tax Media Organization:**  
> Tax and legal media is exclusively governed by SmartTax AI (`org-03-smarttax`). Media distribution is handled via authorized delegations of `PUBLIC_APPROVED` briefs to `org-04-media-tech`.

---

## 2. CANONICAL MANAGEMENT LEVELS

Authority is strictly ordered by numerical tier (**Higher Number = Higher Authority**):

- **LEVEL 4 (Group Executive Orchestrator):** Global Goal Decomposition, Portfolio Governance (`reports_to_agent_id = null`).
- **LEVEL 3 (Company Orchestrator):** Subsidiary Mission Planning & BU Coordination (Reports to Level 4).
- **LEVEL 2 (Department Manager Agent):** Departmental Workflow, Specialist Task Assignment (Reports to same-org Level 3).
- **LEVEL 1 (Specialist Agent):** Deep Domain Execution & Synthesis (Reports to same-org Level 2).
- **LEVEL 0 (Tool Worker):** Deterministic Capability / Tool / RPC Executor via MCP (Zero autonomy, no user interaction).

---

## 3. CANONICAL COST CENTERS

- `CC-01-HUYTECH` — Huy Technology Parent & Platform Infra
- `CC-02-AISCHOOL` — AI School Academy & Education Models
- `CC-03-SMARTTAX` — SmartTax Legal & Compliance Research
- `CC-04-MEDIA-TECH` — Tech Media Agency Content Production
- `CC-05-MEDIA-EDU` — Education Media Agency Campaigns
- `CC-06-MEDIA-CREATIVE` — Creative Media Audio & Shorts

---

## 4. CANONICAL DATA CLASSIFICATION TIERS

1. `PUBLIC` — Externally approved, shareable with any audience or model.
2. `INTERNAL` — Holding operational memos, task telemetry, non-sensitive metrics.
3. `CONFIDENTIAL` — Student grades, personal teacher notes, client intake docs.
4. `RESTRICTED` — Tax identification numbers, accounting books, credentials, legal filings.
