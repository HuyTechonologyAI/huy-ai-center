# AUTONOMY MODEL — R0-R4 Risk Framework
## AI-DEV-BRIDGE-A | HUY AI CENTER

---

## 1. Design Principle

> **AI models may SUGGEST a lower risk tier. The static policy always wins.**

```
effective_risk = MAX(static_policy_risk, model_suggested_risk)
```

Never use MIN(). Never allow a model to self-classify into a lower tier.

---

## 2. Risk Tiers

### R0 — Fully Automatic (Read / Analyze / Plan)
**Approval:** AUTO  
**Sandbox:** Not required  

Actions:
- Read files, search codebase
- Summarize, analyze, plan
- Generate documentation
- Inspect schema (read-only)

### R1 — Fully Automatic (Feature Branch Work)
**Approval:** AUTO  
**Sandbox:** Not required  

Actions:
- Edit source in isolated feature branch
- Refactor code
- Generate or fix tests
- Fix lint / type errors
- Update non-production documentation
- Update non-sensitive configuration

### R2 — Automatic with Sandbox
**Approval:** AUTO  
**Sandbox:** REQUIRED  

Actions:
- Local build (`npm run build`)
- Local dry-run / migration simulation
- Dependency updates on feature branch
- `git commit` on task/feature branch
- `git push` to feature branch (not main)
- `gh pr create` / `gh pr edit`
- Browser preview testing

### R3 — Human Required
**Approval:** HUMAN_REQUIRED  
**Sandbox:** N/A — blocked until human approves  

Actions:
- Merge any protected branch (including main)
- Production deploy (`vercel --prod`)
- External communications
- Production database writes
- Production queue enqueue
- `gh pr merge`

### R4 — Human Owner Required
**Approval:** HUMAN_OWNER_REQUIRED  
**Sandbox:** N/A — blocked until Human Owner approves  

Actions:
- Production database DDL (CREATE TABLE, DROP TABLE, ALTER TABLE)
- TRUNCATE / DELETE without explicit controlled scope
- DNS / Cloudflare mutations
- IAM changes
- Secret rotation / credential export
- Financial transactions
- Legal / tax submissions
- `git push --force` / history rewrite
- Production deletion

---

## 3. Automatic Actions (No Human Needed)

The bridge runs these **without asking** for R0-R2:

- Repository reads, documentation research
- Architecture analysis
- Feature-branch edits (lint, typecheck, tests, build)
- Dry-runs
- Temporary worktree creation / deletion (own worktrees only)
- `git commit` on task branch
- `git push` to feature branch
- `gh pr create`, `gh pr edit`
- Generate reports, collect CI results

---

## 4. Forbidden Auto-Actions (Always Blocked)

These are BLOCKED regardless of model suggestion:

```
git push --force
git push -f
git push origin main
git reset --hard          (outside own worktree)
git clean -fdx            (outside own worktree)
vercel --prod
supabase db push          (production)
supabase migration up     (production)
DROP DATABASE
DROP TABLE                (production)
TRUNCATE                  (production)
DELETE FROM               (without controlled scope)
Cloudflare DNS mutations
Secret rotation
Credential export
Production queue enqueue
Production deployment
env / printenv            (into stored logs)
gh pr merge
```

---

## 5. Human Interruption Rules

The bridge does NOT ask the Human Owner:

- "Should I continue?" ← R0-R2 continues automatically
- "Do you want me to fix lint?" ← automatic
- "Should I create a branch?" ← automatic
- "Should I commit?" ← automatic (task branch only)
- "Should I push?" ← automatic (feature branch only)
- "Should I create a PR?" ← automatic (R2)

The bridge DOES stop for:

- `HUMAN_AUTH_REQUIRED` — CLI needs login
- R3 actions — human approval package written to `.artifacts/approvals/`
- R4 actions — Human Owner approval package written to `.artifacts/approvals/`
- Irreducible architecture/business ambiguity that Antigravity cannot resolve
- Missing external access that cannot be resolved automatically
