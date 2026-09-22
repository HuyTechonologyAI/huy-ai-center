# PHASE 06K-A: QUEUE ENVELOPE SPECIFICATION
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A-QUEUE-001  
**Phase:** 06K-A (Design Only)  
**System:** HUY AI CENTER / HAIP CONTROL PLANE  
**Queue Name:** `ai-jobs` (PostgreSQL PGMQ)  
**Author:** Principal AI Architecture & Infrastructure  
**Status:** APPROVED DESIGN BASELINE  

---

## 1. Executive Overview (D12)

The HUY AI CENTER utilizes a single unified PGMQ message queue named `ai-jobs` to orchestrate asynchronous tasks between the cloud control plane (Supabase) and execution runtimes (Dell PowerEdge M4800 on-premise node and cloud workers).

To preserve multi-tenancy, zero-trust boundaries, and audit traceability, all messages enqueued into `ai-jobs` MUST conform to the canonical **HAIP Message Envelope V2**.

The Dispatcher operates under a **Zero-Trust Envelope Contract**:
> "Never trust message claims without verifying against PostgreSQL ground truth."

---

## 2. Canonical HAIP Message Envelope V2 Schema

All messages passed to `pgmq.send('ai-jobs', payload)` MUST adhere to this exact JSON structure:

```json
{
  "$schema": "https://haip.huytech.vn/schemas/v2/queue-envelope.json",
  "envelope_version": "2.0",
  "message_id": "msg_01j7v6m8q0abcd1234efgh5678",
  "message_type": "TASK_DISPATCH",
  "priority": 1,
  "created_at": "2026-09-22T22:00:00.000Z",
  "expires_at": "2026-09-22T22:30:00.000Z",
  "retry_count": 0,
  "max_retries": 3,
  
  "routing": {
    "organization_id": "org-03-smarttax",
    "department_id": "dept-st-tax-compliance",
    "cost_center_code": "CC-ST-101",
    "target_node_affinity": "dell-m4800-edge",
    "requested_by_organization_id": "org-01-huytech"
  },

  "identity": {
    "agent_id": "agent-st-tax-advisor-01",
    "agent_version_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "hierarchy_level": 1,
    "runtime_target": "node"
  },

  "governance": {
    "data_classification": "RESTRICTED",
    "risk_level": "R2",
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
    "action": "analyze_quarterly_vat",
    "input_artifacts": [
      {
        "output_id": "c1f9b0a1-4d3e-4b2a-8f1c-9a0b1c2d3e4f",
        "data_classification": "RESTRICTED",
        "storage_uri": "vault://org-03-smarttax/vat/2026-q3.xml"
      }
    ],
    "parameters": {
      "fiscal_quarter": "Q3-2026",
      "declaration_type": "FORM_01_GTGT",
      "auto_reconcile": true
    },
    "budget_token_limit": 50000,
    "timeout_seconds": 300
  }
}
```

---

## 3. Message Types (Operations Catalog)

The `message_type` field defines the operation lifecycle:

| Message Type | Direction | Description |
| :--- | :--- | :--- |
| `TASK_DISPATCH` | Cloud → Node | Commands worker node to execute a task for an agent |
| `TASK_CANCEL` | Cloud → Node | Informs worker node to abort an active running task |
| `TASK_PAUSE` | Cloud → Node | Pauses execution awaiting human review (`R3`/`R4`) |
| `TASK_RESUME` | Cloud → Node | Resumes paused task after human approval gate passes |
| `STEP_START` | Node → Cloud | Emitted when agent begins a discrete execution step |
| `STEP_COMPLETE` | Node → Cloud | Emitted when agent finishes a step with partial outputs |
| `TASK_COMPLETE` | Node → Cloud | Terminal status: Task execution succeeded |
| `TASK_FAILED` | Node → Cloud | Terminal status: Task execution failed or timed out |
| `HEARTBEAT` | Node → Cloud | Periodic node health check and capacity metric update |
| `DELEGATE` | Node → Cloud | Inter-agent delegation request (subject to policy) |
| `ARTIFACT_EMIT` | Node → Cloud | Node registers newly generated output artifact |
| `SECURITY_ALARM` | Node → Cloud | Node reports prompt injection or policy boundary breach |

---

## 4. Multi-Tenant Invariant Cross-Verification Protocol

Before any `TASK_DISPATCH` message is handed over to worker execution threads, the Dispatcher MUST execute the following 5-point verification against the PostgreSQL database:

```
                  ┌───────────────────────────────┐
                  │ 1. Fetch Task from `ai_tasks` │
                  └───────────────┬───────────────┘
                                  ▼
        ┌───────────────────────────────────────────────────┐
        │ 2. Compare Organization ID                        │
        │    envelope.routing.organization_id               │
        │    == ai_tasks.organization_id                    │
        └─────────────────────────┬─────────────────────────┘
                                  ▼
        ┌───────────────────────────────────────────────────┐
        │ 3. Fetch Agent from `agents`                      │
        │    Verify agent.id == envelope.identity.agent_id  │
        │    Verify agent.organization_id == task.org_id    │
        │    Verify agent.status == 'active'                │
        └─────────────────────────┬─────────────────────────┘
                                  ▼
        ┌───────────────────────────────────────────────────┐
        │ 4. Verify Version Immutability                    │
        │    envelope.identity.agent_version_id             │
        │    == agent.current_agent_version_id              │
        │    (or authorized pinned version)                 │
        └─────────────────────────┬─────────────────────────┘
                                  ▼
        ┌───────────────────────────────────────────────────┐
        │ 5. Boundary & Data Classification Check           │
        │    task.data_classification <= org.ceiling        │
        │    If org == 'org-03-smarttax' -> egress locked   │
        └─────────────────────────┬─────────────────────────┘
                                  ▼
                             [EXECUTE]
```

### 4.1 Invariant Failure Actions

If ANY verification check fails:
1. Message processing stops immediately.
2. The message is NOT acknowledged (`pgmq.archive` or `pgmq.delete` is NOT called; it moves to dead-letter queue `ai-jobs-dlq` after max retries).
3. A critical security incident is logged into `ai_task_steps`:
   - `step_name`: `SECURITY_INVARIANT_VIOLATION`
   - `status`: `FAILED`
   - `error_code`: `ERR_HAIP_TENANT_MISMATCH`
   - `metadata`: `{ "claimed_org": "...", "database_org": "...", "reason": "Spoofed envelope detected" }`
4. Task status in `ai_tasks` is updated to `FAILED` with `error_code = 'TENANT_VIOLATION'`.

---

## 5. Idempotency & Delivery Guarantees

1. **At-Least-Once Delivery**: PGMQ guarantees at-least-once delivery using visibility timeouts (`vt`).
2. **De-duplication via Trace ID**: Worker nodes track active `trace_id` and `task_id`. If a duplicate message arrives while execution is in-flight, it is discarded.
3. **Graceful Cancellation**: `TASK_CANCEL` messages are prioritized. When received, workers issue `AbortController.abort()` to active LLM streams and subprocesses.
