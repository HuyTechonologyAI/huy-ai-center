# HUY AI AGENCY GROUP V2.0 — PHASE 06K DATABASE MAPPING PROPOSAL
## CONCEPTUAL ARCHITECTURAL DESIGN (ZERO PRODUCTION DDL)

**DOCUMENT ID:** V2_06K_MAPPING_PROPOSAL  
**SYSTEM:** HUY AI AGENCY GROUP V2.0  
**PHASE:** 06J-B (DESIGN-TIME MAPPING PROPOSAL)  
**STATUS:** CONCEPTUAL PROPOSAL ONLY — ZERO DDL / ZERO MIGRATION  

---

## 1. INVIOLABLE PHASE 06J-B BOUNDARY

```text
================================================================================
AGENT_CARD_V2:
PROPOSED_NOT_PERSISTED

PERSISTENCE:
DEFERRED_TO_PHASE_06K

DATABASE DDL APPLIED:
ZERO
================================================================================
```

This document specifies a **design-time mapping proposal** illustrating how the canonical multi-organization models established in Phase 06J-B could logically reconcile with Supabase PostgreSQL tables during Phase 06K.

**Strict Prohibitions in Effect:**
- ❌ DO NOT generate SQL execution scripts.
- ❌ DO NOT create Supabase database migrations.
- ❌ DO NOT insert rows into `public.agents` or `public.agent_versions`.
- ❌ DO NOT alter existing table definitions or column types.

---

## 2. PROPOSED CONCEPTUAL TABLE MAPPINGS (PHASE 06K EVALUATION)

### 2.1 Organizations & Departments Mapping
In Phase 06K, multi-tenant isolation may be represented either through:
- **Option A (Normalized Relational Tables):**
  - `public.organizations`: `id TEXT PRIMARY KEY`, `name TEXT`, `role TEXT`, `cost_center TEXT`, `confidentiality_tier TEXT`.
  - `public.departments`: `id TEXT PRIMARY KEY`, `organization_id TEXT REFERENCES organizations(id)`, `name TEXT`, `description TEXT`.
- **Option B (Static Policy JSONB / Enum Mapping):**
  - Maintaining static JSONB policy manifests evaluated in TypeScript middleware and enforced via organization-level RLS policies on `public.ai_tasks(organization_id)`.

*Decision deferred to Phase 06K architectural review.*

### 2.2 Agent Roster & Identity Persistence
Currently, `public.agent_versions` contains:
`id`, `agent_id`, `version`, `capabilities`, `accepted_inputs`, `output_types`, `runtime`, `risk_ceiling`, `max_parallel_tasks`, `configuration`, `metadata`, `schema_version`, `created_at`.

In Phase 06K, the team will evaluate:
- **Approach 1:** Adding normalized columns (`organization_id TEXT`, `department_id TEXT`, `management_level INT`, `reports_to_agent_id TEXT`).
- **Approach 2:** Adding an immutable `agent_card_snapshot JSONB` column that houses the validated Agent Card V2 schema directly with a JSON Schema check constraint.
- **Approach 3:** A hybrid model with primary indexing keys (`organization_id`, `management_level`) and a detailed card snapshot.

---

## 3. PGMQ TASK QUEUE COMPATIBILITY

No database alteration is needed for the single `ai-jobs` PGMQ queue:
- The existing queue payload stores the canonical HAIP/1.0 envelope.
- HAIP envelopes carry `sender_org`, `target_org`, and `target_capability` in standard metadata fields.
- The HAIP Dispatcher on `huy-ai-node-01` reads these coordinates to route messages to appropriate specialist workers without requiring multiple database queues.

---

## 4. SUMMARY OF PHASE 06K ACTION ITEMS

1. Formal review of normalized relational tables vs JSONB policy snapshots.
2. Formulation of a non-destructive migration script if schema changes are approved.
3. Verification against live production 34-table baseline.
4. Creation of seed scripts for the 25 frozen MVP agents following human approval.
