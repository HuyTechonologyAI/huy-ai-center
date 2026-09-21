# PHASE 06I — AI CENTER SECURITY HARDENING & OPTIMIZATION REPORT

**PROJECT:** HUY TECHNOLOGY AI CENTER V1.2  
**INTER-AGENT PROTOCOL:** HAIP/1.0 (Huy AI Inter-Agent Protocol)  
**SUPABASE PROJECT:** HuyAI  
**PROJECT REF:** `bdeluacbzbdflxubhpha`  
**REGION:** Singapore (ap-southeast-1)  
**EXECUTION DATE:** 2026-09-21  
**STATUS:** **HARDENING APPLIED & VERIFIED 100%**  

---

## 1. MANDATORY SUMMARY

```
================================================================================
MIGRATION 10006:                           APPLIED (Code 0)
PUBLIC TABLES:                             34
MIGRATION HISTORY:                         7 (1 baseline + 6 migrations)
TRIGGER FUNCTION CLIENT EXECUTION:         DENIED (PUBLIC, anon, auth revoked)
ANON SECURITY DEFINER WARNING:             FIXED (Advisor: ABSENT)
AUTHENTICATED SECURITY DEFINER WARNING:    FIXED (Advisor: ABSENT)
AI_TASKS CLIENT INSERT:                    DENIED (Policy dropped)
AI_TASKS OWNER READ:                       ALLOWED (InitPlan cached auth.uid)
AI_OUTPUTS OWNER READ:                     ALLOWED (InitPlan cached auth.uid)
AI_TASK_STEPS CLIENT ACCESS:               DENIED (Server-Only RLS)
APPROVED_BY FK INDEX:                      PRESENT (idx_ai_tasks_approved_by)
NEW AI CENTER CRITICAL SECURITY FINDINGS:  NONE (0)
AI-JOBS READY MESSAGES:                    0
SMOKE TEST TASK:                           CANCELLED (Canonical transition v1 -> v2)
NODE:                                      huy-ai-node-01 OFFLINE
DISPATCHER:                                NOT DEPLOYED
NEXT_PHASE:                                07_HAIP_DISPATCHER_MOCK_V1
================================================================================
```

---

## 2. NEW MIGRATION EXECUTION RECORD

Migration File:
`supabase/migrations/20260921010006_ai_center_security_hardening.sql`

Execution Command:
```powershell
npx supabase db push
```

Execution Output:
```
Initialising login role...
Connecting to remote database...
Applying migration 20260921010006_ai_center_security_hardening.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260921010006_ai_center_security_hardening.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

- **Exit Code:** 0
- **Dry Run Verification:** Verified single pending migration prior to push.
- **Previous Migrations:** 100% untouched and preserved.

---

## 3. MIGRATION HISTORY PARITY

Command: `npx supabase migration list`

```json
{
  "migrations": [
    { "local": "20260921005127", "remote": "20260921005127", "time": "2026-09-21 00:51:27" },
    { "local": "20260921010001", "remote": "20260921010001", "time": "2026-09-21 01:00:01" },
    { "local": "20260921010002", "remote": "20260921010002", "time": "2026-09-21 01:00:02" },
    { "local": "20260921010003", "remote": "20260921010003", "time": "2026-09-21 01:00:03" },
    { "local": "20260921010004", "remote": "20260921010004", "time": "2026-09-21 01:00:04" },
    { "local": "20260921010005", "remote": "20260921010005", "time": "2026-09-21 01:00:05" },
    { "local": "20260921010006", "remote": "20260921010006", "time": "2026-09-21 01:00:06" }
  ],
  "message": "Migrations listed"
}
```

- **Total Entries:** Exactly 7 entries (1 baseline + 6 sequential migrations).
- **History Parity:** 100% in sync between local and remote.

---

## 4. SECURITY ADVISOR AUDIT

Command:
```powershell
npx supabase db advisors --linked --type security
```

Output:
```json
{
  "results": [
    {
      "name": "function_search_path_mutable",
      "level": "WARN",
      "detail": "Function `public.match_knowledge_chunks` has a role mutable search_path",
      "category": "LEGACY_HUYAI"
    },
    {
      "name": "auth_leaked_password_protection",
      "level": "WARN",
      "detail": "Leaked password protection is currently disabled.",
      "category": "LEGACY_HUYAI"
    }
  ]
}
```

### Verification Findings:
1. `anon_security_definer_function_executable` $\rightarrow$ **RESOLVED (ABSENT)**.
2. `authenticated_security_definer_function_executable` $\rightarrow$ **RESOLVED (ABSENT)**.
3. Direct execution on `public.check_ai_task_status_transition()` is revoked from `PUBLIC`, `anon`, and `authenticated`.
4. Trigger continues to operate safely internally for database-level state machine validation.
5. **New AI Center Critical Security Findings:** **NONE (0)**.

---

## 5. PERFORMANCE ADVISOR AUDIT

Command:
```powershell
npx supabase db advisors --linked --type performance
```

Output:
- `auth_rls_initplan` on `public.ai_tasks`: **RESOLVED (ABSENT)**.
- `auth_rls_initplan` on `public.ai_outputs`: **RESOLVED (ABSENT)**.
- All remaining findings in Performance Advisor belong to `LEGACY_HUYAI` (`item_reviews`, `knowledge_chunks`).
- **AI Center Performance Findings:** **NONE (0)**.

---

## 6. RLS POLICIES & ACCESS CONTROL MATRIX

Query: `SELECT tablename, policyname, cmd, roles, qual FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('ai_tasks', 'ai_outputs', 'ai_task_steps');`

| Table Name | Policy Name | Command | Target Roles | Access Qualification |
|:---|:---|:---:|:---:|:---|
| `ai_tasks` | `Service role full access on ai_tasks` | `ALL` | `service_role` | `true` |
| `ai_tasks` | `Users can view own tasks` | `SELECT` | `authenticated` | `(owner_user_id = (SELECT auth.uid()))` |
| `ai_outputs` | `Service role full access on ai_outputs` | `ALL` | `service_role` | `true` |
| `ai_outputs` | `Users can view outputs of own tasks` | `SELECT` | `authenticated` | `EXISTS (SELECT 1 FROM ai_tasks t WHERE t.id = ai_outputs.task_id AND t.owner_user_id = (SELECT auth.uid()))` |
| `ai_task_steps` | `Service role full access on ai_task_steps` | `ALL` | `service_role` | `true` |

### Client RLS Enforcement:
- **`public.ai_tasks` client INSERT:** **DENIED** (`"Users can insert own tasks"` policy dropped).
- **`public.ai_tasks` client UPDATE / DELETE:** **DENIED**.
- **`public.ai_tasks` client SELECT:** **ALLOWED** (Only for tasks where `owner_user_id = auth.uid()`).
- **`public.ai_outputs` client SELECT:** **ALLOWED** (Only for outputs belonging to owner's tasks).
- **`public.ai_task_steps` client access:** **DENIED** (Internal agent communication trace is strictly server-only).

---

## 7. COVERING FOREIGN KEY INDEX VERIFICATION

Query: `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_tasks' AND indexname = 'idx_ai_tasks_approved_by';`

