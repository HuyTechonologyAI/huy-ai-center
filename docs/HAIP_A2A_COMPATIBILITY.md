# HAIP A2A (AGENT-TO-AGENT) COMPATIBILITY SPECIFICATION

**Protocol Version:** HAIP/1.0  
**Architecture Version:** HUY TECHNOLOGY AI CENTER V1.2  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Architectural Positioning: Internal vs External Protocols

```text
[HUY TECHNOLOGY AI CENTER]
┌─────────────────────────────────────────────────────────────┐
│                      HAIP/1.0 (INTERNAL)                    │
│   Deterministic, zero-overhead, schema-validated protocol    │
│   tailored to Dell M4800, Supabase PGMQ, and Vercel apps    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                       [A2A ADAPTER GATEWAY]
                               │ (Phase V2 Future Extension)
┌──────────────────────────────▼──────────────────────────────┐
│                  EXTERNAL A2A STANDARDS                      │
│     Third-party AI agents, partners, external swarms        │
└─────────────────────────────────────────────────────────────┘
```

### Inviolable Architectural Decisions:
1. **HAIP is Not Replaced:** HAIP remains the authoritative internal communication backbone for all agents within HUY TECHNOLOGY AI CENTER.
2. **Adapter Pattern for External Interop:** External agent standards (such as Google Agent-to-Agent / A2A, AutoGen protocols, or LangGraph interop) will connect strictly via a perimeter **A2A Adapter Gateway**.
3. **No Implementation in V1:** In accordance with Phase 06F, the A2A Adapter is **PLANNED** for future phases and is NOT implemented in V1.

---

## 2. Bidirectional Mapping Specification (Planned)

When the A2A Adapter is implemented, translation between HAIP and external A2A messages will follow this mapping:

| HAIP Envelope Field | External A2A Concept | Mapping / Translation Rule |
|---|---|---|
| `message_id` | `message_id` | Direct 1:1 UUID mapping |
| `task_id` | `session_id` / `task_id` | Bound to root or delegated external task |
| `type: "TASK"` | `action: "request"` | Wrapped in external goal format |
| `type: "RESULT"` | `action: "response"` | Artifact references translated to external download URLs |
| `type: "APPROVAL_REQUEST"` | `action: "human_gate"` | External human-in-the-loop callback |
| `risk.level` | `security_classification` | Mapped to external risk tiers (Public / Confidential / Restricted) |
| `budget.max_cost_usd` | `budget_tokens` | Converted based on external provider token rate card |

---

## 3. Perimeter Security Boundary for External Agents

Any external agent communicating through the future A2A Gateway must satisfy:
1. **Mutual TLS (mTLS) or Signed Bearer JWT:** All incoming requests verified via public key infrastructure.
2. **Risk Ceiling Capped at Level 1:** External agents may NEVER execute Level 2 (staging), Level 3 (production), or Level 4 (financial) operations autonomously.
3. **Strict Payload Sanitization:** All incoming prompts run through prompt-injection filters and JSON schema checkers before translation into internal HAIP envelopes.
