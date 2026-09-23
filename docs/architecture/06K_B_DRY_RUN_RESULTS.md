# PHASE 06K-B: DRY RUN & ISOLATION EXECUTION RESULTS
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-B-DRYRUN-001  
**Phase:** 06K-B (Multi-Org Migration Draft + Isolated Dry Run)  
**Status:** COMPLETE — 100% DRY RUN PASS  
**Date:** 2026-09-23  

---

## 1. Dry Run Lifecycle Summary

The isolated dry-run executed against local Supabase PostgreSQL stack (`127.0.0.1:54322`). All execution evidence was captured as machine-readable JSON under `.artifacts/06k-b/`:

```
.artifacts/06k-b/
  ├── preflight.json              # Local Docker Postgres verification & airgap check
  ├── baseline-contract.json      # 34 public tables & column type ground truth
  ├── migration-apply.json        # Timing & exit code for migrations 001 -> 005
  ├── schema-after.json           # 38 public tables after migration
  ├── seed-validation.json        # 6 orgs, 65 departments, 0 agents seeded
  ├── rls-tests.json              # Active RLS policies enumeration
  ├── security-tests.json         # 34/34 security test assertions
  ├── rollback.json               # Rollback execution & baseline restoration (34 tables)
  ├── reapply.json                # Reapplication execution & integrity check
  └── final-diff.json             # Cumulative schema and function diff
```

---

## 2. Step-by-Step Execution Verification

### Step 1: Baseline Contract Inspection
- **Baseline Tables:** 34 public tables
- **Initial Agents:** 0 rows
- **Initial Agent Versions:** 0 rows
- **Initial PGMQ Queue:** `ai-jobs` (0 ready messages)
- **Result:** **PASS**

### Step 2: First Migration Apply (001 -> 005)
- `20260923070001_06k_b_multi_org_foundation.sql`: 11 ms
- `20260923070002_06k_b_agent_registry_extensions.sql`: 22 ms
- `20260923070003_06k_b_operational_extensions.sql`: 47 ms
- `20260923070004_06k_b_reference_seed.sql`: 10 ms
- `20260923070005_06k_b_security_rls_immutability.sql`: 40 ms
- **Result:** **PASS** (Total duration: 130 ms)

### Step 3: Seed Validation
- **Organizations:** Exactly 6 canonical BUs
- **Departments:** Exactly 65 canonical departments
- **Production Agents Seeded:** 0
- **Agent Versions Seeded:** 0
- **Result:** **PASS**

### Step 4: Idempotency (Second Apply)
- Migrations 001 through 005 applied sequentially a second time.
- All DDL statements skipped existing relations via `IF NOT EXISTS` and catalog guards.
- Seed statements returned `INSERT 0 0` via `ON CONFLICT DO NOTHING`.
- **Result:** **PASS** (Zero catalog errors, zero duplicate rows)

### Step 5: Rollback Test
- Script: `supabase/rollback/06k_b_multi_org_rollback.sql`
- Execution: Successful in 31 ms.
- Verification: Public table count restored from 38 to 34.
- **Result:** **PASS**

### Step 6: Reapply Test
- Migrations 001 through 005 re-applied to verify clean state restoration.
- Verification: Public table count restored to 38; all 6 orgs and 65 depts intact.
- **Result:** **PASS**
