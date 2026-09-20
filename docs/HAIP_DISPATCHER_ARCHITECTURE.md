# HAIP DISPATCHER ARCHITECTURE (AUTONOMOUS HAIP ROUTER)

**Protocol Version:** HAIP/1.0  
**Architecture Version:** HUY TECHNOLOGY AI CENTER V1.2  
**Document Status:** AUTHORITATIVE SPECIFICATION (DEPLOYMENT DEFERRED)  

---

## 1. Overview: Evolution from Simple Worker to HAIP Router

In Architecture V1.0, the Dispatcher was envisioned as a simple job poller. In **Architecture V1.2**, the Dispatcher is elevated to the **HAIP Router**: the central daemon operating on the Dell Precision M4800 (`huy-ai-node-01`) responsible for queue consumption, schema validation, capability matching, policy enforcement, and autonomous lifecycle management.

```text
                                [SUPABASE PGMQ (ai-jobs)]
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                HAIP DISPATCHER ROUTER                                  │
│                                                                                        │
│   ┌───────────────────────────┐                     ┌──────────────────────────────┐   │
│   │ 1. Queue Consumer         │                     │ 2. HAIP Validator            │   │
│   │ (claim_ai_task atomic)    ├────────────────────►│ (Zod / JSON Schema validate) │   │
│   └───────────────────────────┘                     └──────────────┬───────────────┘   │
│                                                                    │                   │
│   ┌───────────────────────────┐                     ┌──────────────▼───────────────┐   │
│   │ 4. Agent Registry Resolver│◄────────────────────┤ 3. Capability Resolver       │   │
│   │ (Agent Cards in memory/DB)│                     │ (Match required capabilities)│   │
│   └─────────────┬─────────────┘                     └──────────────────────────────┘   │
│                 │                                                                      │
│   ┌─────────────▼─────────────┐                     ┌──────────────────────────────┐   │
│   │ 5. Multi-Layer Guard      │                     │ 6. Task Router & Runner      │   │
│   │ - Risk Guard (Level 0-4)  ├────────────────────►│ - Worker Agent Runner        │   │
│   │ - Cost Guard (Budget cap) │                     │ - MCP Tool Adapter           │   │
│   │ - Policy Guard (Anti-loop)│                     │                              │   │
│   └─────────────┬─────────────┘                     └──────────────┬───────────────┘   │
│                 │ (If Risk >= 3 or Budget Exceeded)                │                   │
│   ┌─────────────▼─────────────┐                     ┌──────────────▼───────────────┐   │
│   │ 7. Approval Gate          │                     │ 8. QA & Review Controller    │   │
│   │ (Emit APPROVAL_REQUEST)   │                     │ (Auto QA Reviewer agent)     │   │
│   └───────────────────────────┘                     └──────────────┬───────────────┘   │
│                                                                    │                   │
│   ┌───────────────────────────┐                     ┌──────────────▼───────────────┐   │
│   │ 10. Result Handler        │◄────────────────────┤ 9. Retry & Recovery Control  │   │
│   │ (Save outputs, artifacts) │                     │ (Exponential backoff jitter) │   │
│   └─────────────┬─────────────┘                     └──────────────────────────────┘   │
│                 │                                                                      │
│                 ▼                                                                      │
│    [PERSISTENCE: ai_tasks, ai_task_steps, ai_outputs, audit_logs]                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Functional Components

### 2.1 Queue Consumer
- Polls Supabase PGMQ queue `ai-jobs` using PostgreSQL `claim_ai_task('huy-ai-node-01')`.
- Handles message visibility timeouts and lease renewals for long-running generation jobs.

### 2.2 HAIP Validator
- Strictly validates all dequeued messages against `HaipEnvelopeSchema`.
- Rejects malformed or unrecognized message types with an immediate structured `ERROR` log.

### 2.3 Capability Resolver & Agent Registry Resolver
- Inspects `constraints.required_capabilities` in the task envelope.
- Queries cached Agent Cards from `public.agents` and `public.agent_versions`.
- Selects the most cost-effective and capable healthy agent instance.

### 2.4 Multi-Layer Guard (Policy, Risk, Cost)
- **Risk Guard:** Verifies task risk level against agent `risk_ceiling`.
- **Cost Guard:** Enforces `budget.max_cost_usd` and `budget.max_tokens`. Directs execution to local Ollama models on Dell M4800 when `prefer_local == true`.
- **Policy Guard:** Enforces `max_hops <= 8`, `max_retries <= 3`, `max_review_cycles <= 2`.

### 2.5 Task Router & Execution Runner
- Dispatches execution to the target runtime:
  - Local container runner (Ollama SLMs, Python scripts).
  - Langflow workflow endpoint.
  - MCP Tool Server via JSON-RPC.

### 2.6 QA & Review Controller
- Intercepts `RESULT` messages from workers.
- Dispatches candidate outputs to the `qa-reviewer` agent.
- If defects are found and `review_cycles < max_review_cycles`, transitions task to `CORRECTING` and emits `CORRECTION`.

### 2.7 Approval Gate
- For tasks entering `AWAITING_APPROVAL`, halts automatic execution.
- Emits an `APPROVAL_REQUEST` payload to `public.ai_tasks.output`.
- Waits for operator decision (`APPROVE`, `REJECT`, `REQUEST_REVISION`) via Control Center web app.

### 2.8 Retry & Recovery Controller
- Handles network hiccups and rate limits with exponential backoff and randomized jitter.
- Escalates to `FAILED` or human intervention if retry thresholds are reached.

### 2.9 Result Handler & State Manager
- Persists final task status to `public.ai_tasks`.
- Records pipeline steps to `public.ai_task_steps`.
- Stores artifact references and token telemetry in `public.ai_outputs`.
- Archives message in PGMQ (`pgmq.archive('ai-jobs', msg_id)`).

---

## 3. Operational Directives & Safety

1. **Deployment Status:** **DEFERRED**. In Phase 06F, the Dispatcher remains a specification and local mock codebase. It is NOT deployed to Coolify or Ubuntu systemd until Phase 07.
2. **Single Queue Integrity:** The Dispatcher listens exclusively to PGMQ queue `ai-jobs`. No auxiliary queues or Redis instances are required.
