# PHASE 06K-A.1: QUEUE ENVELOPE SPECIFICATION (RECONCILED)
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A1-QUEUE-001  
**Phase:** 06K-A.1 (Design Reconciliation — Zero Database Mutations)  
**Status:** RECONCILED — AUTHORITATIVE FOR PHASE 06K-B  

> **CORRECTION NOTE:** This document supersedes `06K_A_QUEUE_ENVELOPE_SPEC.md` from Phase 06K-A.  
> Corrections: 12 canonical HAIP message types restored; noncanonical types removed; `ai-jobs-dlq` removed; invariant verification uses verified column names only.

---

## 1. PGMQ Queue Architecture

- **Single queue:** `ai-jobs` (one PGMQ queue, no dead-letter queue)
- **DLQ design removed:** `ai-jobs-dlq` is NOT part of the canonical architecture. Failure handling uses:
  - PGMQ visibility timeout (message reappears after `vt` seconds if not archived/deleted)
  - `agents.enabled` check before dispatch (not `agents.status`)
  - `ai_task_steps.error_code` + `ai_task_steps.error_message` for failure audit
  - Task status transitions: `FAILED`, `CANCELLED`, `TIMEOUT`
  - `ai_tasks.retry_count` / `ai_tasks.max_retries` for retry tracking

---

## 2. Canonical HAIP Message Types (EXACTLY 12)

The `message_type` field in all envelopes MUST be one of exactly these 12 values:

| # | Message Type | Direction | Description |
| :- | :--- | :--- | :--- |
| 1 | `TASK` | Cloud → Node | Instruct agent to begin task execution |
| 2 | `PLAN` | Node → Cloud | Agent proposes execution plan before acting |
| 3 | `CLAIM` | Node → Cloud | Dispatcher/Worker claims ownership of a queued task |
| 4 | `DELEGATE` | Node → Cloud | Agent requests sub-task delegation to another agent |
| 5 | `TOOL_CALL` | Node → Cloud | Agent requests invocation of an external tool/MCP server |
| 6 | `RESULT` | Node → Cloud | Agent delivers partial or final result artifact |
| 7 | `REVIEW` | Cloud → Node | Human or supervisor reviews agent output |
| 8 | `CORRECTION` | Cloud → Node | Reviewer sends correction/feedback back to agent |
| 9 | `STATE_UPDATE` | Node → Cloud | Agent reports execution state change |
| 10 | `ERROR` | Node → Cloud | Agent reports unrecoverable error |
| 11 | `FINAL_CANDIDATE` | Node → Cloud | Agent proposes final output for approval |
| 12 | `APPROVAL_REQUEST` | Node → Cloud | Agent explicitly requests human approval gate |

> [!CAUTION]
> The following message types from Phase 06K-A documents are **NOT canonical** and must be removed from all code and documentation:
> `TASK_DISPATCH`, `TASK_CANCEL`, `TASK_PAUSE`, `TASK_RESUME`, `STEP_START`, `STEP_COMPLETE`,
> `TASK_COMPLETE`, `TASK_FAILED`, `HEARTBEAT`, `ARTIFACT_EMIT`, `SECURITY_ALARM`

---

## 3. Canonical HAIP Message Envelope V2 Schema

All messages enqueued via `pgmq.send('ai-jobs', payload)` MUST conform to this structure:

```json
{
  "$schema": "https://haip.huytech.vn/schemas/v2/queue-envelope.json",
  "envelope_version": "2.0",
  "message_id": "msg_01j9q2p8n0xyzw1234abcd5678",
  "message_type": "TASK",
  "priority": 2,
  "created_at": "2026-09-22T22:00:00.000Z",
  "expires_at": "2026-09-22T22:30:00.000Z",
  "retry_count": 0,
  "max_retries": 3,

  "routing": {
    "organization_id": "org-03-smarttax",
    "department_id": "dept-03-tax-research",
    "cost_center_code": "CC-03-SMARTTAX",
    "target_node_affinity": "dell-m4800-edge",
    "requested_by_organization_id": null
  },

  "identity": {
    "agent_id": "agent-tax-researcher",
    "agent_version_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "hierarchy_level": 1,
    "runtime_target": "node"
  },

  "governance": {
    "data_classification": "RESTRICTED",
    "risk_level": 2,
    "requires_human_approval": false,
    "audit_trail_level": "FULL"
  },

  "telemetry": {
    "trace_id": "trc_9a8b7c6d5e4f3a2b1c0d9e8f",
    "span_id": "spn_1a2b3c4d5e6f7a8b",
    "task_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "parent_step_id": null
  },

  "payload": {
    "action": "research_tax_circular",
    "input_artifacts": [],
    "parameters": {
      "circular_number": "78/2021/TT-BTC",
      "output_format": "structured_summary"
    },
    "budget_token_limit": 30000,
    "timeout_seconds": 240
  }
}
```

