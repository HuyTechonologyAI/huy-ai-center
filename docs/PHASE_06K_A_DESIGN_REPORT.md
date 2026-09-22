# PHASE 06K-A DESIGN REPORT
## MULTI-ORG DATABASE ARCHITECTURE + AGENT CARD V2 PERSISTENCE DESIGN
### HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-REP-06K-A-001  
**Phase:** 06K-A  
**Mode:** DESIGN ONLY (Zero Database Mutations)  
**Date:** September 22, 2026  
**Status:** COMPLETED & READY FOR HUMAN REVIEW  
**Feature Branch:** `feature/06k-a-multi-org-db-design`  
**Repository:** `scratch/huy-ai-center`  
**Production Supabase Reference:** `HuyAI` (`bdeluacbzbdflxubhpha`)  

---

## 1. Executive Summary

Phase 06K-A has successfully completed the comprehensive multi-organization database architecture and Agent Card V2 persistence design for the HUY AI CENTER / HAIP Control Plane.

In accordance with strict phase safety rules:
- **Zero Production Mutations**: No DDL, no migrations, no table creations, no column alterations, and no data modifications were executed on the production Supabase database.
- **Read-Only Verification**: The live production database was verified via read-only inspection. Exactly 34 public tables exist (19 legacy tables with 239 rows intact + 15 AI Center tables from Phase 06H/06J).
- **Design Artifacts**: All 6 architectural design deliverables (ERD, Schema pseudo-DDL, Agent Card V2 Spec, Policy & RLS Model, Queue Envelope Spec, Migration Sequence Plan, and Security Test Matrix) have been fully authored and verified.

---

## 2. Summary of Design Decisions (D1 to D15)

| Ref | Domain | Decision Summary | Artifact Reference |
| :--- | :--- | :--- | :--- |
| **D1** | Organizations | New table `public.organizations` with PK `id text`, `code`, `cost_center_code` UNIQUE, `parent_org_id` self-FK, `status`, `data_classification_ceiling`. | `06K_A_MULTI_ORG_SCHEMA_DESIGN.md` |
| **D2** | Departments | New table `public.departments` with PK `id text`, `organization_id text FK`, `code`, `parent_department_id text FK`, composite uniqueness `UNIQUE(organization_id, code)`. | `06K_A_MULTI_ORG_SCHEMA_DESIGN.md` |
| **D3** | Memberships | New table `public.organization_memberships` linking `auth.users(id)` and `public.organizations(id)` with 6 roles (`owner`, `admin`, `reviewer`, `operator`, `member`, `auditor`). | `06K_A_MULTI_ORG_SCHEMA_DESIGN.md` |
| **D4** | Agent Scope | `public.agents` extended with `organization_id text FK`, `department_id text FK`, `hierarchy_level integer` (0-4), `cost_center_code text`. | `06K_A_MULTI_ORG_SCHEMA_DESIGN.md` |
| **D5** | Card Persistence | `public.agent_versions` extended with `agent_card jsonb` and `agent_card_hash text` (SHA-256). Existing `schema_version` column retained for document versioning. | `06K_A_AGENT_CARD_V2_SPEC.md` |
| **D6** | Version Pointer | **Model B Selected**: Direct foreign key pointer `public.agents.current_agent_version_id uuid REFERENCES public.agent_versions(id)`. Ensures O(1) Dispatcher resolution. | `06K_A_MULTI_ORG_SCHEMA_DESIGN.md` |
| **D7** | Task Scope | `public.ai_tasks` extended with `organization_id text FK`, `department_id text FK`, `data_classification text`, `cost_center_code text`, `requested_by_organization_id text FK`. | `06K_A_MULTI_ORG_SCHEMA_DESIGN.md` |
| **D8** | Output Scope | `public.ai_outputs` extended with `organization_id text FK`, `data_classification text`, and `release_status text` (`DRAFT`, `QA_APPROVED`, `PUBLIC_APPROVED`, `REVOKED`). | `06K_A_MULTI_ORG_SCHEMA_DESIGN.md` |
| **D9** | Step Lineage | `public.ai_task_steps` extended with `sender_organization_id text FK` and `recipient_organization_id text FK` for multi-org trace. | `06K_A_MULTI_ORG_SCHEMA_DESIGN.md` |
| **D10** | Policy Engine | New table `public.ai_policies`. Hierarchical resolution across 4 tiers: `GROUP` → `ORGANIZATION` → `DEPARTMENT` → `AGENT`. Strictest ceiling wins. | `06K_A_POLICY_AND_RLS_MODEL.md` |
| **D11** | RLS Security | Default-deny posture with `SECURITY DEFINER` STABLE helper functions (`auth_user_organization_ids()`, `auth_user_has_org_role()`, `auth_user_is_group_admin()`). | `06K_A_POLICY_AND_RLS_MODEL.md` |
| **D12** | Queue Envelope | Single unified `ai-jobs` PGMQ queue with HAIP Message Envelope V2. Dispatcher enforces 5-point database invariant cross-check prior to node dispatch. | `06K_A_QUEUE_ENVELOPE_SPEC.md` |
| **D13** | SmartTax Boundary | Hermetic isolation of `org-03-smarttax`. Direct joins blocked. Cross-org egress restricted to sanitized artifacts with `release_status = 'PUBLIC_APPROVED'` + `data_classification = 'PUBLIC'`. | `06K_A_POLICY_AND_RLS_MODEL.md` |
| **D14** | Agent Card Spec | Formal JSON Schema 2.0 with metadata, runtime, tools, governance, compliance, and dependencies. Canonical SmartTax L1 sample card provided. | `06K_A_AGENT_CARD_V2_SPEC.md` |
| **D15** | Migration Sequence | 15-step additive migration sequence designed for Phase 06K-B. Fully non-blocking, zero-downtime, with documented rollback script. | `06K_A_MIGRATION_SEQUENCE_PLAN.md` |

