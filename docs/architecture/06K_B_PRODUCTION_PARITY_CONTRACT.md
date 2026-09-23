# PHASE 06K-B: PRODUCTION PARITY CONTRACT (TWO-TIER MODEL)
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-B-PARITY-001  
**Phase:** 06K-B (Multi-Org Migration Draft + Isolated Dry Run)  
**Status:** PASS — TWO-TIER VERIFIED  
**Date:** 2026-09-23  

---

## 1. Two-Tier Parity Model Architecture

Phase 06K-B avoids false equivalence claims by strictly decoupling:

```
┌────────────────────────────────────────────────────────┐
│                      TIER 1 (LAYER A)                  │
│               LOCAL EXECUTION VALIDATION               │
├────────────────────────────────────────────────────────┤
│ • SQL Syntax & Parsing                                 │
│ • Local Migration Apply (001 -> 005)                   │
│ • Constraint & Unique Key Integrity                    │
│ • RLS & Trigger Behavior (Simulated Auth)              │
│ • Safe Idempotency (Second Apply = 0 Errors)           │
│ • Rollback Verification (Tables Restored to 34)        │
│ • Reapply Verification                                 │
└──────────────────────────┬─────────────────────────────┘
                           │ verified against
                           ▼
┌────────────────────────────────────────────────────────┐
│                      TIER 2 (LAYER B)                  │
│               PRODUCTION PARITY CONTRACT               │
├────────────────────────────────────────────────────────┤
│ • Read-Only Inspection of Live Production Ground Truth │
│ • Type Compatibility (`agents.id text`, integer risks)  │
│ • Preservation of Production Constraints               │
│ • Legacy RLS Compatibility ("Users can view own tasks")│
│ • Airgapped Production Isolation (ZERO writes)         │
└────────────────────────────────────────────────────────┘
```

---

## 2. Invariant Contract Matrix (Verified Ground Truth)

| Object | Column / Attribute | Production Contract Type | 06K-B Assumption | Parity Status |
| :--- | :--- | :--- | :--- | :---: |
| `public.agents` | `id` | `text` (e.g. `agent-tax-researcher`) | `text` | **PASS** |
| `public.agents` | `risk_ceiling` | `integer` (0–4) | `integer` | **PASS** |
| `public.agents` | `enabled` | `boolean` | `boolean` | **PASS** |
| `public.agents` | `health_status` | `text` | `text` | **PASS** |
| `public.agents` | `status` | DOES NOT EXIST | Avoided completely | **PASS** |
| `public.agent_versions` | `id` | `uuid` | `uuid` | **PASS** |
| `public.agent_versions` | `agent_id` | `text` (FK -> `agents.id`) | `text` | **PASS** |
| `public.agent_versions` | `version` | `text` (SemVer) | `text` | **PASS** |
| `public.agent_versions` | `uq_agent_version` | `UNIQUE (agent_id, version)` | Guarded idempotent check | **PASS** |
| `public.ai_tasks` | `id` | `uuid` | `uuid` | **PASS** |
| `public.ai_tasks` | `assigned_agent_id` | `text` (FK -> `agents.id`) | `text` | **PASS** |
| `public.ai_tasks` | `risk_level` | `integer` (0–4) | `integer` | **PASS** |
| `public.ai_tasks` | `error_code`/`message` | DO NOT EXIST | Avoided in task table | **PASS** |
| `public.ai_task_steps` | `message_type` | Exactly 12 enum values | Preserved | **PASS** |
| `public.ai_task_steps` | Policy posture | Service-role only | Zero user permissive policy | **PASS** |
| `public.ai_outputs` | `output_type`/`content` | DO NOT EXIST | Avoided completely | **PASS** |
| `pgmq.list_queues()` | Queue topology | Exactly 1 queue: `ai-jobs` | Verified 1 queue | **PASS** |

---

## 3. Production Isolation Guarantee

- **Target Project Ref:** `bdeluacbzbdflxubhpha` (Supabase Project `HuyAI`)
- **CLI Connection State:** Unlinked (`supabase unlink` executed).
- **Execution Target:** Isolated local Docker stack on `127.0.0.1:54322`.
- **Production Mutations:** Exactly ZERO.
