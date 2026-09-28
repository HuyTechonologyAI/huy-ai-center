-- 06K-C post-apply ACL hardening.
-- Supabase default privileges can explicitly grant EXECUTE to anon/authenticated,
-- so revoking only PUBLIC is insufficient.

REVOKE EXECUTE ON FUNCTION public.auth_user_organization_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_has_org_role(text, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_user_is_group_admin() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.auth_user_organization_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_has_org_role(text, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_is_group_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.trg_agent_version_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_check_version_belongs_to_agent() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_agent_version_immutable() TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_check_version_belongs_to_agent() TO service_role;