---

## 3. Production Safety & Health Audit

The read-only inspection conducted on production Supabase `HuyAI` (`bdeluacbzbdflxubhpha`) confirmed:
1. **Total Tables**: Exactly 34 public tables.
2. **Legacy Continuity**: 19 legacy tables containing 239 rows remain completely untouched:
   - `categories` (6 rows)
   - `courses` (2 rows)
   - `lessons` (1 row)
   - `profiles` (3 rows)
   - `system_settings` (1 row)
   - All other 14 legacy tables preserved.
3. **AI Registry State**: `agents` has 0 rows; `agent_versions` has 0 rows.
4. **Queue State**: `ai-jobs` PGMQ queue has 0 pending messages.
5. **Runtime Infrastructure**: Node `huy-ai-node-01` is offline (inactive).
6. **No Staged/Pending Production Alterations**: 0 DDL statements were executed.

---

## 4. Documentation Index

The following architecture design documents have been authored and placed in `docs/architecture/`:
- [06K_A_CURRENT_SCHEMA_BASELINE.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/06K_A_CURRENT_SCHEMA_BASELINE.md)
- [06K_A_MULTI_ORG_ERD.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/06K_A_MULTI_ORG_ERD.md)
- [06K_A_MULTI_ORG_SCHEMA_DESIGN.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/06K_A_MULTI_ORG_SCHEMA_DESIGN.md)
- [06K_A_AGENT_CARD_V2_SPEC.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/06K_A_AGENT_CARD_V2_SPEC.md)
- [06K_A_POLICY_AND_RLS_MODEL.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/06K_A_POLICY_AND_RLS_MODEL.md)
- [06K_A_QUEUE_ENVELOPE_SPEC.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/06K_A_QUEUE_ENVELOPE_SPEC.md)
- [06K_A_MIGRATION_SEQUENCE_PLAN.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/06K_A_MIGRATION_SEQUENCE_PLAN.md)
- [06K_A_SECURITY_TEST_MATRIX.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/docs/architecture/06K_A_SECURITY_TEST_MATRIX.md)

---

## 5. Next Phase Readiness: Phase 06K-B

Phase 06K-A is complete and ready for human owner sign-off.
Upon human approval, **Phase 06K-B (Database Migration & Multi-Org Seeding)** can proceed to:
1. Codify the 15-step sequence into version-controlled SQL migration files under `supabase/migrations/`.
2. Apply the migration in a verified transaction on Supabase `HuyAI`.
3. Seed the 6 canonical organizations and default departments.
4. Verify all foreign key relationships, indexes, and RLS policies.