```sql
CREATE INDEX idx_ai_tasks_approved_by ON public.ai_tasks USING btree (approved_by);
```
- **Status:** **PRESENT & ACTIVE**.

---

## 8. SYNTHETIC SMOKE TASK STATUS

Query: `SELECT id, intent, status, state_version, risk_context FROM public.ai_tasks WHERE intent = 'SYSTEM_SMOKE_TEST';`

```json
{
  "id": "7e020a8b-d0af-4ff0-a109-53379b2da8a8",
  "intent": "SYSTEM_SMOKE_TEST",
  "source_app": "phase-06h-c",
  "status": "CANCELLED",
  "state_version": 2,
  "risk_context": {
    "cancellation_note": "Phase 06H-C smoke test task retired to terminal CANCELLED state before Dispatcher launch"
  }
}
```

- **Transition Path:** Canonical transition `QUEUED` $\rightarrow$ `CANCELLED` permitted by trigger `check_ai_task_status_transition()`.
- **State Version:** Incremented from 1 to 2.
- **Audit & Safety:** Zero data deleted; permanently locked in terminal state so future Dispatcher instances will ignore it.

---

## 9. PGMQ QUEUE METRICS

Query: `SELECT * FROM pgmq.metrics('ai-jobs');`

- `queue_name`: `ai-jobs`
- `queue_length`: 0
- `queue_visible_length`: 0
- `total_messages`: 4 (all synthetic smoke test messages archived)
- **Ready messages:** **0**

---

## 10. TEST & TYPECHECK SUITE STATUS

- **Unit & Contract Tests (`npm test`):** **41/41 tests PASS (100%)**
  - Added test: `DB-Contract Parity: Architecture V1.2 Security & RLS Matrix`
  - `@huy-ai/contracts`: 25/25 PASS
  - `@huy-ai/shared`: 3/3 PASS
  - `@huy-ai/dispatcher`: 7/7 PASS
  - Task API & Worker Tests: 6/6 PASS
- **TypeScript Compile (`npm run typecheck`):** **0 errors** across all 5 workspace projects.

---

## 11. HARD STOP

```
================================================================================
PHASE 06I POST-MIGRATION SECURITY HARDENING COMPLETE.
DATABASE SECURITY & PERFORMANCE PROFILE: OPTIMAL (ZERO AI CENTER FINDINGS).
DISPATCHER WORKER: NOT DEPLOYED
LANGFLOW:          NOT DEPLOYED
N8N:               NOT DEPLOYED
OLLAMA:            NOT DEPLOYED
NEXT PHASE:        07_HAIP_DISPATCHER_MOCK_V1
================================================================================
```
