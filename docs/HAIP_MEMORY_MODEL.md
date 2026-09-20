# HAIP MEMORY MODEL & CONTEXT ISOLATION

**Protocol Version:** HAIP/1.0  
**Architecture Version:** HUY TECHNOLOGY AI CENTER V1.2  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Core Principle: Minimum Necessary Context

A common failure mode of multi-agent architectures is indiscriminate prompt bloat and context leakage. In HUY TECHNOLOGY AI CENTER V1.2, agents operate under the principle of:
```text
MINIMUM NECESSARY CONTEXT (LEAST PRIVILEGE INFORMATION)
```
Agents receive **only** the precise context required to complete their designated subtask. Unrelated private data, credentials, and cross-project memories are strictly barred at the Dispatcher boundary.

---

## 2. The Four Memory Scopes

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. GLOBAL_MEMORY (Ecosystem standards, policies, schemas)   │
├─────────────────────────────────────────────────────────────┤
│ 2. PROJECT_MEMORY (App-specific: EduViet, SmartTax, etc.)   │
├─────────────────────────────────────────────────────────────┤
│ 3. TASK_MEMORY (Shared DAG envelope, artifacts, QA feedback)│
├─────────────────────────────────────────────────────────────┤
│ 4. AGENT_WORKSPACE (Ephemeral agent scratchpad, tool state) │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Scope 1: `GLOBAL_MEMORY` (System-Wide, Read-Only)
- **Scope:** Immutable across all tasks and agents.
- **Contents:**
  - HAIP protocol rules and schema definitions.
  - Organization safety and compliance policies.
  - Active tool and provider registries.
- **Storage:** Static configuration, Supabase `ai_providers`, `tools`.

### 2.2 Scope 2: `PROJECT_MEMORY` (Application-Scoped)
- **Scope:** Partitioned by `source_app` (`huycncdsai`, `gvcncdsai`, `smarttax_ai`, `control_center`).
- **Contents:**
  - Curriculum standards (for EdTech).
  - Tax laws, circulars, and form templates (for SmartTax).
  - Brand voice, tone guidelines, formatting rules.
- **Storage:** Vector knowledge chunks (`knowledge_chunks` filtered by project ID), CMS settings (`cms_settings`).
- **Isolation Rule:** A SmartTax agent CANNOT access EdTech student records or curriculum chunks.

### 2.3 Scope 3: `TASK_MEMORY` (DAG Task Execution Scope)
- **Scope:** Bound to a single root goal execution (`conversation_id` and root `task_id`).
- **Contents:**
  - Initial user prompt and parameters.
  - DAG plan, sibling task output references.
  - Accumulated token and cost tallies.
  - QA review reports and correction feedback.
- **Storage:** `public.ai_tasks`, `public.ai_task_steps`.
- **Lifecycle:** Active during task execution; archived upon task completion.

### 2.4 Scope 4: `AGENT_WORKSPACE` (Private Worker Scratchpad)
- **Scope:** Bound strictly to a single agent execution turn.
- **Contents:**
  - Internal chain-of-thought (never exposed to final user UI).
  - Intermediate tool call buffers (raw API responses).
  - Local scratch files stored in container temporary storage or `scratch/`.
- **Lifecycle:** Destroyed upon emitting `RESULT` or entering terminal state.
- **Security Rule:** Private scratchpad data is never shared across agent boundaries unless packaged into an explicit artifact reference.

---

## 3. Context Sanitization & Injection Pipeline

When the Dispatcher assembles the prompt context for a Worker Agent:
1. **Fetch Task Envelope:** Retrieve inputs from `ai_tasks.input`.
2. **Resolve Artifact References:** If inputs contain `artifact_ref`, load only the referenced chunk or summary, not the entire historical archive.
3. **Filter Project Memory:** Query vector embeddings using `source_app` metadata filter with $k \le 5$ most relevant chunks.
4. **Strip Secrets:** Strip all API keys, internal connection strings, and system prompt instructions of other agents.
5. **Token Count Verification:** Assert total assembled context is within `budget.max_tokens \times 0.6` to reserve at least 40% tokens for output generation.
