# PHASE 06K-A.1: SECURITY & ISOLATION TEST MATRIX (RECONCILED)
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A1-SEC-001  
**Phase:** 06K-A.1 (Design Reconciliation — Zero Database Mutations)  
**Status:** RECONCILED — AUTHORITATIVE FOR PHASE 06K-B  

> **CORRECTION NOTE:** This document supersedes `06K_A_SECURITY_TEST_MATRIX.md` from Phase 06K-A.  
> Corrections: canonical org IDs, `membership_role` column name, `agents.enabled` (not `agents.status`), `ai_task_steps` service-only, verified column names in Dispatcher tests.

---

## 1. Test Suite Architecture

24 security test cases across 5 domains:

1. **Multi-Tenant Data Isolation (MT):** Cross-org query/mutation boundaries
2. **SmartTax Hermetic Vault (ST):** Raw financial data isolation
3. **Agent Card V2 Integrity & Immutability (AC):** Schema, hash, version invariants
4. **Policy Engine & Ceilings (POL):** Strictest-wins inheritance
5. **Queue Envelope Invariant Verification (QINV):** PGMQ tamper resistance

---

## 2. Test Matrix

| ID | Domain | Scenario | Input / Condition | Expected Result | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-MT-01** | MT | Intra-Org Task Read | User ACTIVE in `org-02-aischool` queries `ai_tasks` (org-02-aischool) | 200 OK — rows returned | Normal |
| **SEC-MT-02** | MT | Cross-Org Task Read | User in `org-06-media-creative` queries tasks owned by `org-03-smarttax` | 0 rows (RLS filter) | Critical |
| **SEC-MT-03** | MT | Cross-Org Task Injection | User in `org-05-media-edu` inserts task with `organization_id='org-01-huytech'` | 403 Forbidden / RLS violation | Critical |
| **SEC-MT-04** | MT | Cross-Org Dept Mutation | User in `org-02-aischool` UPDATEs department owned by `org-03-smarttax` | 403 Forbidden / RLS violation | High |
| **SEC-MT-05** | MT | Group Admin Global Oversight | User with `membership_role='owner'` in `org-01-huytech` queries all organizations | 200 OK — full visibility | Normal |
| **SEC-ST-01** | ST | SmartTax Raw Output Access | User from `org-06-media-creative` queries `ai_outputs` where `organization_id='org-03-smarttax'` AND `release_status='DRAFT'` | 0 rows returned | Critical |
| **SEC-ST-02** | ST | SmartTax Public Output Access | Any user queries `ai_outputs` where `organization_id='org-03-smarttax'`, `data_classification='PUBLIC'`, `release_status='PUBLIC_APPROVED'` | 200 OK — row returned | Normal |
| **SEC-ST-03** | ST | SmartTax External API Egress | SmartTax agent attempts call to non-allowlisted external domain | Blocked by `constraints.disallowed_external_domains=['*']` in Agent Card | Critical |
| **SEC-ST-04** | ST | SmartTax Raw Task Access via requested_by | User in `org-06-media-creative` queries tasks WHERE `requested_by_organization_id='org-06-media-creative'` AND `organization_id='org-03-smarttax'` | 0 rows — `requested_by_organization_id` does NOT grant task access | Critical |
| **SEC-ST-05** | ST | SmartTax Step Access | Any authenticated user queries `ai_task_steps` for SmartTax tasks | 0 rows — `ai_task_steps` is service-role only in MVP | Critical |
| **SEC-AC-01** | AC | Valid Agent Card V2 Registration | Insert `agent_versions` with valid JSON Schema 2.0 card, correct SHA-256 hash, `risk_ceiling=1` (integer) | 201 Created | Normal |
| **SEC-AC-02** | AC | Card Schema Validation Failure | Card missing required `governance` block or uses `"R1"` string instead of integer `1` for risk ceiling | 400 Bad Request — schema validation rejects | High |
| **SEC-AC-03** | AC | Hash Tampering Detection | `agent_card_hash` does not match `sha256(canonical_json(agent_card))` | Dispatcher rejects: `ERR_HASH_TAMPER` | Critical |
| **SEC-AC-04** | AC | Agent Card Mutation Attempt | Direct `UPDATE agent_versions SET agent_card=...` on existing version row | 403 — immutability trigger raises exception | Critical |
| **SEC-AC-05** | AC | Version Pointer Cross-Agent Invariant | `UPDATE agents SET current_agent_version_id=<uuid of other agent's version>` | Trigger raises: `current_agent_version_id % does not belong to agent %` | Critical |
| **SEC-POL-01** | POL | Classification Ceiling Exceeded | Agent in `org-06-media-creative` (ceiling `INTERNAL`) creates task with `data_classification='RESTRICTED'` | Rejected: `ERR_CEILING_EXCEEDED` | Critical |
| **SEC-POL-02** | POL | Risk Review Ceiling Bypass | Agent policy tries to set risk_level=3 (integer) task to auto-approve without human gate | Blocked — Group policy ceiling enforces `approval_required=true` for risk_level >= 3 | Critical |
| **SEC-POL-03** | POL | Budget Quota Exceeded | Department monthly token budget exhausted | Task rejected: `ERR_BUDGET_EXHAUSTED` | High |
| **SEC-POL-04** | POL | Default-Deny Delegation | Agent in `org-02-aischool` sends `DELEGATE` to `org-04-media-tech` with no policy rule | Rejected: `ERR_DELEGATION_NOT_PERMITTED` | High |
| **SEC-QINV-01** | QINV | Valid Envelope Dispatch | Message with matching `organization_id`, active `agent_id` (`enabled=true`), valid `agent_version_id`, correct `risk_level` (integer) | Dispatcher approves, dispatches to Dell node | Normal |
| **SEC-QINV-02** | QINV | Tenant Spoofing | Envelope claims `organization_id='org-01-huytech'` but `task.organization_id='org-03-smarttax'` | Dispatcher aborts, writes `error_code='ERR_HAIP_TENANT_VIOLATION'` to `ai_task_steps` | Critical |
| **SEC-QINV-03** | QINV | Disabled Agent Execution | Envelope targets agent with `agents.enabled=FALSE` | Rejected: agent not eligible, `status='FAILED'` set on task | High |
| **SEC-QINV-04** | QINV | Message Expiry | `expires_at` is in the past when message pulled from PGMQ | Message archived; task moved to `FAILED`; no execution | Normal |
| **SEC-QINV-05** | QINV | Replay Attack Resistance | Duplicate message with same `trace_id` + `task_id` received while prior is in-flight | Idempotency guard drops duplicate; no double execution | Normal |

