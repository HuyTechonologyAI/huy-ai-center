# PHASE 06K-A: SECURITY & ISOLATION TEST MATRIX
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A-SEC-001  
**Phase:** 06K-A (Design Only)  
**System:** HUY AI CENTER / HAIP CONTROL PLANE  
**Author:** Principal AI Security & Quality Engineering  
**Status:** APPROVED DESIGN BASELINE  

---

## 1. Test Suite Architecture

The security verification framework for HAIP Multi-Org Database and Agent Card V2 consists of 24 rigorous test cases structured across 5 security domains:

1. **Multi-Tenant Data Isolation (MT)**: Cross-organization query and mutation boundaries.
2. **SmartTax Hermetic Vault (ST)**: Confidential financial and tax isolation rules.
3. **Agent Card V2 Integrity & Immutability (AC)**: Schema validation, cryptographic hash checks, and version immutability.
4. **Policy Engine & Ceilings (POL)**: Strictest-wins inheritance and governance ceilings.
5. **Queue Envelope Invariant Verification (QINV)**: PGMQ message tamper resistance.

---

## 2. Comprehensive Test Matrix

| Test ID | Domain | Scenario Description | Input / Condition | Expected Result | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-MT-01** | MT | Intra-Org Task Read | User with active membership in `org-02-edtech-ai` queries `ai_tasks` for `org-02` | `200 OK` — Tasks returned | Normal |
| **SEC-MT-02** | MT | Cross-Org Direct Task Read | User in `org-06-media-creative` queries `ai_tasks` belonging to `org-03-smarttax` | `403 Forbidden` / 0 rows returned (RLS filter) | Critical |
| **SEC-MT-03** | MT | Cross-Org Task Injection | User in `org-05-ecommerce-auto` inserts task specifying `organization_id = 'org-01-huytech'` | `403 Forbidden` / RLS check violation | Critical |
| **SEC-MT-04** | MT | Cross-Org Department Tamper | User in `org-02-edtech-ai` updates department in `org-03-smarttax` | `403 Forbidden` / RLS check violation | High |
| **SEC-MT-05** | MT | Group Admin Global Oversight | User with `owner` role in `org-01-huytech` queries all organizations | `200 OK` — Full visibility permitted | Normal |
| **SEC-ST-01** | ST | Direct Access to SmartTax Raw Output | Authenticated user from `org-06-media-creative` queries `ai_outputs` where `org_id = 'org-03-smarttax'` and `release_status = 'DRAFT'` | 0 rows returned | Critical |
| **SEC-ST-02** | ST | Access to Sanitized SmartTax Output | User from any org queries `ai_outputs` where `org_id = 'org-03-smarttax'`, `data_classification = 'PUBLIC'`, and `release_status = 'PUBLIC_APPROVED'` | `200 OK` — Row returned | Normal |
| **SEC-ST-03** | ST | SmartTax Direct External Egress Attempt | SmartTax agent attempts to invoke unapproved external public API tool | Blocked by runtime policy (`ERR_ST_EGRESS_BLOCKED`) | Critical |
| **SEC-ST-04** | ST | SmartTax Cross-Org Delegation without Human Gate | Agent in `org-03` attempts direct `DELEGATE` step to `org-06` without human reviewer sign-off | Rejected by Policy Engine (`ERR_UNAPPROVED_DELEGATION`) | Critical |
| **SEC-AC-01** | AC | Valid Agent Card V2 Registration | Register new version with complete JSON Schema 2.0 and valid SHA-256 hash | `201 Created` — Version registered | Normal |
| **SEC-AC-02** | AC | Card Schema Validation Failure | Card missing mandatory `governance.cost_tier` or `governance.risk_level` | `400 Bad Request` — Schema validation fails | High |
| **SEC-AC-03** | AC | Hash Tampering Detection | Provided `agent_card_hash` does not match `sha256(canonical(agent_card))` | Rejected with `ERR_HASH_TAMPER` | Critical |
| **SEC-AC-04** | AC | Agent Card In-Place Mutation Attempt | Direct `UPDATE` query on `agent_versions.agent_card` for an existing version | `403 Forbidden` / Prevented by immutability trigger | Critical |
| **SEC-AC-05** | AC | Model B Pointer Synchronization | Updating `current_agent_version_id` to a version ID belonging to a different agent | Rejected by FK / Trigger invariant check | Critical |
| **SEC-POL-01**| POL| Exceeding Org Data Classification Ceiling | Agent in `org-06-media-creative` (ceiling `PUBLIC`) creates task with `RESTRICTED` | Rejected with `ERR_CEILING_EXCEEDED` | Critical |
| **SEC-POL-02**| POL| Lowering Risk Level Review Ceiling | Subordinate agent policy configures `R4` risk task to execute without human review | Blocked — Group policy ceiling forces `requires_human_approval = true` | Critical |
| **SEC-POL-03**| POL| Department Quota Enforcement | Department budget exhausted for monthly token allocation | Task creation paused or rejected with `ERR_BUDGET_EXHAUSTED` | High |
| **SEC-POL-04**| POL| Default-Deny Cross-Org Delegation | Agent in `org-02` attempts `DELEGATE` to `org-05` without policy rule in `ai_policies` | Blocked with `ERR_DELEGATION_NOT_PERMITTED` | High |
| **SEC-QINV-01**| QINV| Valid Queue Envelope Dispatch | Message enqueued with matching `organization_id`, active `agent_id`, and valid `version_id` | Dispatcher approves, forwards to worker node | Normal |
| **SEC-QINV-02**| QINV| Envelope Tenant Spoofing | Message envelope claims `org-01-huytech`, but referenced `task_id` belongs to `org-03-smarttax` | Dispatcher aborts dispatch, logs critical tenant violation | Critical |
| **SEC-QINV-03**| QINV| Inactive Agent Execution Attempt | Message targets agent whose database status is `suspended` | Dispatcher rejects job, sets task status to `FAILED` | High |
| **SEC-QINV-04**| QINV| Stale / Expired Message Expiry | Message pulled from PGMQ whose `expires_at` is in the past | Message archived to DLQ without execution | Normal |
| **SEC-QINV-05**| QINV| Replay Attack Resistance | Duplicate message with same `message_id` and `trace_id` received while active | Idempotency guard drops duplicate | Normal |

---

## 3. Automation Implementation Guidelines

In Phase 06K-B and Phase 06K-C:
- **Unit & Integration Suite**: All 24 test cases will be codified into Jest/Vitest test suites under `tests/security/multi-org-isolation.test.ts`.
- **Automated CI Quality Gate**: Included in the GitHub Actions CI pipeline to prevent regressions before any PR merge into `main`.
