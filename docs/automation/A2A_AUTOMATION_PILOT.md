# AI Center A2A automation — task-branch pilot

This task-branch pilot replaces repeated copy/paste prompts with one local coordinator process. It is **not yet the full AI-DEV-BRIDGE-B acceptance result** or a standards-compliant Agent2Agent server.

## Scope

- Read `config/autonomy/system-roadmap.json` and validate serial DAG order, dependencies and risk.
- Stop at R3/R4 and block downstream tasks; no production or main mutation.
- Use Antigravity in headless read-only planning and auditing, with task context and diff supplied in the prompt.
- Use Codex as the sole code writer in an existing isolated worktree with `workspace-write`.
- Use an atomic process lock, per-task lease and phase ownership record in ignored `.artifacts/`.
- Run shared-package build and roadmap verification commands; enforce allowed paths and block production paths.
- With `--execute`, commit and push only `agent-task/*`, fast-forward only `feature/*`. Default invocation stops at `AWAITING_REVIEW`.
- A capacity failure records `TOOL_CAPACITY_WAIT`; the next timer tick may retry. Other failures remain BLOCKED for inspection.

## One-time WSL connection and validation

The user-host WSL worktree is separate from ChatGPT's execution environment. Before installing any background timer, update the existing local task branch from GitHub and validate it in WSL. Do not run the runner directly from the task branch: its coordination root is the feature worktree.

```bash
cd ~/workspace/huy-ai-center/.agent-worktrees/bridge-b-autonomous-backlog
git fetch origin agent-task/bridge-b-autonomous-backlog
git merge --ff-only FETCH_HEAD
npm run build:shared
npm run typecheck
npm run test:bridge
npm run test:a2a
```

Inspect the diff and run a supervised dry run before integrating the task branch into the feature branch. The runner intentionally does not start from the task worktree. After successful review and feature integration, the feature root can invoke `npm run bridge:a2a` (review mode) or `npm run bridge:a2a -- --execute` (R0–R2 automation). The timer installer at `automation/agent-bridge/install-a2a-timer.sh` is a **separate one-time host action** and requires a functioning WSL systemd user manager. WSL must be running for the timer to fire.

## Outstanding acceptance work

This pilot still needs WSL end-to-end execution with authenticated CLIs, a real auditor result, safe stale-lease recovery, full 15+ Bridge-B acceptance cases, integration with the existing TypeScript `runTask()` loop, and independent Antigravity final audit. Claude Free and a separate Gemini Pro CLI are not wired into the runtime. ChatGPT remains the planning and review interface; unattended invocation of ChatGPT requires a separately authorized API integration. Do not present this pilot as a completed five-provider A2A system or deploy it to production.
