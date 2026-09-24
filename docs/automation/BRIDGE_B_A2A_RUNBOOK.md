# AI-DEV-BRIDGE-B: WSL2 operation

Run from the clean coordination branch `feature/ai-dev-bridge-b-autonomous-backlog` on Ubuntu WSL2. The runner reads `config/autonomy/system-roadmap.json`, creates a task worktree when needed, calls the existing `runTask()`, and stops at R3/R4. It does not merge to `main` or touch production.

## Preflight

```bash
cd ~/workspace/huy-ai-center
npm ci
npm run build:shared
npm run typecheck
npm run test:bridge
git status --short --branch
command -v codex
command -v agy
```

`npm ci` requires a working package registry. Configure Antigravity's headless command permission narrowly for the repository's read-only inspection commands before automatic execution; do not use `--dangerously-skip-permissions`. A headless denial must stop the runner. Authentication for each CLI is done interactively once before automation.

## Required live acceptance

```bash
npm run bridge:acceptance:live
```

This requires both CLIs and runs a real Codex implementation and Antigravity review. It must end with COMPLETE. Each run uses a unique test branch; after PASS it saves the audit receipt in `.artifacts/agent-bridge/acceptance/` and removes only its own fixture worktree, branch, and detailed temporary artifacts. If it fails, the worktree and logs remain for inspection. Keep committed regression test sources under `tests/automation/`.

An eligible backlog run writes six append-only checkpoints under `.artifacts/agent-bridge/checkpoints/<task-id>/`: RECEIVED, PLAN, DECOMPOSITION, IMPLEMENTATION, CROSS_REVIEW, DELIVERY. The latest pointer is published only after evidence is saved. The next run verifies the latest evidence hash and stops on an unfinished checkpoint, invalid dependency, or R3/R4 gate. Inspect BLOCKED rather than deleting state or resetting branches.

The previously merged `bridge-b-core` is historical work and has been removed from the pending DAG. The first pending node is read-only `06k-c-readiness`. Execution refuses to start without a real authenticated E2E receipt tied to a commit whose bridge code has not changed. A green CI run alone does not attest that authenticated AI E2E ran.

## Inspect the next task without executing

```bash
npm run bridge:backlog:status
```

## Run one eligible task

```bash
npm run bridge:backlog:run
```

A successful invocation completes at most one task, pushes its task branch, fast-forwards the feature branch, and pushes that feature branch. Review `.artifacts/agent-bridge/backlog-state.json` for status. Subsequent invocations advance the DAG, stopping behind the R4 production gate. A pre-existing lease or `RUNNING` state requires inspection of the owning process/worktree; the runner never removes a stale lease automatically. If the first task worktree already exists, it must be clean on `agent-task/bridge-b-autonomous-backlog`.

Keep scheduled execution disabled until typecheck, the required live acceptance, and one supervised eligible task pass on that machine.
