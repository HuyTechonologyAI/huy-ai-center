# PHASE 06K-B: ROLLBACK & DISASTER RECOVERY PLAN
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-B-ROLLBACK-001  
**Phase:** 06K-B (Multi-Org Migration Draft + Isolated Dry Run)  
**Status:** VALIDATED IN LOCAL DRY RUN  
**Date:** 2026-09-23  

---

## 1. Rollback Strategy & Principle

The rollback script [`supabase/rollback/06k_b_multi_org_rollback.sql`](file:///C:/Users/Admin/.gemini/antigravity/scratch/huy-ai-center/supabase/rollback/06k_b_multi_org_rollback.sql) reverses the multi-org foundation in strict inverse dependency order.

> [!WARNING]
> The rollback script is for **isolated recovery testing only** during Phase 06K-B. It must **NEVER** be executed against production during 06K-B.

---

## 2. Execution Sequence

```
1. DROP POLICIES (Added by 06K-B)
   ├── ai_outputs (rls_smarttax_output_boundary, outputs_org_select_policy)
   ├── ai_tasks (rls_smarttax_task_boundary, tasks_org_select_policy)
   ├── agent_versions, agents
   ├── ai_policies, organization_memberships
   └── departments, organizations
   
2. DROP HELPER FUNCTIONS
   ├── auth_user_organization_ids()
   ├── auth_user_has_org_role()
   ├── auth_user_is_group_admin()
   └── data_classification_rank()
   
3. DROP TRIGGERS & TRIGGER FUNCTIONS
   ├── trg_agent_versions_immutability & trg_agent_version_immutable()
   └── trg_agents_version_invariant & trg_check_version_belongs_to_agent()
   
4. DROP CONSTRAINTS & INDEXES
   ├── fk_agents_current_version
   └── All 06K-B performance & isolation indexes
   
5. DROP EXTENDED COLUMNS
   ├── ai_outputs (release_status, data_classification, organization_id)
   ├── ai_task_steps (recipient_organization_id, sender_organization_id)
   ├── ai_tasks (requested_by_organization_id, cost_center_code, data_classification, department_id, organization_id)
   ├── agent_versions (agent_card_hash, agent_card)
   └── agents (current_agent_version_id, cost_center_code, hierarchy_level, department_id, organization_id)
   
6. DROP NEW TENANCY TABLES (CASCADE)
   ├── public.ai_policies
   ├── public.organization_memberships
   ├── public.departments
   └── public.organizations
```

---

## 3. Local Dry-Run Rollback Test Results

- **Pre-Rollback Public Tables:** 38
- **Post-Rollback Public Tables:** 34 (100% matched production baseline)
- **Rollback Execution Duration:** 31ms
- **Post-Rollback Integrity Check:** All 34 baseline tables, existing legacy RLS policies, and PGMQ queues remained fully functional.
- **Reapply Check:** Succeeded immediately following rollback with zero catalog conflicts.
