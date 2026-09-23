# PHASE 06K-B: SECURITY & ISOLATION VERIFICATION RESULTS
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-B-SEC-001  
**Phase:** 06K-B (Multi-Org Migration Draft + Isolated Dry Run)  
**Status:** PASS — 34 / 34 SCENARIOS VERIFIED  
**Date:** 2026-09-23  

---

## 1. Security Suite Summary

The automated security suite (`tests/security/multi-org-isolation.test.ts`) executed 34 rigorous security scenarios across 6 critical operational domains against the isolated local Supabase PostgreSQL stack.

- **Total Scenarios:** 34
- **Passed:** 34
- **Failed:** 0
- **Duration:** 1,534 ms

---

## 2. Test Execution Matrix

### Domain 1: Multi-Tenant Data Isolation (MT)
| ID | Scenario | Result | Notes |
| :--- | :--- | :---: | :--- |
| `SEC-MT-01` | Intra-Org Task Read | **PASS** | Member in `org-02-aischool` reads own org task |
| `SEC-MT-02` | Cross-Org Task Read | **PASS** | Member in `org-06-media-creative` queries SmartTax task -> returns 0 rows |
| `SEC-MT-03` | Cross-Org Task Injection | **PASS** | Unauthorized INSERT into `org-01-huytech` rejected by RLS |
| `SEC-MT-04` | Cross-Org Dept Mutation | **PASS** | Cross-org UPDATE affects 0 rows; cross-org INSERT throws RLS violation |
| `SEC-MT-05` | Group Admin Global Oversight | **PASS** | Group admin in `org-01-huytech` retains visibility of all 6 canonical BUs |

### Domain 2: SmartTax Hermetic Vault (ST)
| ID | Scenario | Result | Notes |
| :--- | :--- | :---: | :--- |
| `SEC-ST-01` | SmartTax Raw Output Access | **PASS** | Outside user cannot view SmartTax `DRAFT` output (0 rows) |
| `SEC-ST-02` | SmartTax Public Output Access | **PASS** | `PUBLIC_APPROVED` + `PUBLIC` output is accessible cross-org |
| `SEC-ST-03` | SmartTax External API Egress | **PASS** | Constraint `disallowed_external_domains=['*']` verified |
| `SEC-ST-04` | SmartTax Raw Task Access via requested_by | **PASS** | `requested_by_organization_id` does NOT grant raw task access cross-org |
| `SEC-ST-05` | SmartTax Step Access | **PASS** | `ai_task_steps` returns 0 rows to all authenticated users (service-role only) |
| `SEC-ST-06` | Group Admin SmartTax Task Isolation | **PASS** | Strictest-wins: Group admin cannot read raw SmartTax tasks without SmartTax membership |
| `SEC-ST-07` | Group Admin SmartTax Output Isolation | **PASS** | Strictest-wins: Group admin cannot read non-public SmartTax outputs cross-org |

### Domain 3: Agent Card V2 Integrity & Immutability (AC)
| ID | Scenario | Result | Notes |
| :--- | :--- | :---: | :--- |
| `SEC-AC-01` | Valid Agent Card V2 Registration | **PASS** | SHA-256 hash calculation and schema compatibility verified |
| `SEC-AC-02` | Card Schema Validation Failure | **PASS** | String risk ceiling `"R1"` rejected; integer `1` accepted (schema correction) |
| `SEC-AC-03` | Hash Tampering Detection | **PASS** | Altered payload detected via SHA-256 mismatch |
| `SEC-AC-04` | Agent Card Mutation Attempt | **PASS** | `UPDATE agent_versions` rejected by `trg_agent_versions_immutability` |
| `SEC-IMMUTABLE-DEL` | Agent Card Deletion Attempt | **PASS** | `DELETE agent_versions` rejected by `trg_agent_versions_immutability` |
| `SEC-AC-05` | Version Pointer Invariant | **PASS** | Setting `current_agent_version_id` to another agent's version rejected |

### Domain 4: Policy Ceilings & Invariants (POL)
| ID | Scenario | Result | Notes |
| :--- | :--- | :---: | :--- |
| `SEC-POL-01` | Classification Ceiling Exceeded | **PASS** | `RESTRICTED` (rank 4) task rejected against `INTERNAL` (rank 2) org ceiling |
| `SEC-POL-02` | Risk Review Ceiling Bypass | **PASS** | `risk_level >= 3` with `approval_required=false` rejected by `chk_risk_approval` |
| `SEC-POL-03` | Budget Quota Exceeded | **PASS** | Budget threshold exhaustion evaluated deterministically |
| `SEC-POL-04` | Default-Deny Delegation | **PASS** | Cross-org delegation rejected without explicit policy |

### Domain 5: Queue & Dispatcher Invariants (QINV)
| ID | Scenario | Result | Notes |
| :--- | :--- | :---: | :--- |
| `SEC-QINV-01` | Valid Envelope Dispatch | **PASS** | Envelope matches task, active agent, version, and risk ceiling |
| `SEC-QINV-02` | Tenant Spoofing | **PASS** | Mismatch between envelope routing and task organization detected |
| `SEC-QINV-03` | Disabled Agent Execution | **PASS** | Execution blocked when `agents.enabled = false` |
| `SEC-QINV-04` | Message Expiry | **PASS** | Expired message identified and archived without execution |
| `SEC-QINV-05` | Replay Attack Resistance | **PASS** | In-flight idempotency key collision detected and dropped |

### Domain 6: Hardened Helpers & Legacy Compatibility
| ID | Scenario | Result | Notes |
| :--- | :--- | :---: | :--- |
| `SEC-LEGACY-01` | Legacy Owner Task Read Path | **PASS** | `owner_user_id` query continues to return own tasks for unmigrated legacy rows |
| `SEC-LEGACY-02` | Legacy Owner Output Access | **PASS** | Output access preserved via owner task relation |
| `SEC-RLS-01` | Memberships Direct Mutation | **PASS** | Default-deny for direct `INSERT` by authenticated users |
| `SEC-RLS-02` | Policies Direct Mutation | **PASS** | Default-deny for direct `INSERT` by authenticated users |
| `SEC-FUNC-01` | Security Definer Search Path | **PASS** | Functions strictly pinned to `search_path = public, pg_temp` |
| `SEC-FUNC-02` | Helper EXECUTE ACL | **PASS** | Execution revoked from `PUBLIC` role on all 3 security helpers |
| `SEC-CLASS-01` | Mathematical Classification Rank | **PASS** | `CONFIDENTIAL` (3) > `INTERNAL` (2) verified despite alphabetical order |
