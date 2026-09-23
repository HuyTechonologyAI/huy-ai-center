# PHASE 06K-B: MULTI-ORG MIGRATION IMPLEMENTATION SPECIFICATION
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-B-MIGRATION-001  
**Phase:** 06K-B (Multi-Org Migration Draft + Production-Parity Isolated Dry Run)  
**Status:** DRAFT VERIFIED — ZERO TOUCH PRODUCTION  
**Date:** 2026-09-23  

---

## 1. Executive Summary

Phase 06K-B implements the additive multi-tenant database migration draft for the HUY AI Center control plane. All migrations are strictly non-destructive, additive, and idempotent.

- **Baseline Tables:** 34 verified public tables (production ground truth).
- **New Tables:** 4 tables (`organizations`, `departments`, `organization_memberships`, `ai_policies`).
- **Post-Migration Table Count:** 38 public tables.
- **Production Ground-Truth Column Types Preserved:**
  - `agents.id`: `text` (canonical alphanumeric identifier)
  - `agent_versions.id`: `uuid`
  - `agent_versions.agent_id`: `text`
  - `ai_tasks.id`: `uuid`
  - `ai_tasks.assigned_agent_id`: `text`
  - `ai_tasks.risk_level`: `integer` (0–4)
  - `agents.risk_ceiling`: `integer` (0–4)
  - `agents.enabled`: `boolean`
  - `agents.health_status`: `text`
  - Nonexistent columns avoided: `agents.status`, `ai_tasks.error_code`, `ai_task_steps.step_name`, `ai_outputs.output_type`.

---

## 2. Migration Sequence & File Manifest

| Sequence | File | Purpose | Idempotency Mechanism |
| :--- | :--- | :--- | :--- |
| **001** | `20260923070001_06k_b_multi_org_foundation.sql` | Core tenancy tables: `organizations`, `departments`, `organization_memberships`, `ai_policies` | `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` |
| **002** | `20260923070002_06k_b_agent_registry_extensions.sql` | Extends `agents` and `agent_versions`; adds version pointer invariant & immutability triggers | `ALTER TABLE ADD COLUMN IF NOT EXISTS`, `pg_constraint` catalog checks, `CREATE OR REPLACE FUNCTION` |
| **003** | `20260923070003_06k_b_operational_extensions.sql` | Extends `ai_tasks`, `ai_task_steps`, `ai_outputs`; introduces `data_classification_rank()` SQL helper | `ALTER TABLE ADD COLUMN IF NOT EXISTS`, deterministic SQL helper |
| **004** | `20260923070004_06k_b_reference_seed.sql` | Seeds 6 canonical Business Units, 65 canonical departments, and 3 baseline policies | `ON CONFLICT (id) DO NOTHING` |
| **005** | `20260923070005_06k_b_security_rls_immutability.sql` | RLS activation, hardened `SECURITY DEFINER` helpers, SmartTax RESTRICTIVE boundary, legacy compatibility | `DROP POLICY IF EXISTS ... CREATE POLICY`, hardened ACLs |

---

## 3. Structural Extensions & Foreign Key Map

```
public.organizations (id text PK)
  ├── public.departments (organization_id text FK)
  │     └── public.agents (department_id text FK)
  ├── public.organization_memberships (organization_id text FK)
  ├── public.agents (organization_id text FK)
  │     ├── current_agent_version_id (FK -> agent_versions.id uuid)
  │     └── [Trigger: trg_agents_version_invariant enforces agent_id match]
  ├── public.ai_tasks (organization_id text FK)
  │     ├── requested_by_organization_id (FK -> organizations.id text)
  │     └── [RESTRICTIVE RLS: rls_smarttax_task_boundary]
  └── public.ai_outputs (organization_id text FK)
        └── [RESTRICTIVE RLS: rls_smarttax_output_boundary]
```

---

## 4. Invariant Triggers & Immutability Protections

### 4.1 Version Pointer Invariant (`trg_agents_version_invariant`)
Enforces that `agents.current_agent_version_id` points to a row in `agent_versions` where `agent_versions.agent_id = agents.id`. Cross-agent pointer poisoning is rejected at the database engine level.

### 4.2 Agent Version Immutability (`trg_agent_versions_immutability`)
Enforces that once an `agent_versions` row is created, any direct `UPDATE` or `DELETE` statement triggers an uncatchable exception (`agent_versions records are immutable and cannot be updated or deleted`).

---

## 5. Security Helpers & ACL Hardening

All helper functions are defined with:
- `SECURITY DEFINER`
- `STABLE`
- `SET search_path = public, pg_temp`
- `REVOKE EXECUTE ... FROM PUBLIC`
- `GRANT EXECUTE ... TO authenticated, service_role`

1. `auth_user_organization_ids()`: Returns table of active organization IDs for `(SELECT auth.uid())`.
2. `auth_user_has_org_role(target_org_id, allowed_roles)`: Boolean membership role check.
3. `auth_user_is_group_admin()`: Verifies membership in `org-01-huytech` with role `owner`, `admin`, or `auditor`.
4. `data_classification_rank(cls)`: Evaluates classification level mathematically (`PUBLIC=1, INTERNAL=2, CONFIDENTIAL=3, RESTRICTED=4`).