> [!NOTE]
> `governance.risk_level` is an **integer** (0–4), matching `ai_tasks.risk_level integer` and `agents.risk_ceiling integer`. Do NOT use string format `"R2"`.

---

## 4. Dispatcher Invariant Verification Protocol (5-Point Check)

Before dispatching any `TASK` message to a Worker Node, the Dispatcher MUST execute this verification using **verified production column names only**:

```
[PGMQ ai-jobs: TASK message received]
          │
          ▼
Step 1: Load task from ai_tasks
        WHERE id = envelope.telemetry.task_id
        Assert task.status = 'QUEUED' or 'CLAIMED'
          │
          ▼
Step 2: Org tenant check
        Assert: ai_tasks.organization_id == envelope.routing.organization_id
        (Column: ai_tasks.organization_id — added in 06K-B)
          │
          ▼
Step 3: Load agent from agents WHERE id = envelope.identity.agent_id
        Assert: agents.organization_id == ai_tasks.organization_id
        Assert: agents.enabled = TRUE           ← use agents.enabled (boolean, EXISTS)
        Assert: agents.health_status != 'error' ← use agents.health_status (text, EXISTS)
        -- Do NOT use agents.status (does NOT exist in production)
          │
          ▼
Step 4: Version invariant check
        Assert: agents.current_agent_version_id == envelope.identity.agent_version_id
        (Column: agents.current_agent_version_id — added in 06K-B)
          │
          ▼
Step 5: Classification ceiling check
        Assert: ai_tasks.data_classification <= org.data_classification_ceiling
        If org_id = 'org-03-smarttax': apply SmartTax egress lockdown
          │
          ▼
[DISPATCH to Worker Node]
```

### On Invariant Failure

```typescript
// Write failure audit using VERIFIED columns
await supabase.from('ai_task_steps').insert({
  task_id:        envelope.telemetry.task_id,
  message_type:   'ERROR',          // canonical HAIP type
  status:         'FAILED',
  error_code:     'ERR_HAIP_TENANT_VIOLATION',   // ai_task_steps.error_code EXISTS
  error_message:  `Envelope org mismatch: claimed=${claimed}, db=${dbOrg}`,  // EXISTS
  envelope:       envelope,          // ai_task_steps.envelope EXISTS
  result_payload: null               // ai_task_steps.result_payload EXISTS
});

// Update task status — use ai_tasks.status (EXISTS), NOT ai_tasks.error_code (NOT FOUND)
await supabase.from('ai_tasks').update({
  status: 'FAILED'
}).eq('id', envelope.telemetry.task_id);

// Allow PGMQ vt to expire — message retried up to max_retries, then archived
// No DLQ — retry state tracked via ai_tasks.retry_count (EXISTS)
```

---

## 5. Delivery Guarantees & Failure Handling

| Mechanism | Implementation |
| :--- | :--- |
| **At-least-once delivery** | PGMQ visibility timeout (`vt`) |
| **Deduplication** | Worker tracks active `trace_id` + `task_id`; drops duplicate if in-flight |
| **Retry tracking** | `ai_tasks.retry_count` incremented on each re-claim; bounded by `ai_tasks.max_retries` |
| **Terminal failure** | `ai_tasks.status = 'FAILED'`; step audit written via `error_code`/`error_message` |
| **Dead-letter** | **Not used.** Messages that exhaust retries remain archived by PGMQ internally |
| **Cancellation** | Task `status = 'CANCELLED'`; Dispatcher/Worker issue `AbortController.abort()` |
