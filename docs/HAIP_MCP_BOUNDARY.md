# HAIP VS MCP PROTOCOL BOUNDARY SPECIFICATION

**Protocol Version:** HAIP/1.0  
**Architecture Version:** HUY TECHNOLOGY AI CENTER V1.2  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Dual-Protocol Architectural Division

In HUY TECHNOLOGY AI CENTER V1.2, system communication is strictly partitioned across two standardized, non-overlapping protocols:

```text
┌─────────────────────────────────────────────────────────────┐
│                    HAIP (Agent ↔ Agent)                     │
│  Orchestration, Task Delegation, QA Review, Approvals, DAG  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                        [WORKER AGENT]
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     MCP (Agent ↔ Tool)                      │
│   Tool Invocation, Resource Access, External Side-Effects   │
└─────────────────────────────────────────────────────────────┘
```

| Dimension | HAIP (Huy AI Inter-Agent Protocol) | MCP (Model Context Protocol) |
|---|---|---|
| **Scope** | **Agent-to-Agent** communication | **Agent-to-Tool** invocation |
| **Participants** | Orchestrator, Planners, Workers, Reviewers | Agent Client $\leftrightarrow$ Tool Server |
| **Transport** | Supabase PGMQ (`ai-jobs`), HTTP internal | Stdio, SSE (Server-Sent Events), JSON-RPC 2.0 |
| **Data Handled** | Goals, tasks, plans, review reports, state transitions | Function calls, parameters, raw tool output |
| **Statefulness** | Stateful DAG lifecycle & conversation context | Stateless request-response per tool call |
| **Standard** | Internal ecosystem protocol (HAIP/1.0) | Open industry standard by Anthropic |

---

## 2. Exemplary Operational Workflows

### 2.1 Agent to Agent via HAIP
```text
[Master Orchestrator]
       │
       │ HAIP "TASK" (intent: "generate_lesson_plan", priority: "high")
       ▼
[Teacher AI Worker]
       │
       │ HAIP "RESULT" (artifact_ref: "art-123", qa_status: "pending")
       ▼
[QA Reviewer]
```

### 2.2 Agent to Tool via MCP
When the **Teacher AI Worker** needs external capabilities:
```text
[Teacher AI Worker]
       │
       ├── MCP JSON-RPC ──► [MCP Supabase Knowledge Server] (query vector embeddings)
       ├── MCP JSON-RPC ──► [MCP Docx Generator] (synthesize formatted Word document)
       └── MCP JSON-RPC ──► [MCP Supabase Storage Server] (upload generated file)
```

### 2.3 Other Standard Ecosystem MCP Servers:
- **`mcp-github-radar`:** Performs read-only scans and reviews of tracked open-source repositories.
- **`mcp-tax-calculator`:** Performs deterministic tax and accounting computations.
- **`mcp-slide-renderer`:** Generates Marp / reveal.js presentations from structured slide JSON.
- **`mcp-image-gen`:** Interfaces with local SD / cloud diffusion models for educational diagrams.

---

## 3. Security & Sandboxing Rules at the MCP Boundary

1. **Least Privilege Credentials:** Agents never hold database connection strings or GitHub PAT tokens directly. Secrets are securely mounted inside the isolated MCP tool process.
2. **Read/Write Segregation:** Read-only MCP tools (e.g. `mcp-knowledge-reader`) are permitted for Level 0-1 agents. Write tools (e.g. `mcp-prod-db-writer`) are gated by Risk Level 3 policy checks.
3. **No Direct Agent-to-Agent via MCP:** Agents MUST NOT attempt to use MCP tools as an ad-hoc communication backchannel to other agents. All agent collaboration must go through HAIP envelopes logged in PGMQ.
