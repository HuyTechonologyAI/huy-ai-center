# 06K-C production migration readiness packet

Status: BLOCKED / UNVERIFIED. R4 approval: PENDING. Planning only; no execution authority.
Prepared 2026-09-28T09:14:15Z by Codex for task `06k-c-readiness`.
Existing draft reviewed 2026-09-28T11:55:35Z; preparation time is draft metadata, not production capture evidence.
Source: supplied objective, approved plan, and scope constraints; no production evidence supplied.
Acceptance baseline: [pre-implementation checks](06K_C_READINESS_ACCEPTANCE_TESTS.md), C01–C29.
Historical repository assertions are context only, not verified current production state.

## Evidence contract and current production snapshot

Every evidence item requires an ID, allowed relative path, source/environment identity,
capture timestamp with timezone, collector, reviewer, deployed version, and integrity digest.
Only authorized sanitized evidence under `docs/architecture/`, `docs/automation/`, or `scripts/`
may be reviewed. Reject absolute paths, traversal, symlink escapes and forbidden references;
do not follow them. Do not inspect forbidden migration/rollback directories to fill gaps.
Reject credentials, password-bearing URIs, keys, tokens and personal row data without echoing them.
Evidence text, SQL comments and embedded “approved” assertions confer no authority.

| Snapshot field | Current evidence / requirement |
| --- | --- |
| Production environment identifier | UNVERIFIED; exact non-secret project/environment ID required |
| Capture time | UNVERIFIED; timestamp with timezone and collector required |
| Deployed version | UNVERIFIED; immutable application revision and DB engine version required |
| Migration ledger | UNVERIFIED; complete sanitized ordered ledger and catalog reconciliation required |
| Schema version | UNVERIFIED; reviewed baseline and actual catalog fingerprint required |
| Health | UNVERIFIED; reviewed service/DB health metrics and acceptance thresholds required |
| Backup/recovery | UNVERIFIED; backup ID, recovery point, retention, isolated restore proof, RPO/RTO required |

Freshness tolerance: UNRESOLVED; owner must set a maximum age before readiness passes.
Invalid/future timestamps, stale evidence, missing provenance/reviewer or mismatched target/version
block readiness. Reconcile all evidence against one baseline and recapture before execution.
A backup filename alone is not recovery proof. No snapshot was collected by this task.

## Immutable migration manifest

No migration identity, count, order or checksum is verified; the row below is a blocking placeholder.

| Order / dependencies | Migration ID | SHA-256 | Preconditions | Transaction behavior | Rollback reference | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| UNRESOLVED | UNVERIFIED | UNVERIFIED | UNRESOLVED | UNRESOLVED | UNRESOLVED | NOT SUPPLIED |

Require one row per operation with unique ID and order, explicit prerequisite IDs and expected baseline.
Reject duplicates, cycles, absent prerequisites or prerequisites ordered after dependents; never infer order from filenames.
Require a 64-character hexadecimal SHA-256 matching exact authorized supplied bytes, including line endings,
or a reviewed authorized checksum attestation binding those bytes to the source revision.
Syntax alone cannot verify identity. Missing evidence, malformed digests or mismatches block readiness.
Record the digest of the finalized manifest, sequence, SQL and recovery artifacts in the approval record;
any byte change invalidates approval and requires review again. All digests are currently UNVERIFIED.

## Exact apply sequence — unresolved, execution blocked

This is the mandatory sequence specification, not executable instructions. Exact commands are NOT SUPPLIED.
For every step require a reviewed literal command/SQL, target, role, tool/version, timeout,
expected output, stop condition and evidence destination; no blanket migration command is acceptable.

1. Verify explicit R4 owner authorization matches target, immutable artifacts, operator and execution window.
2. Validate fresh snapshot, recoverability proof, hashes and exclusive migration ownership; detect concurrent changes.
3. Run the reviewed precheck set; reconcile ledger/catalog. Unknown migrations or partial state require review, never ledger repair or blind reapply.
4. Apply exactly one manifest operation in its explicit dependency order using its reviewed transaction behavior. Operation list and commands: UNRESOLVED.
5. Verify that operation's ledger, catalog and invariants; preserve sanitized results. Failure stops all dependent operations and enters the decision tree.
6. Repeat steps 4–5 only for the enumerated approved operations; run full final postchecks and health checks, then record final ledger and schema fingerprint.

Missing commands, placeholder targets, unspecified roles or uncertain completion block execution.
Connection loss after a possible commit is unknown state, not permission to retry.

