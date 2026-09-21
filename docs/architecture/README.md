# HUY AI AGENCY GROUP V2.0 — ARCHITECTURE REPOSITORY INDEX

This directory contains the authoritative architecture blueprints, governance frameworks, data contracts, and design records for **HUY AI AGENCY GROUP V2.0**, established during **Phase 06J-A**, reconciled in **Phase 06J-A.1**, and expanded with machine-readable specifications in **Phase 06J-B**.

---

## 1. Core Enterprise Blueprints (Phase 06J-A / 06J-A.1 Reconciled)

| Document | Purpose | Key Topics Covered |
| :--- | :--- | :--- |
| [`V2_GROUP_ARCHITECTURE.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_GROUP_ARCHITECTURE.md) | Holding Structure & 3-Plane System | 6 Canonical Business Units, Parent non-intrusion principle, 3-Plane model, MVP cost target $0–30/month. |
| [`V2_ORGANIZATION_MODEL.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_ORGANIZATION_MODEL.md) | Departmental Topology | 10 departments for Huy Tech, 12 departments for AI School, 10 departments for SmartTax, 3 media agencies. |
| [`V2_AGENT_HIERARCHY.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_AGENT_HIERARCHY.md) | 5-Level Hierarchy (L4 to L0) | L4 Group, L3 Company, L2 Dept, L1 Specialist, L0 Tool Worker; downward delegation, upward escalation, 25 MVP agents. |
| [`V2_DATA_CLASSIFICATION.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_DATA_CLASSIFICATION.md) | 4-Tier Security & Classification | PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED; 9 security context coordinates, Stage 1 logical isolation. |
| [`V2_PERMISSION_MODEL.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_PERMISSION_MODEL.md) | Zero-Trust Access & RLS Strategy | Single Supabase RLS policies, SmartTax logical security boundary, teacher privacy, media quarantine. |
| [`V2_COST_GOVERNANCE.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_COST_GOVERNANCE.md) | Financial Controls & Cost Centers | 5 model routing tiers (T0–T4), cost centers CC-01 to CC-06, MVP $0–30/mo run-rate, scaling on revenue/ROI. |
| [`V2_APPROVAL_HIERARCHY.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_APPROVAL_HIERARCHY.md) | Risk Levels & Human-in-the-Loop | Risk 0–4 matrix, 4-tier approval path (Dept → Company → Group → Human), 24h SLA, DB constraint model. |
| [`V2_CROSS_COMPANY_DELEGATION.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_CROSS_COMPANY_DELEGATION.md) | Inter-BU HAIP Envelope Protocol | `DELEGATE` message schema, SHA-256 artifact exchange, single `ai-jobs` queue ingress, cross-billing mechanism. |
| [`V2_MEDIA_GOVERNANCE.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_MEDIA_GOVERNANCE.md) | Content Lifecycle & Publishing Gates | 11-stage content lifecycle, SmartTax publication rule, AI School curriculum gate, `PUBLIC_APPROVED` enforcement. |
| [`V2_PRODUCT_MAP.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_PRODUCT_MAP.md) | Commercial Catalog & Deliverables | 12 AI School products, 9 SmartTax products (Modes A/B/C), 9 Corporate B2B products. |
| [`V2_AGENT_CARD_PROPOSAL.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_AGENT_CARD_PROPOSAL.md) | Agent Card V2 Schema Proposal | Canonical JSON Schema, SmartTax CIT specialist example, persistence not finalized (deferred to 06K). |

---

## 2. Reconciled Specification Blueprints (Phase 06J-B)

| Document | Purpose | Key Content |
| :--- | :--- | :--- |
| [`V2_CANONICAL_IDS.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_CANONICAL_IDS.md) | Universal ID Reference | 6 Organizations, 5 Management Levels (L4–L0), 6 Cost Centers, 4 Data Tiers. |
| [`V2_DEPARTMENT_REGISTRY.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_DEPARTMENT_REGISTRY.md) | Complete Department Matrix | All 65 globally unique department IDs across the 6 BUs with scopes and data classifications. |
| [`V2_MVP_AGENT_ROSTER.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_MVP_AGENT_ROSTER.md) | 25 MVP Logical Agents | Frozen roster of 25 unseeded agents (1 L4, 6 L3, 9 L2, 9 L1) with reporting lines. |
| [`V2_CAPABILITY_CATALOG.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_CAPABILITY_CATALOG.md) | Standardized Capability Catalog | Lowercase dot-separated identifiers, vendor-agnostic principle, Capability Authority Rule. |
| [`V2_TOOL_PERMISSION_MODEL.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_TOOL_PERMISSION_MODEL.md) | Abstract Tool Permissions | 21 tool permissions, risk levels, sensitive tool whitelist (no implicit grant). |
| [`V2_MODEL_POLICY.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_MODEL_POLICY.md) | Model Tier Policy & Routing | MODEL_TIER_0 to MODEL_TIER_4, preferred/max/fallback tiers, no self-elevation rule. |
| [`V2_SCOPE_MODEL.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_SCOPE_MODEL.md) | URI Scope Specifications | `data://`, `kb://`, and `artifact://` URI scopes; quarantine boundaries for media and student data. |
| [`V2_DELEGATION_MATRIX.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_DELEGATION_MATRIX.md) | Inter-BU Delegation Matrix | Canonical ALLOW / DENY matrix, single queue `ai-jobs`, SmartTax raw data block. |
| [`V2_POLICY_DECISION_MODEL.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_POLICY_DECISION_MODEL.md) | Zero-Trust Decision Engine | JSON Contract: `{ subject, action, resource, context, decision, reason, policy_id }`, Default DENY. |
| [`V2_06K_MAPPING_PROPOSAL.md`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/V2_06K_MAPPING_PROPOSAL.md) | Database Mapping Proposal | Relational vs JSONB snapshot options for Phase 06K; Zero DDL applied in Phase 06J. |

---

## 3. Machine-Readable Design-Time Configurations (`config/architecture/v2/`)

All design-time JSON configurations are stored in [`config/architecture/v2/`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/config/architecture/v2/):
1. `organizations.json` (6 BUs)
2. `departments.json` (65 Departments)
3. `agents.mvp.json` (25 MVP Agents)
4. `capabilities.json` (Canonical Capabilities)
5. `tool_permissions.json` (21 Abstract Tool Permissions)
6. `model_policies.json` (5 Model Tiers)
7. `data_scopes.json` (Canonical Data URIs)
8. `knowledge_scopes.json` (Canonical Knowledge URIs)
9. `delegation_matrix.json` (Inter-BU ALLOW / DENY Rules)
10. `approval_policies.json` (Approval Escalation Rules)
11. `cost_centers.json` (6 Cost Centers)
12. `public-ecosystem.json` (UI/UX Projection for Phase 06J-UX)

---

## 4. Architectural Decision Records (ADR)

| Record | Title | Status | Summary |
| :--- | :--- | :--- | :--- |
| [`ADR-001`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/ADR-001-supabase-control-center.md) | Supabase as Primary Control Center | APPROVED | Consolidates PostgreSQL, PGMQ, Auth, Storage, and Realtime into a single managed Singapore Supabase instance. |
| [`ADR-002`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/ADR-002-cost-optimized-v1.md) | Cost-Optimized Hybrid Topology | APPROVED | Combines on-premise Dell M4800 compute with free/low-cost cloud tiers to guarantee high ROI and lean operations. |
