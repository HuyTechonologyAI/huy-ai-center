# AI-DEV-BRIDGE-B — Autonomous Backlog Runner

## Purpose

Extend the existing single-task Codex × Antigravity bridge into a controlled multi-task development loop that can complete R0-R2 engineering work without repeated Human Owner intervention while preserving hard R3/R4 gates.

## Non-negotiable role ownership

- **Antigravity:** planner and auditor only.
- **Codex:** implementation writer only.
- Antigravity must not edit implementation files while Codex owns a task.
- Codex must work only in an isolated task worktree.
- The primary repository worktree is coordination/read-only while a task is active.
- Default concurrency is **1**. Parallel execution is forbidden until explicit disjoint-path leasing is proven.

## Required execution state machine

```
DISCOVER
→ TOPOLOGY_VALIDATE
→ READY
→ LEASED
→ PLANNING
→ IMPLEMENTING
→ VERIFYING
→ AUDITING
→ CORRECTING (max 3)
→ COMMITTED
→ PUSHED
→ PR_READY
→ COMPLETED
```

Human-gated path:

```
READY
→ RISK_ASSESS
→ HUMAN_GATE (R3/R4)
→ WAITING_APPROVAL
```

A downstream task must never become READY until every dependency is COMPLETED.

## Runtime ownership / collision prevention

Create a runtime lease under:

```
.artifacts/agent-bridge/leases/<task-id>.json
```

Lease fields:

- taskId
- pid
- worktreePath
- taskBranch
- owner = CODEX_IMPLEMENTER
- phase
- acquiredAt
- expiresAt
- allowedPaths

Rules:

1. Atomic lease acquisition.
2. A second task may not acquire overlapping paths.
3. With maxConcurrency=1, any active lease blocks all other implementation tasks.
4. Stale leases may only be reclaimed after verifying the owning PID/worktree is inactive.
5. Lease files are never committed.

## DAG / backlog

Read `config/autonomy/system-roadmap.json`.

Implement:

- schema validation
- unique task IDs
- dependency existence validation
- Kahn topological cycle detection
- ready-node selection
- cascading BLOCKED state when a dependency fails
- human-gate blocking without bypass
- runtime state under `.artifacts/agent-bridge/backlog-state.json`

Do not mutate the committed roadmap's task status during execution; runtime status is separate.

## Integration with current single-task runner

Reuse `runTask()` rather than duplicating risk, planning, Codex execution, verification, audit, or correction logic.

For each READY R0-R2 roadmap node:

1. generate an in-memory TaskContract
2. create a unique branch `agent-task/<task-id>`
3. create isolated worktree
4. call existing task execution flow
5. if PASS, commit safely
6. push only the feature/task branch
7. update runtime state to COMPLETED
8. move to next topologically ready task

If a task returns HUMAN_GATE, persist approval request and keep all dependent tasks BLOCKED.

## Source-control automation

Allowed automatically:

- create agent-task/* branch
- commit scoped files
- push agent-task/* or feature/* branch
- create/update PR when `gh` is installed and authenticated

Forbidden automatically:

- push main
- force push
- merge PR into main
- delete protected branches

If `gh` is unavailable/auth-required, mark PR step `HUMAN_SETUP_REQUIRED` but keep completed code and pushed branch intact.

## Role lock

Add a machine-readable phase ownership file under runtime artifacts:

```json
{
  "taskId": "...",
  "phase": "IMPLEMENTING",
  "writeOwner": "CODEX",
  "antigravityMode": "READ_ONLY_AUDITOR"
}
```

During PLANNING/AUDITING, Antigravity may read the repository and diff but must not write files.
During IMPLEMENTING/CORRECTING, only Codex owns the worktree.

## Human gates

R3/R4 never auto-execute.

Examples:

- merge to main
- production deploy
- production DB writes
- production DDL
- DNS/IAM/secrets
- Dell deployment that changes runtime
- external communications

Generate one concise approval packet and stop that task.

## First roadmap

The committed roadmap intentionally puts `06k-c-production-apply` behind a Human Owner R4 gate. Bridge-B may automatically complete `06k-c-readiness`, but must not execute production migration without a new explicit approval.

## Tests required

Add tests for:

1. valid DAG ordering
2. cycle rejection
3. missing dependency rejection
4. serial maxConcurrency=1
5. overlapping path lease rejection
6. stale lease safe handling
7. Antigravity read-only ownership during Codex implementation
8. R0-R2 auto progression
9. R3/R4 HUMAN_GATE
10. dependent task remains blocked behind gate
11. no push to main
12. no force push
13. branch push allowed only for agent-task/* and feature/*
14. runtime state not committed
15. correction cycles max 3

## Acceptance

AI-DEV-BRIDGE-B is PASS only when:

- all new bridge tests pass
- existing 99 bridge tests remain green
- typecheck passes
- no production files or production database are modified
- collision between Antigravity and Codex is mechanically prevented in bridge-run mode
- roadmap can advance R0-R2 and stop deterministically at R3/R4