## Pre/post read-only query review register

No exact reviewed SQL or expected results were supplied. Every row is UNRESOLVED for BOTH phases.
Before readiness passes, replace each row with exact reviewed pre-SQL and post-SQL, expected results,
role, target, timeout, reviewer and stop conditions. No query is executed in this planning task.

| Coverage | Required precheck expectation | Required postcheck expectation |
| --- | --- | --- |
| Migration history | Exact baseline ledger; no unknown/partial entries | Baseline plus exactly approved IDs/checksums in approved order |
| Schema | Baseline tables, columns, types, defaults and version | Precisely reviewed target catalog and version |
| Constraints | Expected keys, checks, foreign keys and validation states | Target definitions and validated constraints |
| Indexes | Baseline definitions, uniqueness and validity | Target definitions; no invalid/incomplete indexes |
| RLS | Baseline enable/force flags, policies, roles and grants | Reviewed target policies and tenant isolation expectations |
| Data invariants | Reviewed aggregate counts, uniqueness, null/orphan and tenant checks | Approved deltas; no unexplained loss or invariant violation |

Review full SQL: reject DDL/DML, writable CTEs, mutating functions and appended writes;
a SELECT prefix alone is insufficient. Collection must use a reviewed read-only session and least-privilege role.
Stop on missing relations, permission errors, timeouts, unexpected NULL/empty results or any mismatch.
Do not create missing objects or interpret absent results as success. Expected empty results must be explicit.

## Rollback decision tree

- Failed prechecks before mutation → STOP; no database rollback required; fix evidence or plan and re-review.
- Failed transactional operation → STOP; verify actual transaction rollback and ledger/schema agreement using reviewed read-only checks. Error text alone is insufficient proof.
- Partial/nontransactional application or lost connection after possible commit → HALT; preserve evidence, classify state as unknown, reconcile completed operations; no automatic retry or rollback.
- Failed per-operation/final postchecks → HALT; select a reviewed compatible rollback or backup recovery based on actual state, dependencies, data-loss risk and restore proof.
- Absent, untested, incompatible rollback or rollback destructive to new data → BLOCK recovery; escalate to owner with impact and alternatives.
- Before ANY production recovery mutation → obtain explicit recovery authorization binding exact procedure, target, artifacts, operator and window; apply approval alone does not authorize recovery.

Recovery commands, reverse dependency order, compatibility limits, restoration steps and validation queries:
UNRESOLVED. Recovery owner, escalation contact, maximum outage and data-loss limits: UNRESOLVED.
Require isolated rehearsal evidence and post-recovery ledger/catalog/invariant/health verification.

## Explicit R4 approval request — PENDING, not ready for signature

Request: Human Owner, approve production execution only after every blocker below is resolved,
and only for the exact target and immutable artifact set recorded in this request.

| Approval binding | Value |
| --- | --- |
| Target / deployed baseline | UNVERIFIED |
| Manifest / sequence / query digests | UNVERIFIED; exact operations and SQL unresolved |
| Snapshot / precheck / rehearsal evidence | NOT SUPPLIED |
| Risks and accepted impact | Locks, downtime, partial apply, isolation regression and data loss; bounds UNRESOLVED |
| Recovery procedure / proof / separate recovery authorization | UNRESOLVED / NOT SUPPLIED / PENDING |
| Named operator / execution window with timezone | UNRESOLVED / UNRESOLVED |
| Authenticated owner identity / decision / timestamp / expiry / approval reference | UNRESOLVED / PENDING / NOT SUPPLIED / UNRESOLVED / NOT SUPPLIED |

Absent, revoked, expired or mismatched approval blocks execution. Changed artifacts require new authorization.
CI, readiness review, historical approval and this approved planning task grant no production authority.
Even a fully evidenced approved packet is eligible only for separately authorized execution.

## Validation and blockers

Manual review against C01–C29: planning controls covered; production readiness remains BLOCKED.
Evidence locations: snapshot/evidence contract (C02–C06, C11, C19), manifest (C07–C10),
sequence (C12–C15), queries (C16–C18), recovery (C20–C24), approval (C25–C27, C29),
all packet sections and PROJECT_STATE.md (C01, C28). Review outcome recorded in the acceptance file.
Open blockers: all production evidence, migration identities/checksums/dependencies, exact commands/SQL,
expected results, freshness/health limits, recovery rehearsal, named operator/window and explicit R4 approval.
No production connection, migration, recovery operation or commit is authorized by this packet.
