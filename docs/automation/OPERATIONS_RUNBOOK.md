# OPERATIONS RUNBOOK
## AI-DEV-BRIDGE-A | HUY AI CENTER

---

## 1. Prerequisites & Toolchain Verification

Before initiating any automated task with the Codex × Antigravity Bridge, run the pre-flight verification:

```powershell
.\automation\agent-bridge\preflight.ps1
```

Or via npm:
```bash
npm run bridge:preflight
```

### Pre-flight Diagnostic Responses:
- **`READY`**: Tool is installed and authenticated.
- **`UNAVAILABLE`**: Optional CLI is missing (`codex`, `gh`). Bridge gracefully degrades.
- **`HUMAN_SETUP_REQUIRED`**: Mandatory tool is missing (`git`, `node`, `npm`).
- **`HUMAN_AUTH_REQUIRED`**: CLI is installed but requires interactive login. Run the official login command (e.g. `codex login` or `gh auth login`).

---

## 2. Launching an Automated Task

1. Prepare a task contract JSON file following `schemas/automation-task.schema.json`.
   Example:
   ```json
   {
     "taskId": "bridge-task-001",
     "title": "Refactor auth helper module",
     "objective": "Add typed error handling to auth token parser without touching public signatures",
     "repository": {
       "root": ".",
       "baseRef": "feature/ai-dev-bridge-a-codex-antigravity",
       "taskBranch": "agent-task/bridge-task-001"
     },
     "scope": {
       "allowedPaths": ["packages/auth/src/"],
       "forbiddenPaths": ["supabase/", ".env*", "config/"]
     },
     "risk": { "level": "R1", "reason": "Local refactoring on feature branch" },
     "execution": { "maxCycles": 3, "timeoutSeconds": 1800 },
     "verification": { "commands": ["npm run typecheck", "npm run test"] },
     "sourceControl": {
       "commitAllowed": true,
       "pushFeatureBranchAllowed": true,
       "prCreationAllowed": true,
       "mergeAllowed": false
     }
   }
   ```

2. Execute via orchestrator:
   ```powershell
   .\automation\agent-bridge\orchestrator.ps1 -TaskFile path/to/task.json
   ```

---

## 3. Monitoring & Inspecting Logs

Task execution traces and artifacts are persisted in `.artifacts/agent-bridge/<task-id>/`:
- `task.json`: Stamped task contract.
- `risk.json`: Deterministic static risk classification result.
- `plan.json`: Antigravity step-by-step implementation plan.
- `execution-cycle-<N>.json`: Codex execution diff, verification output, and test exit codes.
- `audit.json`: Antigravity auditor verdict (`PASS`, `CORRECTION_REQUIRED`, or `HUMAN_DECISION_REQUIRED`).

---

## 4. Recovering a Failed or Stalled Task

If a task terminates with `AUTOMATION_BLOCKED` or `RECOVERY_REQUIRED`:
1. The isolated worktree is preserved under `.agent-worktrees/<task-id>/`.
2. Inspect `git diff` in the worktree:
   ```bash
   cd .agent-worktrees/<task-id>
   git status
   git diff
   ```
3. Check `audit.json` to review why the self-correction cycle failed after 3 attempts.
4. Once addressed manually, commit the work or discard the worktree.

---

## 5. Worktree Cleanup

When a task has finished successfully and changes have been pushed:
```powershell
.\automation\agent-bridge\cleanup.ps1 -TaskId "bridge-task-001"
```

Safety constraints built into `cleanup.ps1`:
- Verifies path is within `.agent-worktrees/`.
- Verifies no uncommitted changes exist (unless `-Force` is supplied).
- Runs `git worktree prune` to keep repository metadata clean.
- Never touches main repository working copy.
