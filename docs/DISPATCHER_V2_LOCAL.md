# Dispatcher V2 local core

`dispatchV2` is an isolated, dependency-injected entry point; production polling is not connected.
Contracts live in `packages/contracts/src/dispatcher-v2.ts`. No database or execution adapter is supplied.
The existing untracked test specification was updated before implementation to use canonical V2 cards.

Evaluation order: strict request validation → trusted context load/validation → organization equality → risk → classification ceiling → duplicate identity rejection → candidate eligibility → lexical agent-ID selection → one execution call.
Eligibility requires same-org record/card, enabled and healthy agent, matching version owner/current pointer/SemVer, canonical SHA-256 integrity, every requested capability, card risk ceiling and explicit classification membership.
Unknown fields/formats, missing inputs and invalid context fail closed. No implicit legacy-card conversion occurs.
R3/R4, nonempty approval conditions and policy references are denied pending approval/policy resolution; optional card constraints are unsupported and rejected. Classification order is PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED.
Decisions contain only `allowed`, selected `agent_id`, or a static `reason`; exceptions and payloads are never returned. Policy denials never execute. EXECUTION_FAILURE means the execution port was called once and failed; no retry or side-effect rollback is implied.

`DispatchContext` is a normalized local projection, not an invented SQL mapping. Documented migrated fields include organization scope and the current version pointer. The future provider must authenticate caller org membership, verify active organization and version ownership, resolve policy precedence and relational/card projection consistency, and supply an atomic trusted snapshot. Missing schema, rollback, unresolved policy or authorization must throw or return invalid context, never fall back to legacy routing.
The canonical card shape follows `architecture/06K_A_AGENT_CARD_V2_SPEC.md`; classification ordering follows `architecture/06K_B_MIGRATION_IMPLEMENTATION.md`. Hash integrity does not authenticate a provider.
SQL joins, policy binding, membership checks, concurrency reservations, idempotency and production adapter wiring remain unresolved integration dependencies. No production-readiness claim is made.
The local core imports this checkout's built contracts by relative path because installed workspace aliases resolve stale external builds. Packaging must resolve that before deployment.

Validation: build contracts, then dispatcher with `npm run build --workspace=@huy-ai/contracts` and `npm run build --workspace=@huy-ai/dispatcher` (both pass).
`node --test --test-isolation=none tests/dispatcher-v2.test.cjs`: 43/43 pass, including boundaries, org isolation, card/hash/version rejection, dependency failure and sanitized execution failure.
Combined local suite: `node --test --test-isolation=none packages/contracts/dist/*.test.js apps/dispatcher/dist/*.test.js apps/dispatcher/dist/**/*.test.js`: 87/88 pass; existing health test fails with sandbox `listen EPERM` on port 8999. No production services were used. Process isolation was disabled because the sandbox runner otherwise reports an opaque child-process failure.
