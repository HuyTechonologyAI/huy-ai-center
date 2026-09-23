# Agent Bridge — README
## AI-DEV-BRIDGE-A: Codex × Antigravity Automation Foundation

**Phase:** AI-DEV-BRIDGE-A  
**Project:** HUY AI AGENCY GROUP V2.0 / HUY AI CENTER  
**Repository:** `huy-ai-center`  

---

## Purpose

This bridge connects **Antigravity** (Planner/Auditor) with **Codex** (Implementer) for safe, automated engineering tasks — without repeatedly interrupting the Human Owner.

Human interruption occurs ONLY for R3/R4 actions (production merges, DDL, secrets, infrastructure changes).

---

## Architecture

```
Human Owner
    |
    v
AI Dev Governor (orchestrator.ps1)
    |
    +-----------------------+
    |                       |
    v                       v
Antigravity              Codex
agy -p "<plan>"          codex exec
Planner / Auditor        --sandbox workspace-write
    |                    Implementer
    +-----------+-----------+
                |
                v
        Isolated Git Worktree
        .agent-worktrees/<task-id>/
                |
                v
       Verification Commands
       (npm run typecheck, test)
                |
                v
       Antigravity Audit
       (agy -p "<audit>")
                |
           PASS / FAIL
                |
       +--------+--------+
       |                 |
      PASS          CORRECTION
       |             (max 3 cycles)
       v                 |
  commit + push    Codex retry
  feature branch        |
       |           → AUTOMATION_BLOCKED
       v            (if still failing)
      PR
       |
  Human Gate (R3/R4 only)
```

---

## Risk Model (R0–R4)

| Level | Approval | Examples |
|---|---|---|
| R0 | AUTO | Read, search, plan, document |
| R1 | AUTO | Edit feature branch, tests, lint, typecheck |
| R2 | AUTO + sandbox | Build, commit, push feature branch, create PR |
| R3 | HUMAN_REQUIRED | Merge protected branch, production deploy, external write |
| R4 | HUMAN_OWNER_REQUIRED | Production DDL, secret rotation, DNS/IAM, force push |

**INVARIANT:** `effective_risk = MAX(static_policy_risk, model_suggested_risk)`. AI suggestions cannot lower risk tier.

---

## File Structure

```
automation/agent-bridge/
  orchestrator.ps1      Main entry point
  preflight.ps1         Tool availability check
  cleanup.ps1           Safe worktree cleanup
  src/
    index.ts            Public API + preflight + validateContract
    types.ts            Shared TypeScript types
    risk-classifier.ts  Static, deterministic risk engine
    command-guard.ts    Per-command ALLOW/DENY/HUMAN_REQUIRED
    approval-gate.ts    Policy loader + gate evaluation
    log-redactor.ts     Secrets scrubber
    worktree-manager.ts Git worktree isolation
    antigravity-adapter.ts  agy CLI wrapper
    codex-adapter.ts    codex CLI wrapper (sandbox only)
    result-auditor.ts   Diff + verification collector
    task-runner.ts      Full execution loop (max 3 cycles)
```

---

## Usage

### Pre-flight check
```powershell
.\automation\agent-bridge\preflight.ps1
```

### Run bridge tests
```bash
npm run test:bridge
```

### E2E dry-run
```bash
npm run bridge:dry-run
```

### Execute a task
```powershell
.\automation\agent-bridge\orchestrator.ps1 -TaskFile path/to/task.json
```

### Cleanup a worktree
```powershell
.\automation\agent-bridge\cleanup.ps1 -TaskId "bridge-20260922-001"
```

---

## Security

- **Command guard** blocks force push, push-to-main, DROP, TRUNCATE, DELETE, vercel --prod, env dumps
- **Log redactor** scrubs all secrets before storage
- **Worktree isolation** prevents concurrent edits to the same file tree
- **Codex sandbox:** always `--sandbox workspace-write` — never `danger-full-access`
- **No MCP bridge** in Phase A — agent-to-agent via structured files and CLI only

---

## CLI Status at Foundation

| Tool | Status |
|---|---|
| `git` | ✅ INSTALLED |
| `node` | ✅ INSTALLED (v24) |
| `npm` | ✅ INSTALLED (v11) |
| `agy` | ✅ INSTALLED (v1.2.3) |
| `codex` | ❌ NOT INSTALLED → CODEX_UNAVAILABLE |
| `gh` | ❌ NOT INSTALLED → PR via web UI |
