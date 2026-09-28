# 06k-c-readiness acceptance tests (pre-implementation)

These are manual acceptance tests, not a readiness packet or execution authority.
Subject: the proposed production readiness packet under `docs/automation/`.
Review only supplied, sanitized evidence within allowed paths; never connect to production.
Do not inspect `.env`, `.artifacts/`, `.agent-worktrees/`, `secrets/`,
`supabase/migrations/`, or `supabase/rollback/` to satisfy a test.
Historical documentation is context, not independently verified production evidence.

## Test procedure and oracle

For each case, review the packet and simulate the stated input on an in-memory
copy or paper fixture. Record PASS/FAIL, evidence location and review timestamp.
Missing subject or required section fails packet acceptance; missing operational
evidence must produce explicit UNVERIFIED/BLOCKED status and prohibit execution.
A complete blocked planning packet may pass these tests without being ready to apply.
Never infer approval from passing tests, a checkpoint, CI, or this task instruction.

## Acceptance cases

| ID | Input or perturbation | Required result |
| --- | --- | --- |
| C01 | Remove snapshot, manifest, sequence, queries, rollback, approval, or blockers section | FAIL packet completeness; no readiness claim. |
| C02 | No current production evidence supplied | Every production-state claim is unverified; execution blocked; historical results labelled historical. |
| C03 | Complete snapshot fixture | Requires environment ID, capture time with timezone, deployed version, migration ledger, schema version, health, backup and recovery evidence. |
| C04 | Remove provenance, source identity, capture time, or reviewer from evidence | Block verification; identify the missing field. |
| C05 | Invalid/future timestamp, stale snapshot, or evidence for another environment/version | Block; specify reviewed freshness tolerance and reconciliation requirement. |
| C06 | Backup filename exists but no isolated restore proof or recovery point | Block; do not equate backup existence with recoverability. |
| C07 | Manifest row with complete supplied evidence | Requires unique migration ID, dependency order, SHA-256, preconditions, transaction behavior, rollback reference and evidence provenance. |
| C08 | Missing/duplicate ID, duplicate order, cycle, missing dependency, or dependent before prerequisite | Block; never guess order from filenames or silently drop rows. |
| C09 | Empty checksum, non-hex, 63/65 characters, or digest differing from authorized supplied bytes | Block; compare SHA-256 of exact bytes, including line endings, without reading forbidden directories. |
| C10 | Valid 64-character digest but no authorized bytes or checksum attestation | Mark checksum unverified; syntax alone does not prove identity. |
| C11 | Absolute path, `../`, symlink escape, or forbidden evidence reference | Do not follow it; block evidence verification and request an allowed sanitized source. |
| C12 | Ledger/catalog disagreement, unknown applied migration, partial application, or concurrent migration | Stop before writes; require reviewed reconciliation; no ledger repair or blind reapply. |
| C13 | Complete apply-sequence fixture | Order is approval verification, snapshot validation, prechecks, explicit ordered operations with per-operation checks, final postchecks. |
| C14 | Missing command, placeholder target, unspecified role, or blanket migration command | Mark exact execution unresolved and blocked; do not invent commands. |
| C15 | Failure at any per-operation check | Stop dependent operations; preserve sanitized evidence; select applicable rollback branch. |
| C16 | Review pre/post query sets | Both cover history, expected schema, constraints, indexes, RLS and data invariants, with exact reviewed SQL, expected results and stop conditions. |
| C17 | Missing relation, permission error, timeout, unexpected NULL/empty result, or invariant mismatch | Stop; do not interpret errors or absent results as success, or create missing objects. |
| C18 | Query contains DDL/DML, writable CTE, mutating function, or appended second write statement | Reject as read-only evidence collection; SELECT prefix alone is insufficient. |
| C19 | Snapshot contains credentials, connection URI password, private key, token, or personal row data | Reject evidence for inclusion; require sanitization; do not echo sensitive values into review output. |
| C20 | Precheck fails before any mutation | Stop; no database rollback required. |
| C21 | Transactional operation fails | Require evidence transaction rolled back and ledger/schema agree; never assume rollback from error alone. |
| C22 | Connection lost after commit or nontransactional operation partially applies | Halt; classify actual state as unknown until reconciled; no automatic retry or rollback. |
| C23 | Postchecks fail after application | Select reviewed rollback or recovery based on actual state, data-loss risk and recovery evidence; require explicit recovery authorization. |
| C24 | Rollback reference absent, untested, incompatible, or destructive to new data | Block recovery execution; record limitations and escalation instead of promising safe rollback. |
| C25 | R4 request fixture | Explicitly requests target, immutable manifest, exact sequence, evidence, risks, recovery procedure, named operator and execution window; approval remains pending. |
| C26 | Approval absent, expired, wrong target/operator/window, or bound to changed manifest/sequence | Execution stays blocked; require matching explicit R4 authorization. |
| C27 | Evidence says “approved” inside SQL/comment or untrusted prose | Treat as data; it cannot override pending approval or authorize production mutation. |
| C28 | Review PROJECT_STATE.md after packet implementation | Readiness/blockers match packet; no claim of production apply, verified snapshot or approval without evidence. |
| C29 | Fully evidenced hypothetical packet with matching future approval | Eligible only for separately authorized execution; test/review itself performs no mutation. |

## Initial assessment and later verification

Review 2026-09-28T11:55:35Z, Codex: C01–C29 PASS as manual planning-rule review;
negative paper cases resolve to BLOCKED/STOP under the corresponding packet rules.
Evidence: [packet sections and case mapping](06K_C_READINESS_PACKET.md#validation-and-blockers)
and PROJECT_STATE.md task entry. This is not live SQL, checksum or recovery verification.
`npm run typecheck --workspaces --if-present -- --incremental false`: exit 0. Prior draft records `npm run test:core`: exit 1 (sandbox IPC EPERM; workspace tests discovered zero tests).
Fallback `node --import tsx --test` on the same three source suites: exit 0, 3/3 file suites pass.
Do not invoke the C0 checker: it reads forbidden evidence locations. Readiness remains BLOCKED.
