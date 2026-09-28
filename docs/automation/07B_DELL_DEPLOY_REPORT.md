# 07B — Dell Dispatcher V2 Deployment Report

Generated: 2026-09-28 (Asia/Ho_Chi_Minh)

## Authorization

- Human Owner approval: `APPROVE 07b-dell-deploy`
- Risk: R3
- Deployment target: `huy-ai-node-01`
- Production queue activation: **NOT AUTHORIZED by 07B**; remains gated for 07C.

## Delivered runtime

- Service: `huy-ai-dispatcher-v2.service`
- Service state: enabled + active
- Runtime source: verified Dispatcher V2 core from Phase 07A
- Bind: `127.0.0.1:18081` only
- Queue gate: `CLOSED_07C`
- Supabase service-role credential on Node01: **not required / not provisioned**
- Rollback: `deploy/node01/rollback-dispatcher-v2.sh`

## Test-first evidence

The deployment test was created before the runtime/service implementation and initially failed because the runtime file did not exist.

Final deployment tests:
- Dispatcher V2 runtime loads the real 07A core.
- `/health` and `/ready` return HTTP 200.
- `/selftest` returns the expected fail-closed decision `NO_ELIGIBLE_AGENT`.
- `POST /dispatch` returns HTTP 503 `QUEUE_GATE_CLOSED_07C`.
- Unit does not contain `SUPABASE_SERVICE_ROLE_KEY`.
- Service cannot bind to `0.0.0.0`.
- Deploy and rollback scripts contain no `sudo`, `rm -rf`, or force operations.

Final test result: **2/2 PASS**.

## Live verification

Observed after deployment:
- `systemctl --user is-enabled huy-ai-dispatcher-v2.service` → `enabled`
- `systemctl --user is-active huy-ai-dispatcher-v2.service` → `active`
- Listener → `127.0.0.1:18081`
- `GET /health` → HTTP 200, `dispatcherV2Loaded=true`, `queueGate=CLOSED_07C`
- `GET /ready` → HTTP 200
- `GET /selftest` → HTTP 200, `NO_ELIGIBLE_AGENT`
- `POST /dispatch` → HTTP 503, `QUEUE_GATE_CLOSED_07C`

## Safety boundary

07B deploys the verified dispatcher runtime to Dell but deliberately does **not** open production queue execution. Opening the queue and validating a controlled end-to-end production task belongs to **07C**, a separate R3 Human Gate.

No access or mutation was made to `/mnt/data2`.

## Source commits

- `d89c700` — queue-gated Dispatcher V2 deployment package
- `125cea8` — user-systemd compatibility fix
- `9c255e0` — proven user-service sandbox baseline

## Result

**07B DEPLOYMENT VERIFIED — QUEUE GATE REMAINS CLOSED PENDING 07C APPROVAL.**
