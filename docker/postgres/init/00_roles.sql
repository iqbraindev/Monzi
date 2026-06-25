-- Supabase-compatible roles for PostgREST
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

CREATE USER authenticator NOINHERIT LOGIN PASSWORD 'postgres';
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- auth schema used by RLS policies (auth.uid())
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  );
$$ LANGUAGE sql STABLE;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
