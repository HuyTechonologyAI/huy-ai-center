# HAIP QA & AUTONOMOUS RECOVERY LOOP SPECIFICATION

**Protocol Version:** HAIP/1.0  
**Architecture Version:** HUY TECHNOLOGY AI CENTER V1.2  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Objective & Autonomous Loop Pipeline

To achieve high reliability without continuous human oversight, HAIP enforces an autonomous four-stage quality and recovery pipeline:

```text
[WORKER AGENT]
      │ emits RESULT
      ▼
[QA REVIEWER]
      │ checks schema, safety, factual consistency
      ├── FAILED (cycles < max) ──► emits CORRECTION ──► back to [WORKER AGENT]
      ▼ PASSED
[VALIDATOR / POLICY GUARD]
      │ checks budget, risk ceiling, rate limits
      ▼ PASSED
[FINALIZER]
      │ commits outputs, stores artifacts, archives queue job
      ▼
[COMPLETED]
```

---

## 2. Default Inviolable Limits (Anti-Infinite Loop Guards)

Under NO circumstances may an autonomous agent loop indefinitely. The following limits are hard-coded into the HAIP envelope and enforced by the Dispatcher:

| Parameter | Default Limit | Maximum Permitted | Action on Exceeding Limit |
|---|---|---|---|
| `max_hops` | **8** | 16 | Immediate `FAILED` (`ERROR: MAX_HOPS_EXCEEDED`) |
| `max_retries` | **3** | 5 | Transition to `FAILED` (`ERROR: RETRIES_EXHAUSTED`) |
| `max_review_cycles` | **2** | 3 | Escalate to Human: `AWAITING_APPROVAL` or `FAILED` |
| `task_timeout_seconds` | **300s** (5 min) | 1200s (20 min) | Lease expired; transition to `EXPIRED` |

---

## 3. Error Classification & Recovery Matrix

When an error occurs during execution, the Dispatcher classifies it into one of three tiers:

### 3.1 Tier A: Transient Errors (Auto-Retry with Exponential Backoff)
- **Examples:** Network timeout, 429 Too Many Requests, temporary local Ollama memory pressure, PGMQ lock collision.
- **Handling:**
  1. Increment `retry_count`.
  2. Transition to `RETRY_WAIT`.
  3. Apply exponential backoff with jitter:
     $$T_{\text{wait}} = 2^{\text{retry\_count}} \times 1.5\text{s} + \text{random}(0, 500\text{ms})$$
  4. Once timer expires, re-enqueue to `QUEUED`.
  5. If `retry_count >= max_retries`, escalate to `FAILED`.

### 3.2 Tier B: Semantic Defects & Quality Regressions (QA Correction Loop)
- **Examples:** Generated markdown missing required section, JSON schema validation error, incomplete pedagogical steps.
- **Handling:**
  1. QA Reviewer generates a structured `CORRECTION` message detailing exact missing fields.
  2. Increment `review_cycles`.
  3. If `review_cycles <= max_review_cycles`, route back to Worker in state `CORRECTING`.
  4. If `review_cycles > max_review_cycles`, escalate to human operator via `APPROVAL_REQUEST: QA_UNRESOLVED`.

### 3.3 Tier C: Fatal / Policy Errors (Immediate Halting)
- **Examples:** Missing capabilities in cluster, authentication failure, attempt to bypass risk ceiling, explicit prohibited content.
- **Handling:**
  1. Immediately transition to `FAILED`.
  2. Log structured incident report in `audit_logs`.
  3. Release all worker locks and cancel dependent DAG branches.

---

## 4. Circuit Breaker for Worker Nodes

To prevent a crashing worker node (e.g. `huy-ai-node-01` experiencing OOM) from continuously claiming and failing jobs:
- If a node fails 3 consecutive tasks within a 5-minute window:
  - Node status in `public.nodes` is updated from `online` to `degraded`.
  - Dispatcher pauses task dispatch to the node.
  - An administrative alert is recorded.
  - Health check ping is scheduled to verify container stability before restoring `online` status.
