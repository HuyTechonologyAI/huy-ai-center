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

## Inspect the next task without executing

```bash
npm run bridge:backlog:status
```

## Run one eligible task

```bash
npm run bridge:backlog:run
```

A successful invocation completes at most one task, pushes its task branch, fast-forwards the feature branch, and pushes that feature branch. Review `.artifacts/agent-bridge/backlog-state.json` for status. Subsequent invocations advance the DAG, stopping behind the R4 production gate. A pre-existing lease or `RUNNING` state requires inspection of the owning process/worktree; the runner never removes a stale lease automatically. If the first task worktree already exists, it must be clean on `agent-task/bridge-b-autonomous-backlog`.

This snapshot was not executed against the WSL2 CLIs; keep scheduled execution disabled until typecheck, acceptance tests, and one supervised R2 run pass on that machine.
