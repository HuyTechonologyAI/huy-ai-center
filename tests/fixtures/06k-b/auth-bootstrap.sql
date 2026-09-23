-- Isolated fixture only. Preserve Supabase-managed auth objects and privileges.
-- Catalog checks avoid executing CREATE SCHEMA on images where postgres does not
-- own the database, even when the requested schema already exists.
DO $bootstrap$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE SCHEMA extensions;
  END IF;
  IF to_regclass('auth.users') IS NULL THEN
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
  END IF;
  IF to_regprocedure('auth.uid()') IS NULL THEN
    EXECUTE $ddl$
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $body$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $body$
    $ddl$;
    REVOKE ALL ON FUNCTION auth.uid() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role;
  END IF;
  IF to_regprocedure('auth.role()') IS NULL THEN
    EXECUTE $ddl$
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $body$
        SELECT current_user::text
      $body$
    $ddl$;
    REVOKE ALL ON FUNCTION auth.role() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION auth.role() TO authenticated, service_role;
  END IF;
END
$bootstrap$;

-- DML is needed to exercise the RLS policies, including rejected mutations.
-- Do not grant client roles TRUNCATE, REFERENCES, TRIGGER or schema CREATE.
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;
