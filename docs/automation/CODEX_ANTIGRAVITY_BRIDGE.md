# CODEX × ANTIGRAVITY BRIDGE — ARCHITECTURE
## AI-DEV-BRIDGE-A | HUY AI CENTER

---

## 1. Overview

The **Codex × Antigravity Bridge** is a lightweight local automation system that connects:

| Component | Tool | Role |
|---|---|---|
| **Planner / Auditor** | Antigravity (`agy -p`) | Interprets tasks, generates plans, audits results |
| **Implementer** | Codex (`codex exec --sandbox workspace-write`) | Writes code, refactors, runs fixes |
| **Orchestrator** | Bridge (`orchestrator.ps1` + `task-runner.ts`) | Drives the loop, enforces policies |
| **Human Owner** | Interruption-only on R3/R4 | Production gates, merges, destructive actions |

---

## 2. Execution Flow

```
USER TASK (task contract JSON)
   ↓
validateContract()        ← Schema + mergeAllowed=false enforced
   ↓
classifyTask()            ← Static risk: R0-R4 (deterministic)
   ↓
evaluateGate()            ← R0-R2 = AUTO | R3-R4 = HUMAN_GATE
   ↓
generatePlan()            ← agy -p "<planning prompt>"
   ↓
Plan schema validation
   ↓  (invalid → retry once → AGENT_PLAN_INVALID)
Codex Implementation
   ↓
codex exec --sandbox workspace-write --ephemeral "<prompt>"
   ↓
Verification commands     ← npm run typecheck, npm run test
   ↓
collectDiffStat()         ← git diff --stat HEAD (redacted)
   ↓
auditResult()             ← agy -p "<audit prompt>" → PASS / CORRECTION_REQUIRED / HUMAN_DECISION_REQUIRED
   ↓
PASS → autoCommit() → push feature branch → create PR (R2/AUTO)
   ↓
CORRECTION_REQUIRED → retry loop (max 3 cycles)
   ↓
HUMAN_DECISION_REQUIRED → produce ApprovalRequest → STOP
   ↓
AUTOMATION_BLOCKED (max cycles exceeded) → full report → STOP
```

---

## 3. Component Responsibilities

### Antigravity (agy)
- **Plans**: Receives task objective + scope → numbered implementation steps
- **Audits**: Receives diff stat + verification results → PASS / CORRECTION_REQUIRED / HUMAN_DECISION_REQUIRED
- **Does NOT**: Write code, push branches, merge, or change production

### Codex (codex exec)
- **Implements**: Executes approved plan steps in isolated worktree
- **Sandbox**: Always `--sandbox workspace-write` — never `danger-full-access`
- **Does NOT**: Change approved scope, access production, push, or merge

### Bridge (task-runner.ts + orchestrator.ps1)
- **Enforces**: Static risk policy, command guard, approval gate
- **Isolates**: One worktree per task
- **Commits**: Only on task branches, only after PASS
- **Redacts**: All secrets before logging

---

## 4. Worktree Layout

```
huy-ai-center/
  .agent-worktrees/          ← Git-ignored, never committed
    bridge-20260922-001/     ← Isolated per-task worktree
    bridge-20260922-002/
  .artifacts/                ← Git-ignored audit records
    agent-bridge/
      bridge-20260922-001/
        task.json
        risk.json
        plan.json
        execution-cycle-1.json
        audit.json
    approvals/
      bridge-20260922-001.json   ← R3/R4 approval requests
```

---

## 5. Agent Communication Protocol (Phase A)

No MCP bridge. No daemon. Agent-to-agent transfer via:

1. **Structured JSON files** in `.artifacts/agent-bridge/<task-id>/`
2. **CLI invocations** (`agy -p`, `codex exec`)
3. **Git worktree state** (read by both agents via standard git tools)

MCP integration and always-on orchestration belong to a later phase.
