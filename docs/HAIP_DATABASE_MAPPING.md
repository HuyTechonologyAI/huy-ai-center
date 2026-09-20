# HAIP DATABASE MAPPING SPECIFICATION

**Architecture Version:** V1.2  
**Protocol Version:** HAIP/1.0  
**Target Database:** Supabase PostgreSQL (`bdeluacbzbdflxubhpha`, Singapore)  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Executive Summary & Minimalism Strategy

HUY TECHNOLOGY AI CENTER V1.2 implements the **Huy AI Inter-Agent Protocol (HAIP/1.0)** directly within the approved **15 new public tables** architecture.

### Cardinal Database Design Principle:
```text
NO NEW TABLES IN V1.2. ZERO ai_messages. ZERO ai_task_dependencies. ZERO approvals.
```
All HAIP constructs (goals, DAG dependencies, 12 message types, agent traces, artifact references, and human approval gates) are mapped natively into existing relational structures and typed JSONB fields.

---

## 2. Global Entity Mapping Matrix

| HAIP Architectural Concept | Relational Storage Entity | Columns / Strategy | Justification |
|---|---|---|---|
| **Root Goal & Subtask State** | `public.ai_tasks` | `id`, `parent_task_id`, `status`, `state_version` | Native self-referencing hierarchy; optimistic concurrency |
| **DAG Dependencies** | `public.ai_tasks` | `depends_on UUID[]`, `parallel_group` | Eliminates join overhead of `ai_task_dependencies` table; GIN indexed |
| **12 Canonical Message Types** | `public.ai_task_steps` | `message_id`, `message_type`, `envelope JSONB` | Durable sequential trace; message types constrained by CHECK |
| **Inter-Agent Trace & Hops** | `public.ai_task_steps` | `sender_type/id`, `recipient_type/id`, `attempt` | Replaces separate message/event tables; server-only security |
| **Artifacts & Media** | `public.ai_outputs` | `artifact_ref`, `checksum_sha256`, `mime_type` | Envelopes carry references only; zero large binaries in database |
| **Human Approval Gates** | `public.ai_tasks` | `approval_status`, `approved_by`, `approval_note` | Inline approval storage; avoids creating auxiliary `approvals` table |
| **Agent Cards V1** | `public.agents` & `public.agent_versions` | `capabilities TEXT[]`, `runtime JSONB`, `risk_ceiling` | Capability-based resolution with GIN index on `capabilities` |
| **Cost & Token Telemetry** | `public.ai_tasks` | `actual_cost_usd`, `token_usage JSONB`, `runtime_ms` | Operational observability; 100% decoupled from customer billing |

---

## 3. Detailed Entity Mappings

### 3.1 `public.ai_tasks` (Task & DAG State)
- **`owner_user_id`:** Authenticated user requesting the task (nullable FK `auth.users(id)`).
- **`conversation_id`:** Root goal grouping identifier.
- **`parent_task_id`:** Self-referencing FK `public.ai_tasks(id)` for parent-child decomposition.
- **`depends_on`:** Array of prerequisite task UUIDs that MUST reach `COMPLETED` before this task can be queued.
- **`status`:** Canonical 16-state string validated by database trigger `trg_ai_tasks_status_transition`.
- **`risk_level` & `approval_required`:** Enforced by constraint `CHECK (risk_level < 3 OR approval_required = true)`.
- **`approval_status`:** Enum: `NOT_REQUIRED`, `PENDING`, `APPROVED`, `REJECTED`, `REVISION_REQUESTED`.
- **`state_version`:** Integer incremented monotonically by trigger on each valid transition.

### 3.2 `public.ai_task_steps` (HAIP Message & Step Trace)
- **`message_id`:** Globally unique UUID of the HAIP message.
- **`message_type`:** One of 12 canonical types (`TASK`, `PLAN`, `CLAIM`, `DELEGATE`, `TOOL_CALL`, `RESULT`, `REVIEW`, `CORRECTION`, `STATE_UPDATE`, `ERROR`, `FINAL_CANDIDATE`, `APPROVAL_REQUEST`).
- **`envelope`:** Full canonical HAIP JSON envelope (validated against `haip-envelope.v1.schema.json`).
- **`result_payload`:** Step execution output or QA report JSON.
- **`idempotency_key`:** Unique when provided to eliminate duplicate step execution side-effects.

### 3.3 `public.ai_outputs` (Artifact Registry)
- **`artifact_ref`:** Unique reference handle (e.g. `art_20260920_7a8b9c`).
- **`checksum_sha256`:** SHA-256 digest of stored artifact for tamper detection.
- **`is_final`:** Boolean flag demarcating final deliverable vs intermediate scratch artifact.
- **`qa_status`:** `pending`, `passed`, `failed`, `waived`.

### 3.4 `public.agents` & `public.agent_versions` (Agent Cards)
- **`capabilities`:** `TEXT[]` indexed with PostgreSQL `gin (capabilities)` for fast subset searches (`capabilities @> ARRAY['lesson_planning']`).
- **`runtime`:** Target compute node (`huy-ai-node-01`), memory limit, and timeout seconds.
- **`risk_ceiling`:** Integer 0 to 4 bounding maximum autonomous operation risk.

---

## 4. Preservation of Legacy Tables

- 19 existing public tables remain **100% UNTOUCHED**.
- `public.orders` is preserved strictly for legacy e-commerce payment orders (177 rows). Zero AI usage accounting.
- `public.audit_logs` is preserved with ZERO DDL. All HAIP governance events are stored in `details JSONB`.
