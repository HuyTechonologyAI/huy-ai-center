# HUMAN APPROVAL MATRIX
## AI-DEV-BRIDGE-A | HUY AI CENTER

---

## 1. Governance Principle

All engineering actions in the HUY AI CENTER ecosystem are governed by strict tiered autonomy.
Low-risk actions proceed automatically to minimize human interruptions.
High-risk, irreversible, financial, production, and architectural decisions require explicit Human Approval.

---

## 2. Comprehensive Decision Matrix

| Action / Operation | Scope / Target | Risk Tier | Approval Required | Gate Output / Action |
|---|---|---|---|---|
| Read files, search code, analyze AST | Local repository | **R0** | **AUTO** | Allowed immediately |
| Summarize docs, inspect schemas | Read-only inspection | **R0** | **AUTO** | Allowed immediately |
| Architectural planning & task breakdown | Antigravity (`agy -p`) | **R0** | **AUTO** | Allowed immediately |
| Edit code in feature branch | `feature/**` or worktree | **R1** | **AUTO** | Allowed immediately |
| Write / refactor unit tests | Test directories | **R1** | **AUTO** | Allowed immediately |
| Lint & formatting fixes | Non-production code | **R1** | **AUTO** | Allowed immediately |
| Typecheck fixes | Local TypeScript | **R1** | **AUTO** | Allowed immediately |
| Update non-production docs | `docs/**` | **R1** | **AUTO** | Allowed immediately |
| Local build | Isolated worktree | **R2** | **AUTO (Sandbox)** | Mandatory `workspace-write` sandbox |
| Local migration simulation / dry-run | Disposable DB / test container | **R2** | **AUTO (Sandbox)** | Isolated test environment only |
| Browser preview test | Local dev server | **R2** | **AUTO (Sandbox)** | Local ports only |
| Commit on task branch | `agent-task/**` | **R2** | **AUTO** | Formatted with Task ID |
| Push to feature branch | `feature/**` (not `main`) | **R2** | **AUTO** | Automatic push |
| Create / Update Pull Request | GitHub PR | **R2** | **AUTO** | PR created in draft/open status |
| Merge Pull Request | Target `main` or protected | **R3** | **HUMAN_REQUIRED** | Blocked — emits `.artifacts/approvals/<id>.json` |
| Production deployment | Vercel (`--prod`) | **R3** | **HUMAN_REQUIRED** | Blocked |
| Production DB write / mutation | Supabase Production (`HuyAI`) | **R3** | **HUMAN_REQUIRED** | Blocked |
| Production queue message | PGMQ `ai-jobs` production | **R3** | **HUMAN_REQUIRED** | Blocked |
| External communication | Slack / Email / Webhook | **R3** | **HUMAN_REQUIRED** | Blocked |
| Production DB DDL | `CREATE / ALTER / DROP TABLE` | **R4** | **HUMAN_OWNER_REQUIRED** | Strictly blocked |
| Destructive DB action | `TRUNCATE`, unscoped `DELETE` | **R4** | **HUMAN_OWNER_REQUIRED** | Strictly blocked |
| Force push / history rewrite | `git push -f`, `git push --force` | **R4** | **HUMAN_OWNER_REQUIRED** | Strictly blocked |
| Direct push to main | `git push origin main` | **R3** | **HUMAN_REQUIRED** | Blocked |
| Secret rotation & IAM changes | Supabase / GitHub / Cloudflare | **R4** | **HUMAN_OWNER_REQUIRED** | Strictly blocked |
| Financial transactions | Payment gateways, token costs | **R4** | **HUMAN_OWNER_REQUIRED** | Strictly blocked |
| Legal / tax declarations | SmartTax regulatory filings | **R4** | **HUMAN_OWNER_REQUIRED** | Strictly blocked |

---

## 3. Human Approval Artifact Contract

When an **R3** or **R4** action is detected by `risk-classifier.ts` or `command-guard.ts`, the execution loop immediately halts and writes:
`.artifacts/approvals/<task-id>.json`

The JSON payload strictly adheres to `schemas/approval-request.schema.json` and contains:
1. `taskId`: Unique ID of the stalled task.
2. `requestedAction`: The blocked command or operation.
3. `riskLevel`: `"R3"` or `"R4"`.
4. `whyApprovalRequired`: Plain-text rationale citing policy rules.
5. `affectedResources`: List of branches, tables, or external services affected.
6. `rollbackProcedure`: Safe recovery instructions.
7. `validationCompleted`: Pre-checks that passed prior to hitting the gate.
8. `recommendedNextStep`: Concrete action for Human Owner.
