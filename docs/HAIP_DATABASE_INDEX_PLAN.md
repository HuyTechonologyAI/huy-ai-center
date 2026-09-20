# HAIP DATABASE INDEX PLAN — HUY TECHNOLOGY AI CENTER V1.2

**Document Version:** 1.2  
**Database Target:** Supabase PostgreSQL (`HuyAI`, Singapore)  
**Schema:** `public` (15 New Tables)  
**Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Objectives & Principles

The index strategy for HUY TECHNOLOGY AI CENTER V1.2 addresses three critical requirements:
1. **High-Throughput Polling:** Sub-millisecond queue claim operations using filtered partial indexes.
2. **DAG Resolution & Dependency Traversal:** Rapid dependency checks via GIN array indexes.
3. **Strict Idempotency & Concurrency:** Zero duplicate processing via partial unique indexes.
4. **Foreign Key Performance:** 100% index coverage on relational joins to eliminate table scans.

---

## 2. Comprehensive Index Matrix (15 Tables)

### 2.1 Module 01: AI Operations

| Table | Index Name | Type / Columns | Predicate / Modifier | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `ai_tasks` | `idx_ai_tasks_queue_poll` | B-tree `(status, priority ASC, created_at ASC)` | `WHERE status = 'QUEUED'` | **Core Worker Polling:** Eliminates table scan for `claim_ai_task()` |
| `ai_tasks` | `idx_ai_tasks_idempotency_key` | **UNIQUE** B-tree `(idempotency_key)` | `WHERE idempotency_key IS NOT NULL` | **Idempotent Dispatch:** Prevents duplicate task creation |
| `ai_tasks` | `idx_ai_tasks_depends_on` | **GIN** `(depends_on)` | None | **DAG Resolution:** Evaluates `WHERE depends_on @> ARRAY[...]'` fast |
| `ai_tasks` | `idx_ai_tasks_owner_user_id` | B-tree `(owner_user_id)` | None | **RLS Evaluation:** Speeds up user-scoped queries |
| `ai_tasks` | `idx_ai_tasks_conversation_id`| B-tree `(conversation_id)` | None | **Chat Session Filtering:** Groups tasks by thread |
| `ai_tasks` | `idx_ai_tasks_parent_task_id` | B-tree `(parent_task_id)` | None | **Subtask Tree Traversal:** Recursive DAG queries |
| `ai_tasks` | `idx_ai_tasks_status` | B-tree `(status)` | None | **Status Dashboards:** Filtering tasks by lifecycle state |
| `ai_tasks` | `idx_ai_tasks_priority` | B-tree `(priority ASC)` | None | **Priority Sorting:** General task prioritization |
| `ai_task_steps` | `ai_task_steps_message_id_key`| **UNIQUE** B-tree `(message_id)` | None | **HAIP Envelope Uniqueness:** Deduplicates message delivery |
| `ai_task_steps` | `idx_ai_task_steps_task_id` | B-tree `(task_id, created_at ASC)` | None | **Execution Timeline:** Retrieves chronological steps for a task |
| `ai_task_steps` | `idx_ai_task_steps_msg_type_status`| B-tree `(message_type, status)` | None | **Audit & QA Filters:** Locates `REVIEW`, `CORRECTION`, or `ERROR` steps |
| `ai_task_steps` | `idx_ai_task_steps_idempotency_key`| **UNIQUE** B-tree `(idempotency_key)` | `WHERE idempotency_key IS NOT NULL` | **Step Idempotency:** Prevents repeated step executions |
| `ai_outputs` | `uq_ai_outputs_task_artifact` | **UNIQUE** B-tree `(task_id, artifact_ref, version)` | None | **Artifact Versioning:** Guarantees deterministic output versioning |
| `ai_outputs` | `idx_ai_outputs_task` | B-tree `(task_id)` | None | **Output Retrieval & RLS:** Speeds up owner RLS check |
| `ai_outputs` | `idx_ai_outputs_artifact_ref` | B-tree `(artifact_ref)` | None | **Global Artifact Lookup:** Resolves artifacts across tasks |

