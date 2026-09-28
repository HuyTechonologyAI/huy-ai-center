# 06K-C Production Apply Report

- Approved by Human Owner: APPROVE 06k-c-production-apply
- Target: Supabase HuyAI (bdeluacbzbdflxubhpha)
- Applied UTC window: 2026-09-28T13:06Z–13:10Z
- Pre-apply public tables: 34
- Post-apply public tables: 38
- Legacy orders rows preserved: 177
- Seed: 6 organizations / 65 departments / 3 baseline policies
- Agent seed: 0
- Queue topology: exactly ai-jobs
- RLS enabled on all 9 target tables.
- SmartTax restrictive policies present.
- Agent invariant and immutability triggers present.

## Applied migrations

1. 06k_b_multi_org_foundation — Supabase version 20260928130624
2. 06k_b_agent_registry_extensions — Supabase version 20260928130657
3. 06k_b_operational_extensions — Supabase version 20260928130727
4. 06k_b_reference_seed — Supabase version 20260928130751
5. 06k_b_security_rls_immutability — Supabase version 20260928130815
6. 06k_c_postapply_acl_hardening — Supabase version 20260928131016

## Post-apply ACL hardening

Supabase default privileges explicitly granted EXECUTE to anon/authenticated even after PUBLIC revoke.
A post-apply hardening migration revoked:
- anon from auth_user_organization_ids, auth_user_has_org_role, auth_user_is_group_admin;
- PUBLIC/anon/authenticated from the two SECURITY DEFINER trigger functions.

Verified after hardening:
- anon_execute=false for all 5 SECURITY DEFINER functions.
- authenticated_execute=true only for the 3 auth/RLS helper functions, as intentionally required by the current RLS design.
- authenticated_execute=false for trigger functions.
- service_role_execute=true.

## Remaining security advisor findings outside this task

- Existing RLS-enabled/no-policy findings on cms_settings, leads, user_document_progress, user_video_progress.
- Existing mutable search_path finding on match_knowledge_chunks.
- Leaked-password protection disabled.
- Supabase advisor warns that authenticated can call the 3 SECURITY DEFINER RLS helper functions. This is intentional in the current policy model but should be considered for future private-schema hardening.

## Rollback posture

The repository destructive rollback SQL was NOT run. On successful apply, production remains forward-only. Any future rollback/restore is a separate R4 incident decision.
