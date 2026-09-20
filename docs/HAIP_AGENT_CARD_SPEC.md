# HAIP AGENT CARD SPECIFICATION

**Protocol Version:** HAIP/1.0  
**Architecture Version:** HUY TECHNOLOGY AI CENTER V1.2  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Objective & Core Principle

In HUY TECHNOLOGY AI CENTER V1.2, agents are dynamic, autonomous, capability-bearing entities. The **Agent Card** is a machine-readable, standardized contract declaring an agent's capabilities, input/output interfaces, runtime constraints, risk ceiling, and operational health.

### Cardinal Routing Rule:
```text
ROUTING MUST BE CAPABILITY-BASED, NEVER VENDOR-HARDCODED.
```
Tasks declare required *capabilities* (e.g. `lesson_planning`, `tax_computation`, `schema_validation`), and the HAIP Dispatcher resolves candidate agents based on matched capabilities, risk clearance, runtime availability, and cost preference.

---

## 2. Canonical Schema Fields

| Field Name | Type | Required | Description |
|---|---|---|---|
| `agent_id` | String | Yes | Canonical slug (e.g. `teacher-ai`, `smarttax-agent`, `qa-evaluator`) |
| `name` | String | Yes | Human-readable name for dashboard and tracing |
| `version` | SemVer String | Yes | Semantic version (`1.2.0`) |
| `description` | String | No | Detailed operational scope and expertise description |
| `capabilities` | Array of Strings | Yes | Deterministic set of capability tokens |
| `accepted_inputs` | Array of Objects | Yes | Permitted input types, schemas, and requirements |
| `output_types` | Array of Objects | Yes | Promised output formats, MIME types, and schemas |
| `runtime` | Object | Yes | Execution target (`target_node`, memory, timeouts) |
| `risk_ceiling` | Integer (0–4) | Yes | Maximum permissible risk level the agent can execute |
| `max_parallel_tasks` | Integer | Yes | Concurrency ceiling (e.g. 2 on Dell M4800) |
| `health_status` | Enum | Yes | `healthy`, `degraded`, `offline`, `maintenance` |
| `configuration` | Object | No | Model fallback chains, temperature, MCP tools |
| `metadata` | Object | No | Author, tags, ecosystem app affinities |

---

## 3. Example Concrete Agent Cards

### 3.1 Teacher AI Agent (`teacher-ai`)
```json
{
  "agent_id": "teacher-ai-node-01",
  "name": "Teacher AI Autonomous Assistant",
  "version": "1.2.0",
  "description": "Synthesizes pedagogical materials, lesson plans, slides, and quizzes according to Vietnamese curriculum standards.",
  "capabilities": [
    "lesson_planning",
    "slide_generation",
    "quiz_synthesis",
    "rubric_design",
    "exercise_generator"
  ],
  "accepted_inputs": [
    { "type": "pedagogical_prompt", "required": true },
    { "type": "curriculum_standard", "required": false }
  ],
  "output_types": [
    { "type": "lesson_plan_markdown", "mime_type": "text/markdown" },
    { "type": "slide_deck_json", "mime_type": "application/json" }
  ],
  "runtime": {
    "type": "node_worker",
    "target_node": "huy-ai-node-01",
    "memory_mb": 2048,
    "timeout_seconds": 300
  },
  "risk_ceiling": 1,
  "max_parallel_tasks": 2,
  "health_status": "healthy",
  "configuration": {
    "default_model_preference": ["qwen2.5:7b-instruct-q4_K_M", "gemini-1.5-flash"],
    "mcp_tools": ["mcp-docx-generator", "mcp-supabase-storage"]
  },
  "metadata": {
    "primary_app": "huycncdsai.io.vn"
  }
}
```

### 3.2 QA & Consistency Reviewer (`qa-reviewer`)
```json
{
  "agent_id": "qa-reviewer-01",
  "name": "Autonomous QA & Risk Reviewer",
  "version": "1.2.0",
  "description": "Reviews candidate artifacts against safety rules, factual consistency, schema conformance, and cost boundaries.",
  "capabilities": [
    "semantic_audit",
    "schema_validation",
    "hallucination_check",
    "risk_evaluation"
  ],
  "accepted_inputs": [
    { "type": "candidate_artifact", "required": true }
  ],
  "output_types": [
    { "type": "qa_review_report", "mime_type": "application/json" }
  ],
  "runtime": {
    "type": "node_worker",
    "target_node": "huy-ai-node-01",
    "memory_mb": 1024,
    "timeout_seconds": 120
  },
  "risk_ceiling": 2,
  "max_parallel_tasks": 4,
  "health_status": "healthy",
  "configuration": {
    "default_model_preference": ["gemini-1.5-flash", "qwen2.5:7b-instruct-q4_K_M"]
  },
  "metadata": {
    "role": "governance_guardian"
  }
}
```

---

## 4. Capability Resolution Algorithm

When a HAIP `TASK` envelope is processed:
1. **Extract Required Capabilities:** `task.constraints.required_capabilities`.
2. **Filter Active & Healthy Agents:** `status == 'healthy' AND is_active == true`.
3. **Match Capabilities:** Agent must possess ALL required capabilities (or a subset for delegated subtasks).
4. **Enforce Risk Ceiling:** `task.risk.level <= agent.risk_ceiling`.
5. **Check Concurrency:** `current_load < agent.max_parallel_tasks`.
6. **Prioritize Runtime & Cost:** Local compute (`huy-ai-node-01`) is ranked above cloud endpoints if `budget.prefer_local == true`.
7. **Select or Queue:** If matched, emit `CLAIM`; if all matched agents are busy, retain in `QUEUED`. If no agent matches, emit `ERROR: NO_CAPABLE_AGENT`.