---

### 2.2 Module 02: Infrastructure

| Table | Index Name | Type / Columns | Predicate / Modifier | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `nodes` | `nodes_pkey` | **PRIMARY KEY** `(id)` | Text (`huy-ai-node-01`) | Primary node key |
| `nodes` | `idx_nodes_status` | B-tree `(status)` | None | Filter healthy/online nodes |
| `node_heartbeats`| `idx_node_heartbeats_node` | B-tree `(node_id, recorded_at DESC)` | None | Quick lookup of latest node telemetry |

---

### 2.3 Module 03: AI Registry

| Table | Index Name | Type / Columns | Predicate / Modifier | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `ai_providers` | `ai_providers_pkey` | **PRIMARY KEY** `(id)` | Text provider ID | Provider lookup |
| `ai_models` | `idx_ai_models_provider` | B-tree `(provider_id)` | None | Foreign key covering index |
| `tools` | `tools_pkey` | **PRIMARY KEY** `(id)` | Text tool ID | Tool lookup |
| `tool_versions` | `uq_tool_version` | **UNIQUE** B-tree `(tool_id, version)` | None | Tool semantic version uniqueness |
| `tool_capabilities`| `uq_tool_capability`| **UNIQUE** B-tree `(tool_id, capability)` | None | Deduplicates tool capabilities |
| `agents` | `idx_agents_capabilities` | **GIN** `(capabilities)` | None | **Capability-Based Routing:** Rapid agent matching |
| `agents` | `idx_agents_default_model`| B-tree `(default_model_id)` | None | Foreign key covering index |
| `agent_versions`| `uq_agent_version` | **UNIQUE** B-tree `(agent_id, version)` | None | Agent card semantic version uniqueness |

---

### 2.4 Module 04: GitHub Radar (Server-Only)

| Table | Index Name | Type / Columns | Predicate / Modifier | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `github_projects`| `idx_github_projects_monitored` | B-tree `(is_monitored)` | `WHERE is_monitored = true` | Filter active monitoring targets |
| `github_reviews` | `idx_github_reviews_project` | B-tree `(project_id, created_at DESC)` | None | Latest review lookup by repository |
| `github_versions`| `idx_github_versions_project`| B-tree `(project_id, published_at DESC)` | None | Release versions history lookup |

---

## 3. Query Pattern Validations

### Pattern 1: Dispatcher Atomic Task Claim
```sql
SELECT id FROM public.ai_tasks
WHERE status = 'QUEUED'
ORDER BY priority ASC, created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```
- **Index Utilized:** `idx_ai_tasks_queue_poll` (Index-Only Scan with partial filter `WHERE status = 'QUEUED'`).
- **Cost:** Extremely low ($O(1)$ lookup).

### Pattern 2: DAG Unblocking Check
```sql
SELECT count(*) FROM public.ai_tasks
WHERE id = ANY(ARRAY['uuid-1', 'uuid-2']::UUID[])
  AND status != 'COMPLETED';
```
- **Index Utilized:** Primary Key `ai_tasks_pkey`.

### Pattern 3: Capability Match Routing
```sql
SELECT id, name, runtime_config
FROM public.agents
WHERE is_active = true
  AND capabilities @> ARRAY['lesson_planning']
LIMIT 1;
```
- **Index Utilized:** `idx_agents_capabilities` (GIN Index Scan).

---

## 4. Maintenance & Overhead Assessment

- All foreign keys on high-velocity tables (`ai_tasks`, `ai_task_steps`, `ai_outputs`) have covering B-tree indexes.
- No duplicate or redundant indexes exist across any of the 15 tables.
- Partial indexes minimize storage overhead by indexing only relevant subsets of rows.
