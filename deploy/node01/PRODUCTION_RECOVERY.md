# Recovery production worker

This worker is separate from the CLOSED_07C canary server. Neither existing gate nor service is changed by this branch.

Build with `npm run build:shared` and `npm run build --workspace=@huy-ai/dispatcher`. Run `node deploy/node01/production-worker.mjs` with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and PRODUCTION_ORGANIZATION_ID supplied by the private service environment. Without PRODUCTION_EXECUTION_GATE=OPEN_PRODUCTION it only inspects stale tasks. Do not copy credentials into source or logs.

R3 deployment must approve the revision, rollback revision, organization scope, and installation of the service/timer. A timer instance must manage one organization. Do not point several organizations at a shared unrestricted identity. Existing 07C services remain gated.

Supported execution is bounded local text analysis only: summarization, code_reading, log_analysis, json_analysis, text_analysis. Task input.prompt is text, not a shell instruction. No file edits, tool execution or cloud provider fallback. Output QA verifies nonempty bounded text and a digest; it does not certify factual correctness. Tasks needing stronger output validation or side effects must remain unsupported until their capability-specific verifier is implemented.

All tasks require an idempotency key, R0-R2, no outstanding approval, organization-matched active registry/version/card/hash evidence, and supported capability. Every state write is a CAS on task id, org, status, version and updated_at. Provider generation is at most 60 seconds; stale recovery waits 120 seconds. Crash replay uses matching verified RESULT and REVIEW evidence; no live production mutation is needed for verification.

Read-only readiness found six active organizations but zero enabled agents with current version evidence. Production dispatch therefore fails closed. Registry/version activation and live end-to-end acceptance remain R3 deployment prerequisites; tests use isolated fixtures and do not establish production readiness.

Rollback: stop/disable only the newly installed production timer/service, restore its prior deployment revision, and leave the existing signed telemetry and persistent supervisor services running. Inspect durable task/step state before any requeue. No database migration is required by this worker.
