# HAIP DATABASE STATE TRANSITION & OPTIMISTIC CONCURRENCY SPECIFICATION

**Architecture Version:** V1.2  
**Protocol Version:** HAIP/1.0  
**Target Database:** Supabase PostgreSQL (`bdeluacbzbdflxubhpha`, Singapore)  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Overview & Objective

To prevent race conditions, stale updates, and illegal bypasses of safety gates, HUY TECHNOLOGY AI CENTER V1.2 enforces the canonical **HAIP Task State Machine** directly at the PostgreSQL database layer via an automated trigger.

### Key Guarantees:
1. **Zero Illegal Transitions:** Any update attempting an invalid transition is immediately rejected with a PostgreSQL exception.
2. **Terminal State Lock:** Once a task reaches `COMPLETED`, `FAILED`, `CANCELLED`, or `EXPIRED`, no further state modifications are accepted.
3. **Monotonic Optimistic Versioning:** Every valid status transition automatically increments `state_version` by 1.
4. **Zero Search Path Vulnerabilities:** Trigger function executes with `SET search_path = public, pg_temp;`.

---

## 2. Deterministic Database Transition Matrix

The database trigger `trg_ai_tasks_status_transition` enforces the following exact transitions:

| Current (`OLD.status`) | Permitted Next (`NEW.status`) | Trigger Action |
|---|---|---|
| `CREATED` | `PLANNING`, `QUEUED`, `CANCELLED` | Increment `state_version`, update `updated_at` |
| `PLANNING` | `QUEUED`, `FAILED`, `CANCELLED` | Increment `state_version`, update `updated_at` |
| `QUEUED` | `CLAIMED`, `CANCELLED`, `EXPIRED` | Increment `state_version`, update `updated_at` |
| `CLAIMED` | `RUNNING`, `RETRY_WAIT`, `CANCELLED`, `EXPIRED` | Increment `state_version`, update `updated_at` |
| `RUNNING` | `REVIEWING`, `RETRY_WAIT`, `BLOCKED`, `FAILED`, `CANCELLED` | Increment `state_version`, update `updated_at` |
| `REVIEWING` | `CORRECTING`, `FINALIZING`, `AWAITING_APPROVAL`, `FAILED`, `CANCELLED` | Increment `state_version`, update `updated_at` |
| `CORRECTING` | `RUNNING`, `FAILED`, `CANCELLED` | Increment `state_version`, update `updated_at` |
| `BLOCKED` | `QUEUED`, `FAILED`, `CANCELLED` | Increment `state_version`, update `updated_at` |
| `RETRY_WAIT` | `QUEUED`, `FAILED`, `CANCELLED` | Increment `state_version`, update `updated_at` |
| `AWAITING_APPROVAL`| `APPROVED`, `CORRECTING`, `CANCELLED`, `EXPIRED` | Increment `state_version`, update `updated_at` |
| `APPROVED` | `FINALIZING`, `CANCELLED` | Increment `state_version`, update `updated_at` |
| `FINALIZING` | `COMPLETED`, `FAILED`, `CANCELLED` | Increment `state_version`, update `updated_at` |
| `COMPLETED` | *None* | **REJECTED** (Terminal lock) |
| `FAILED` | *None* | **REJECTED** (Terminal lock) |
| `CANCELLED` | *None* | **REJECTED** (Terminal lock) |
| `EXPIRED` | *None* | **REJECTED** (Terminal lock) |

---

## 3. Trigger Function Implementation

```sql
CREATE OR REPLACE FUNCTION public.check_ai_task_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- No change in status: allow update (e.g. heartbeat, cost increment)
    IF OLD.status = NEW.status THEN
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    -- Strict terminal state lock
    IF OLD.status IN ('COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED') THEN
        RAISE EXCEPTION 'Illegal state transition: Task % is in terminal state % and cannot transition to %',
            OLD.id, OLD.status, NEW.status;
    END IF;

    -- Validate transition
    IF (OLD.status = 'CREATED' AND NEW.status IN ('PLANNING', 'QUEUED', 'CANCELLED')) OR
       (OLD.status = 'PLANNING' AND NEW.status IN ('QUEUED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'QUEUED' AND NEW.status IN ('CLAIMED', 'CANCELLED', 'EXPIRED')) OR
       (OLD.status = 'CLAIMED' AND NEW.status IN ('RUNNING', 'RETRY_WAIT', 'CANCELLED', 'EXPIRED')) OR
       (OLD.status = 'RUNNING' AND NEW.status IN ('REVIEWING', 'RETRY_WAIT', 'BLOCKED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'REVIEWING' AND NEW.status IN ('CORRECTING', 'FINALIZING', 'AWAITING_APPROVAL', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'CORRECTING' AND NEW.status IN ('RUNNING', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'BLOCKED' AND NEW.status IN ('QUEUED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'RETRY_WAIT' AND NEW.status IN ('QUEUED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'AWAITING_APPROVAL' AND NEW.status IN ('APPROVED', 'CORRECTING', 'CANCELLED', 'EXPIRED')) OR
       (OLD.status = 'APPROVED' AND NEW.status IN ('FINALIZING', 'CANCELLED')) OR
       (OLD.status = 'FINALIZING' AND NEW.status IN ('COMPLETED', 'FAILED', 'CANCELLED')) THEN
        
        NEW.state_version := OLD.state_version + 1;
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Illegal state transition: Cannot transition task % from % to %',
            OLD.id, OLD.status, NEW.status;
    END IF;
END;
$$;
```

---

## 4. Optimistic Concurrency Control (OCC) Pattern

When the Dispatcher or worker agents update task status:
```sql
UPDATE public.ai_tasks
SET status = 'RUNNING',
    started_at = timezone('utc'::text, now())
WHERE id = :task_id
  AND state_version = :expected_version;
```
If another worker or operator has modified the task in the interim, `state_version` will not match, the update will affect 0 rows, and the worker can retry or back off safely without corrupting task state.
