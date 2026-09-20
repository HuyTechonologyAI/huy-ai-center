# HAIP IDEMPOTENCY & DUPLICATE PROTECTION MODEL

**Architecture Version:** V1.2  
**Protocol Version:** HAIP/1.0  
**Target Database:** Supabase PostgreSQL (`bdeluacbzbdflxubhpha`, Singapore)  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Operating Reality: At-Least-Once Delivery

In distributed asynchronous systems and message queues (such as Supabase PGMQ), **at-least-once delivery** is the fundamental transport guarantee. Network retransmissions, worker crashes before ACK/archive, and client browser retries inevitably result in duplicate message arrival.

### System Mandate:
```text
DUPLICATE DELIVERY OF THE SAME HAIP MESSAGE MUST NEVER CREATE DUPLICATE SIDE EFFECTS.
```

---

## 2. Multi-Layer Idempotency Anchors

HUY TECHNOLOGY AI CENTER enforces idempotency across three defensive layers:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENT / INGRESS LAYER: ai_tasks.idempotency_key         │
│    Prevents duplicate goal/task creation on browser retries │
├─────────────────────────────────────────────────────────────┤
│ 2. MESSAGE / STEP LAYER: ai_task_steps.message_id           │
│    Prevents duplicate step insertion or re-execution        │
├─────────────────────────────────────────────────────────────┤
│ 3. ARTIFACT LAYER: ai_outputs (task_id, artifact_ref, ver) │
│    Prevents duplicate artifact creation or storage bloat    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Constraints

### 3.1 Task Creation Ingress Idempotency
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_tasks_idempotency_key 
    ON public.ai_tasks (idempotency_key) 
    WHERE idempotency_key IS NOT NULL;
```
- When a user submits a goal via `POST /api/ai/tasks`, the client generates a unique UUID `Idempotency-Key` header.
- If the network drops and the user resubmits, the database returns the existing task record without spawning a duplicate DAG.

### 3.2 Inter-Agent Message Trace Idempotency
```sql
-- Unique message identifier across all task steps
ALTER TABLE public.ai_task_steps ADD CONSTRAINT uq_ai_task_steps_message_id UNIQUE (message_id);

-- Optional idempotency key for specific tool calls or external integrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_task_steps_idempotency_key 
    ON public.ai_task_steps (idempotency_key) 
    WHERE idempotency_key IS NOT NULL;
```
- Every HAIP envelope contains a cryptographically random `message_id`.
- If PGMQ redelivers a message because worker visibility timeout elapsed during a transient network blip, the worker checks:
  ```sql
  SELECT status FROM public.ai_task_steps WHERE message_id = :message_id;
  ```
  If already marked `COMPLETED`, the worker immediately skips execution, archives the queue message, and returns the cached result.

### 3.3 Artifact Versioning Idempotency
```sql
CONSTRAINT uq_ai_outputs_task_artifact UNIQUE (task_id, artifact_ref, version)
```
- Re-running a generation step with identical task ID, artifact reference, and version will execute `ON CONFLICT DO NOTHING` or `UPDATE` rather than creating duplicate orphaned artifact rows.

---

## 4. Idempotent Processing Lifecycle in Dispatcher

```text
[PGMQ MESSAGE RECEIVED]
          ↓
[EXTRACT message_id]
          ↓
Does ai_task_steps contain message_id?
  ├── YES & status == 'COMPLETED':
  │     ↳ Log duplicate delivery notice
  │     ↳ Call haip_archive_job(msg_id)
  │     ↳ EXIT (Zero side-effects)
  │
  ├── YES & status == 'RUNNING':
  │     ↳ Lease check (Is another worker actively heartbeating?)
  │     ↳ If active: ignore duplicate
  │     ↳ If abandoned: assume ownership and continue
  │
  └── NO:
        ↳ Insert ai_task_steps with status = 'RUNNING'
        ↳ Execute agent workflow / MCP tool
        ↳ Update ai_task_steps to 'COMPLETED'
        ↳ Call haip_archive_job(msg_id)
```
