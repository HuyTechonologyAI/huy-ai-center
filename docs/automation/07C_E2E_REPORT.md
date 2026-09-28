# 07C — Production-Controlled HAIP E2E Validation Report

Generated: 2026-09-28 (Asia/Ho_Chi_Minh)

## Authorization

- Human Owner approval: `APPROVE 07c-e2e`
- Risk: R3
- Scope: one isolated R0 canary through production `ai-jobs` and Dispatcher V2.
- Production agent registry remained unseeded: `agents=0`, `agent_versions=0`.

## Initial acceptance result

The first acceptance probe intentionally opened the 07C gate only in an isolated runtime test and found the real blocker:

- `ai-jobs` enqueue/read: PASS
- `claim_ai_task`: PASS
- Dispatcher V2 core fail-closed: PASS
- Live queue transport: FAIL
- Failure: HTTP 501 `QUEUE_TRANSPORT_REQUIRES_07C_APPROVAL`

The gate was immediately restored to `CLOSED_07C`; the first canary was archived and cancelled.

## Automatic remediation

A bounded R2 remediation was implemented test-first:

- Added Node01 signed gateway client to `deploy/node01/dispatcher-v2-runtime.mjs`.
- Added `POST /queue/once` transport, active only when `DISPATCHER_V2_QUEUE_GATE=OPEN_07C`.
- Added Supabase Edge Function source at `deploy/supabase/node01-07c-gateway/index.ts`.
- Deployed Edge Function `node01-07c-gateway`, version 1.
- Added a dedicated Node01 Ed25519 keypair; private key remains local with mode 0600.
- Gateway accepts only signed Node01 requests and only three operations:
  - `health`
  - `poll_claim`
  - `finalize_canary`
- Gateway is hard-scoped to `phase-07c / SYSTEM_E2E_CANARY / R0`.
- No generic SQL endpoint exists.
- No `SUPABASE_SERVICE_ROLE_KEY` is stored on Node01.

Source remediation commit:

`9bc9e79 fix(07c): add signed queue transport for canary E2E`

## Verification before live retry

- Remediation transport tests: 2/2 PASS
- Dispatcher deployment regressions: 2/2 PASS
- `npm run typecheck`: PASS
- `npm run test:core`: PASS
- `npm run build`: PASS
- Signed Node01 → Edge Gateway health: HTTP 200

## Live production canary — PASS

Second canary:

- Task ID: `f9ed5f36-a4d6-41ab-be14-c76434a85022`
- PGMQ message ID: `6`
- Source: `phase-07c`
- Intent: `SYSTEM_E2E_CANARY`
- Risk: `0`
- Organization: `org-01-huytech`
- Agent identity: `agent-07c-canary-sentinel` (deliberately nonexistent)

Observed flow:

1. Task inserted as `QUEUED`.
2. HAIP `TASK` envelope enqueued into production `ai-jobs`.
3. Node01 signed gateway read the queue message.
4. `claim_ai_task` atomically changed task `QUEUED → CLAIMED`.
5. Dispatcher V2 received normalized request/context.
6. Registry remained empty, so Dispatcher returned:
   `{ allowed: false, reason: "NO_ELIGIBLE_AGENT" }`.
7. Execution port was never called.
8. Gateway finalized the canary and archived PGMQ message 6.
9. Task became `CANCELLED` with cleanup receipt.
10. Runtime gate was restored to `CLOSED_07C`.

Live Node01 result:

`POST /queue/once → HTTP 200`

```json
{
  "status": "CANARY_PROCESSED",
  "taskId": "f9ed5f36-a4d6-41ab-be14-c76434a85022",
  "msgId": 6,
  "decision": {
    "allowed": false,
    "reason": "NO_ELIGIBLE_AGENT"
  },
  "finalized": true,
  "archived": true
}
```

## Cleanup verification

After the canary:

- `ai-jobs.queue_length = 0`
- `ai-jobs.queue_visible_length = 0`
- canary task status = `CANCELLED`
- canary `claimed_by_node_id = NULL`
- canary `ai_outputs = 0`
- `agents = 0`
- Dispatcher V2 service = active
- Dispatcher default gate = `CLOSED_07C`
- Queue transport = `SIGNED_GATEWAY_V1`
- `/mnt/data2` untouched

## Security boundaries retained

- R3/R4 remain Human Gate.
- No production agent was seeded.
- No model/tool execution occurred during canary.
- Edge gateway cannot process arbitrary tasks.
- Node01 has no Supabase service-role secret.
- Direct `/dispatch` remains disabled; 07C canary uses signed queue transport only.

## Known limitation

07C validates the production-controlled canary path, not unrestricted production task execution. The signed gateway is intentionally canary-scoped. Generalized production dispatch remains a later controlled evolution and must preserve the same signed/fail-closed boundaries.

## Result

**07C E2E VERIFIED — PASS.**

The roadmap may proceed to `08a-model-gateway` (R2).
