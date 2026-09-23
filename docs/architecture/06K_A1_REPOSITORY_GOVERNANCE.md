# PHASE 06K-A.1: REPOSITORY GOVERNANCE & CI CORRECTION NOTE
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A1-GOV-001  
**Phase:** 06K-A.1 (Design Reconciliation — Zero Database Mutations)  
**Status:** DESIGN PROPOSAL — Awaiting Human Owner Approval  

---

## 1. Current Repository State

| Repository | GitHub URL | Current Branches | Remote State |
| :--- | :--- | :--- | :--- |
| `edtech-ai-portfolio` | https://github.com/HuyTechonologyAI/edtech-ai-portfolio | `main` (production), `security/06j-d1d-nextjs-16.3.5` | SHA `c2e32438e406ab433bef0d94a43755b3e95490a1` on main |
| `huy-ai-center` | https://github.com/HuyTechonologyAI/huy-ai-center | `feature/06k-a-multi-org-db-design` (no main yet) | No `main` branch — remote created but empty default |

> [!IMPORTANT]
> **`huy-ai-center` has no `main` branch on GitHub.** The repository was created from a local-only git history and pushed as a feature branch. There is no fabricated merge history — only the actual commit sequence shown by `git log`.

---

## 2. Next.js Security Hotfix Status (edtech-ai-portfolio)

- **Hotfix:** Next.js 16.2.5 → 16.3.5
- **PR #2:** `security/06j-d1d-nextjs-16.3.5`
- **CI Status (Quality Gate):** SUCCESS
- **Vercel Preview:** READY
- **Current production `main` SHA:** `c2e32438e406ab433bef0d94a43755b3e95490a1`
- **Action required:** Human Repository Owner must review PR #2 and merge to production `main`

---

## 3. CI Branch Matching Correction Required

The current GitHub Actions workflow in `edtech-ai-portfolio` uses:

```yaml
# Current — INCORRECT for feature branch naming convention
on:
  push:
    branches:
      - feat/**
```

But all working branches use the naming convention `feature/**` (e.g. `feature/06k-a-multi-org-db-design`).

**Required correction:**
```yaml
# Corrected — matches actual feature branch naming
on:
  push:
    branches:
      - main
      - feature/**
      - security/**
      - hotfix/**
      - chore/**
  pull_request:
    branches:
      - main
```

> [!IMPORTANT]
> This correction must be applied to `edtech-ai-portfolio`'s `.github/workflows/ci.yml`.  
> This will be executed as part of Phase 06K-B scope (not applied now).  
> **Do NOT apply without Human Owner approval.**

---

## 4. Proposed `huy-ai-center` Repository Governance Setup

The following governance structure is PROPOSED. **None of this is applied — it requires Human Owner approval.**

### 4.1 Proposed Branch Strategy

```
main                  ← Production source of truth (protected, PR-only)
│
├── feature/**        ← Feature development branches (e.g. feature/06k-b-migration)
├── hotfix/**         ← Emergency production fixes
├── security/**       ← Security patches (fast-track review)
└── chore/**          ← Non-functional maintenance
```

### 4.2 Proposed `main` Branch Protection Rules

```yaml
Ruleset Name:   "Protect main — Production"
Target:         main
Enforcement:    Active

Rules:
  - Require pull request before merging
  - Required reviewers: 1 (Human Owner)
  - Require status checks to pass (Quality Gate CI)
  - Block force push
  - Block branch deletion
  - Require review thread resolution
  - Repository admin bypass: pull-request-only
```

### 4.3 Proposed CI Workflow for `huy-ai-center`

```yaml
name: CI Quality Gate
on:
  push:
    branches: [feature/**, hotfix/**, security/**, chore/**]
  pull_request:
    branches: [main]
jobs:
  quality-gate:
    name: Quality Gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
      - run: npm run typecheck --if-present
```

### 4.4 Safe Baseline Establishment Procedure

To create `main` from current feature branch work:

```bash
# PROPOSED — Do NOT execute without Human Owner approval

# 1. Create main from the current state
git checkout -b main feature/06k-a-multi-org-db-design

# 2. Push main to GitHub
git push -u origin main

# 3. On GitHub: set main as default branch

# 4. Apply branch protection ruleset on GitHub UI

# 5. Future work continues as feature branches → PR → merge to main
```

> [!CAUTION]
> Do NOT create or push `main` branch to GitHub without Human Owner explicit approval.  
> The AI agent will NOT execute this procedure autonomously.
