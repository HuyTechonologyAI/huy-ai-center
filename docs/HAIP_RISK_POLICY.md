# HAIP RISK POLICY & OPERATIONAL BOUNDARIES

**Protocol Version:** HAIP/1.0  
**Architecture Version:** HUY TECHNOLOGY AI CENTER V1.2  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Core Principles & Governance

Autonomous multi-agent systems must have strictly defined operational guardrails. In HUY TECHNOLOGY AI CENTER V1.2, every task, tool call, and envelope is categorized into one of **five deterministic risk levels** (0 to 4).

### Fundamental Inviolable Rules:
1. **Ceiling Enforcement:** An agent CANNOT execute an operation whose risk level exceeds the agent's declared `risk_ceiling` in its Agent Card.
2. **Human Gates:** Any operation with Risk Level $\ge 3$ CANNOT execute without explicit cryptographic or recorded human operator approval.
3. **No Self-Elevation:** An agent cannot alter its own risk level or the risk level of its child tasks.

---

## 2. Risk Level Hierarchy

| Level | Title | Permissible Operations | Autonomy Mode | Review Requirements |
|---|---|---|---|---|
| **LEVEL 0** | **Read & Analysis** | Reading public/task data, classification, summarization, syntax checks, parsing. | **AUTO EXECUTION** | Internal schema validation |
| **LEVEL 1** | **Draft & Content** | Generating lesson plans, slide outlines, quizzes, draft code, documentation drafts. | **AUTO EXECUTION** | Standard token & budget guard |
| **LEVEL 2** | **Sandbox / Staging** | Running tests, staging environment updates, temporary file creation, sandbox builds. | **AUTO + QA** | Mandatory QA Reviewer verification |
| **LEVEL 3** | **Production Action** | Production DB writes, external webhooks, sending user emails, deploying staging to preview. | **HUMAN APPROVAL REQUIRED** | QA Pass + Explicit Operator Approval |
| **LEVEL 4** | **Critical & Financial** | Financial transactions, production data deletion, DNS changes, secrets/credential update. | **MANDATORY HUMAN APPROVAL** | QA Pass + Dual-Check Operator Sign-Off |

---

## 3. Operational Classification Matrix

### Level 0 — Read & Classification (Auto)
- Parsing user input JSON
- Fetching public course curriculum guidelines
- Analyzing GitHub repo metadata via GitHub Radar (read-only)
- Querying local vector embeddings in `knowledge_chunks`

### Level 1 — Content & Draft Synthesis (Auto)
- Synthesizing a 5-step lesson plan in Markdown
- Generating a 10-slide educational presentation deck
- Creating multiple-choice quiz questions
- Producing structured JSON summaries

### Level 2 — Sandbox & Staging Operations (Auto + QA)
- Emitting container build commands in isolated test runner
- Writing scratch files to `<scratch>/`
- Executing unit tests in worker sandbox
- Calling Mock and Sandbox MCP adapters

### Level 3 — Production Impact (Human Approval Gate)
- Committing published content to production databases (`site_content`, `courses`)
- Sending email/notification to real student or teacher accounts
- Modifying production Coolify application configuration
- Exposing new public REST API routes

### Level 4 — Critical Infrastructure & Financial (Mandatory Approval Gate)
- Any charge, payout, or modification to billing orders
- Modifying Cloudflare DNS records (`huycncdsai.io.vn`, `ops...`)
- Dropping or truncating database tables
- Regenerating or rotating API tokens, JWT keys, or SSH credentials

---

## 4. Enforcement Mechanism in Dispatcher

```text
[TASK RECEIVED]
       ↓
[RISK EVALUATOR] ── Inspects task intent, target MCP tools, payload
       ↓
   Level >= 3?
     ├── YES ──► State: AWAITING_APPROVAL ──► Emits APPROVAL_REQUEST ──► Halts until Human signs
     └── NO  ──► Check Agent risk_ceiling
                   ├── Approved: Enqueue for execution
                   └── Violates ceiling: Reject with ERROR: RISK_CEILING_EXCEEDED
```

If an agent executing at Level 1 attempts to invoke an MCP tool classified at Level 3 (e.g. `mcp-prod-db-writer`), the MCP runtime intercepts the call, blocks execution, and raises an `APPROVAL_REQUEST` back to the Dispatcher.
