# 06K-C0 — production migration readiness packet

**Status: PARTIAL / BLOCKED on G0 receipt and current production snapshot.** This is a
read-only preparation artifact, not a production migration approval or an assertion
that the production schema matches the 2026-09-23 isolated dry run.

## Inputs and provenance

- Source roadmap: `config/autonomy/system-roadmap.json`, node `06k-c-readiness`.
- Existing evidence: `docs/architecture/06K_B_DRY_RUN_RESULTS.md`,
  `06K_B_PRODUCTION_PARITY_CONTRACT.md`, `06K_B_ROLLBACK_PLAN.md` and
  `06K_A_MIGRATION_SEQUENCE_PLAN.md` (dated 2026-09-23).
- Local isolated test reported 34 baseline and 38 post-migration public tables;
  34 security assertions passed. These counts are **historical**, not a fresh
  production observation.
- Current production schema, migrations history, backup recovery point,
  concurrent clients, row counts, and E2E acceptance receipt: **unverified**.
- Bridge-B feature commit at packet preparation: `aaf2dc1820b71094bc1f7af4d9c3c5bbd1d3a10e`.
  A newer commit may contain only this packet; record the actual commit in the
  signed review. CI cannot produce an authenticated WSL2 acceptance receipt.

## Immutable input manifest (SHA-256 of repository files)

Apply sequence is the numeric prefix order below, **only after** a verified
production snapshot and explicit R4 authorization. Confirm each checksum
against the intended commit immediately before any later authorized operation.

| Sequence | Migration file under `supabase/migrations/` | SHA-256 |
| --- | --- | --- |
| 1 | `20260923070001_06k_b_multi_org_foundation.sql` | `07433dbf6e32498d365839b05b2bef0d046ad5cdcb684e1cbae03ff9ff34023d` |
| 2 | `20260923070002_06k_b_agent_registry_extensions.sql` | `837a8647e24c4f2f462b81960f2bc6884476cd593303d9c04035fe89b8fdb6a1` |
| 3 | `20260923070003_06k_b_operational_extensions.sql` | `f7ad1c3f584f63dbc78de839861ea281d4a818f1bfc74579fcb21e9255756f65` |
| 4 | `20260923070004_06k_b_reference_seed.sql` | `011c546296f420d1b5d2456dda38c60866e9254a8f1aba62e88ec25a85f5bcd7` |
| 5 | `20260923070005_06k_b_security_rls_immutability.sql` | `2e28b02db276d1f833a9d8dc09cafb6d5c50b50cfa8c97f81e210e2958db63e7` |

The repository also contains older migrations and `deploy_phase_06e_complete.sql`
and `deploy_phase_06g_complete.sql`. Do not infer their production execution
from filenames: reconcile `supabase_migrations.schema_migrations` with actual
objects before constructing any exact deployment command. Do not execute a
blanket `supabase db push` based on this packet.

## Snapshot request (read-only; execute only with an approved read-only connection)

Record project identifier, database version, UTC collection time, read-only
role, source commit and sanitized result in a protected evidence location.
Do not paste connection strings, tokens, membership rows or personal data into
GitHub, logs or the AI prompt. The operator should confirm a read-only session
and run these catalog queries; if a relation is absent, record the error and
stop that query instead of creating it.

```sql
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name, current_user AS inspected_by,
       current_setting('server_version') AS postgres_version,
       (now() AT TIME ZONE 'UTC') AS observed_at_utc;
SELECT version FROM supabase_migrations.schema_migrations
WHERE version BETWEEN '20260923070001' AND '20260923070005'
ORDER BY version;
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  AND c.relname IN ('organizations','departments','organization_memberships',
    'ai_policies','agents','agent_versions','ai_tasks','ai_task_steps','ai_outputs')
ORDER BY c.relname;
SELECT schemaname, tablename, policyname, cmd, roles, permissive
FROM pg_policies WHERE schemaname = 'public'
  AND tablename IN ('organizations','departments','organization_memberships',
    'ai_policies','agents','agent_versions','ai_tasks','ai_task_steps','ai_outputs')
ORDER BY tablename, policyname;
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns WHERE table_schema = 'public'
  AND table_name IN ('agents','agent_versions','ai_tasks','ai_task_steps','ai_outputs',
    'organizations','departments','organization_memberships','ai_policies')
ORDER BY table_name, ordinal_position;
ROLLBACK;
```

Query only approved aggregate counts for legacy tables, queue status,
memberships and policy scopes. Review `06K_B_PRODUCTION_PARITY_CONTRACT.md`
against the fresh catalog result, including `agents.enabled` (no `status`),
integer risks, agent version uniqueness and `ai_task_steps` service-only
access. Confirm backup and restore by a measured isolated restore; possession
of a backup filename alone does not prove recoverability.

## Decision tree and validation contract

1. **Before G0 PASS:** keep backlog blocked. Obtain actual WSL2 acceptance
   receipt under `.artifacts/agent-bridge/acceptance/`, tied to the unchanged
   bridge code; confirm the fixture worktree was removed after PASS.
2. **Before G1 PASS:** if no authorized fresh snapshot, mismatched checksum,
   drift, missing relation, missing backup restore proof or active migration
   conflict, mark G1 BLOCKED. Do not silently repair migration history.
3. **Pre-apply (future R4):** compare migration history with catalog and
   baseline; verify approved backup restore point, maintenance window,
   operator, target, sequence, monitoring, abort criteria, and pre-change
   tenant/RLS and legacy-data assertions. All must match a signed packet.
4. **Post-apply (future R4):** inspect actual schema/constraints/RLS, exactly
   six organizations and 65 departments if these were the approved seed
   targets, no agent seed, original legacy objects/row counts, SmartTax
   isolation and queue invariants. Run security/integration assertions against
   the approved isolated or staged target before production claims.
5. **Failure before first write:** stop; no database rollback is needed.
   **Failure after a write:** stop dependent work and preserve evidence;
   the operator decides between forward repair and restore from the tested
   recovery point under the explicit R4 incident procedure. The repository
   `supabase/rollback/06k_b_multi_org_rollback.sql` was validated **only in
   isolation** and must not be run against production by default: it drops
   structures and can destroy post-migration data.

## Acceptance and handoff

Run `npm run bridge:readiness` on the feature checkout to inspect the live
acceptance receipt, checkpoint pointer and five pinned migration checksums.
`PARTIAL` means the gates are still blocked; `READY_FOR_REVIEW` means a
DELIVERY checkpoint exists, but the production snapshot and restore evidence
still require independent review. This command reads local files only and
never authorizes or executes a production database action.

G1 can become VERIFIED only with the fresh snapshot provenance, checksum
comparison, measured backup restore, explicit pre/post assertion results,
independent audit, passing `npm run typecheck` and `npm run test:core`, and
a checkpoint pointing to immutable artifact hashes. This packet alone is
PARTIAL. The exact production command, target and rollback action must be
reviewed in the R4 request after the missing evidence exists; neither this
packet nor any CI result grants R4 approval. Downstream 07A remains behind
the approved 06K-C production apply in the canonical DAG.