---

## 3. Non-Canonical References Removed

The following column references from Phase 06K-A tests are corrected:

| Incorrect (06K-A) | Corrected (06K-A.1) | Reason |
| :--- | :--- | :--- |
| `agents.status == 'active'` | `agents.enabled = TRUE` | `agents.status` does NOT exist |
| `membership.role` | `membership.membership_role` | Column is `membership_role` |
| `status = 'active'` (lowercase) | `status = 'ACTIVE'` (uppercase) | CHECK constraint uses uppercase |
| `ai_task_steps.metadata` | `ai_task_steps.envelope` / `error_code` / `error_message` | `metadata` does NOT exist |
| `ai_task_steps.step_name` | (removed) | Does NOT exist |
| `ai_tasks.error_code` | (not used in task, use task status) | Does NOT exist in `ai_tasks` |
| `risk_level: "R2"` (string) | `risk_level: 2` (integer) | Column type is `integer` |
| `org-04-legal-gov` | `org-04-media-tech` | Non-canonical org ID |
| `org-05-ecommerce-auto` | `org-05-media-edu` | Non-canonical org ID |

---

## 4. Automation Implementation Notes

Phase 06K-B and 06K-C:
- All 24 cases → `tests/security/multi-org-isolation.test.ts`
- Automated in GitHub Actions CI (`ci.yml`) required check: **Quality Gate**
- CI branch matching fix: Change `feat/**` → `feature/**` in workflow triggers (see Section 16 of 06K-A.1 Design Report)
