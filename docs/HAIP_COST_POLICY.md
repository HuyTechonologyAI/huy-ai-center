# HAIP COST POLICY & RESOURCE BUDGETING

**Protocol Version:** HAIP/1.0  
**Architecture Version:** HUY TECHNOLOGY AI CENTER V1.2  
**Document Status:** AUTHORITATIVE SPECIFICATION  

---

## 1. Core Financial Principles

HUY TECHNOLOGY AI CENTER operates under a strictly capped monthly infrastructure budget ($\le \$30.00\text{ USD/month}$, targetting $\$0.00 - \$15.00\text{ USD/month}$). Every autonomous task executed via HAIP must respect strict cost and token budgets.

### Inviolable Cost Guard Rules:
1. **Every Task Has a Budget:** No task may be created or queued without explicit `max_cost_usd` and `max_tokens` limits.
2. **Prefer Local First:** If `budget.prefer_local == true`, compute MUST route to on-premise hardware (Dell Precision M4800 running Ollama / SLM) before cloud APIs.
3. **No Automatic Budget Inflation:** Agents are FORBIDDEN from increasing their own budget or dynamically requesting higher ceilings without human operator intervention.
4. **Budget Exhaustion Halts Work:** If token or cost ceilings are reached, the task MUST enter `AWAITING_APPROVAL` with `APPROVAL_REQUEST: BUDGET_EXHAUSTED`.

---

## 2. Model Tier & Routing Ladder

When resolving model execution for a task, the HAIP Router follows this strict precedence ladder:

```text
TIER 0: Local Compute (Self-Hosted On-Premises)
  - Target: Dell Precision M4800 (huy-ai-node-01)
  - Models: Qwen 2.5 7B, Llama 3.2, DeepSeek-R1-Distill (Ollama)
  - Cost: $0.00 USD / million tokens
  ↓ (if local offline or task requires cloud capabilities)

TIER 1: Free / Community Cloud Tier
  - Target: Google Gemini Free Tier, Groq Free Tier
  - Models: Gemini 1.5 Flash (Free Quota), Groq Llama 3.3 70B
  - Cost: $0.00 USD
  ↓ (if rate-limited or quota exhausted)

TIER 2: Low-Cost Cloud SLM / Fast Models
  - Target: Gemini 1.5 Flash (Pay-as-you-go), DeepSeek-V3 API
  - Models: Gemini 1.5 Flash (~$0.075 / 1M prompt tokens)
  - Cost: Micro-cents per task
  ↓ (ONLY IF task explicitly requires complex multi-step reasoning)

TIER 3: Premium Large Language Models (Gated)
  - Target: Gemini 1.5 Pro, Claude 3.5 Sonnet
  - Condition: Requires Risk Level >= 2 and explicit budget allocation
```

---

## 3. Envelope Budget Specification

Every HAIP envelope encapsulates:
```json
"budget": {
  "max_cost_usd": 0.05,
  "max_tokens": 4000,
  "max_runtime_seconds": 180,
  "prefer_local": true
}
```

### Validation Bounds:
- `max_cost_usd`: Float, default $0.05 USD for standard tasks; cannot exceed $0.50 USD without operator pre-authorization.
- `max_tokens`: Integer, default 4,000 tokens; max 32,000 tokens.
- `max_runtime_seconds`: Integer, default 300 seconds (5 minutes).

---

## 4. Integration with Existing Cost Guards

- **Skill `11-cost-guard`:** Validates that no new paid services, SaaS tools, or cloud databases are introduced during agent planning or MCP tool selection.
- **Skill `12-infrastructure-budget-guard`:** Monitors monthly aggregated cloud API expenditure (Gemini, Vercel, Supabase). If total spend exceeds $\$20.00\text{ USD}$ in a calendar month, all Tier 2/3 cloud routing is locked, forcing 100% fallback to local Dell M4800 compute (Tier 0).

---

## 5. Budget Exhaustion & Escalation Procedure

When an active agent encounters budget depletion:
1. Agent immediately suspends execution.
2. Emits `APPROVAL_REQUEST` containing:
   - Tokens consumed so far.
   - Cost incurred so far.
   - Estimated additional cost required to finish.
   - Partial output generated to date.
3. Task transitions to `AWAITING_APPROVAL`.
4. Operator options:
   - `APPROVE` (grants additional budget increment).
   - `REJECT` (task transitions to `CANCELLED`).
   - `REQUEST_REVISION` (instructs agent to use a more compact model or summarize).
