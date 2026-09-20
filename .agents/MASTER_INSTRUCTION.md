# MASTER INSTRUCTION — HUY TECHNOLOGY AI CENTER V1.2

**System:** HUY TECHNOLOGY AI CENTER  
**Architecture Version:** V1.2 (Autonomous Multi-Agent Orchestration Platform)  
**Protocol:** HAIP/1.0 (Huy AI Inter-Agent Protocol)  
**Status:** AUTHORITATIVE ACTIVE MASTER INSTRUCTION  
**Applies to:** All Agents, Planners, Workers, MCP Tools, Dispatchers, and Engineers  

---

## 1. Cardinal Operating Principle

```text
USER GOAL
   ↓
MASTER ORCHESTRATOR
   ↓
TASK PLANNER (DAG Decomposition)
   ↓
TASK GRAPH (Dependency Enforcement)
   ↓
HAIP ENVELOPE (HAIP/1.0)
   ↓
SUPABASE PGMQ (Single Durable Queue: ai-jobs)
   ↓
HAIP DISPATCHER (Node: huy-ai-node-01)
   ↓
AGENT (Capability-Based Resolution)
   ↓
MCP TOOL (Agent-to-Tool Isolation)
   ↓
QA REVIEWER (Autonomous Semantic & Factual Audit)
   ↓
POLICY / RISK / COST GUARD (Level 0–4 & Budget Ceilings)
   ↓
FINALIZER
   ↓
HUMAN APPROVAL (Strictly Gated for Risk >= 3 or Budget Depletion)
```

Human operators must **NOT** be required to coordinate or micro-manage individual intermediate agents.
Normally, humans only:
1. Submit high-level goals.
2. Approve high-risk or costly operations (Risk $\ge 3$).
3. Review verified final outputs.

---

## 2. Inviolable Architectural & Operational Rules

### 2.1 HAIP/1.0 Protocol Mandate
- All inter-agent communication MUST use strict **HAIP/1.0** canonical envelopes.
- Exactly **12 canonical message types** are permitted: `TASK`, `PLAN`, `CLAIM`, `DELEGATE`, `TOOL_CALL`, `RESULT`, `REVIEW`, `CORRECTION`, `STATE_UPDATE`, `ERROR`, `FINAL_CANDIDATE`, `APPROVAL_REQUEST`.
- No agent may invent ad-hoc message formats.

### 2.2 Task State Machine & DAG Integrity
- All tasks follow the canonical 11 states (`CREATED`, `PLANNING`, `QUEUED`, `CLAIMED`, `RUNNING`, `REVIEWING`, `CORRECTING`, `FINALIZING`, `AWAITING_APPROVAL`, `APPROVED`, `COMPLETED`) and 5 failure/control states (`RETRY_WAIT`, `BLOCKED`, `FAILED`, `CANCELLED`, `EXPIRED`).
- No child task in a DAG may execute until all prerequisite parent tasks reach `COMPLETED`.
- Cyclic task graphs are strictly prohibited.

### 2.3 Risk Model Enforcement
- **Level 0 (Read/Analyze):** Auto execution.
- **Level 1 (Draft/Content):** Auto execution.
- **Level 2 (Sandbox/Staging):** Auto execution + Mandatory QA.
- **Level 3 (Production Write/Deploy):** Mandatory Human Approval Gate.
- **Level 4 (Financial/Critical Infrastructure):** Mandatory Human Approval Gate with dual-check.
- Agents must **NEVER** execute above their declared `risk_ceiling`.

### 2.4 Cost Guard & Budget Limits
- Infrastructure budget: $\le \$30.00\text{ USD/month}$ ($\$0.00 - \$15.00\text{ USD}$ target).
- Every task envelope must declare `max_cost_usd` and `max_tokens`.
- Compute routing preference: Local on-premise (Dell Precision M4800 / Ollama) $\rightarrow$ Free Cloud Tier $\rightarrow$ Low-Cost Cloud SLM $\rightarrow$ Gated Premium LLM.
- **Zero dynamic budget inflation:** Agents are forbidden from increasing budgets. Exhaustion transitions task to `AWAITING_APPROVAL`.

### 2.5 Anti-Infinite Loop Guards
- `max_hops = 8` (Maximum delegations).
- `max_retries = 3` (Maximum transient retries with exponential backoff).
- `max_review_cycles = 2` (Maximum QA revision cycles before mandatory escalation).

### 2.6 Dual-Protocol Boundary (HAIP vs MCP)
- **HAIP:** Agent-to-Agent communication (PGMQ / Internal HTTP).
- **MCP:** Agent-to-Tool invocation (Stdio / SSE / JSON-RPC).
- Agents never communicate directly with other agents via MCP tools.

### 2.7 Context Isolation (Minimum Necessary Context)
- Strict separation across 4 memory scopes: `GLOBAL_MEMORY`, `PROJECT_MEMORY`, `TASK_MEMORY`, `AGENT_WORKSPACE`.
- Agents receive only the least privilege information required for their subtask. Unrelated cross-project and credential context is barred.

### 2.8 Artifact Reference Protocol
- Message envelopes **NEVER** carry large binary files or large documents ($> 32\text{ KB}$).
- Files are saved to Supabase Storage with SHA-256 checksums; envelopes transport only `artifact_ref` metadata.

### 2.9 Observability & Structured Logs
- All actions, state transitions, tool invocations, and policy checks must emit structured JSON logs.
- Audit trails for human approvals and critical events are stored immutably in `public.audit_logs`.
