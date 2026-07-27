-- ARCTor.app
-- P8 pgcrypto schema qualification hotfix
-- Date: 2026-07-27
--
-- Purpose:
-- Supabase installs pgcrypto in schema "extensions", while the P8 preview RPC
-- was created with search_path = public, pg_temp. This hotfix makes
-- extensions.digest(bytea,text) visible without changing the function body.
--
-- Run ONCE in Supabase SQL Editor as role postgres.

begin;

do $check$
begin
  if to_regprocedure('public.preview_value_object_tree_restructure_v1(uuid,uuid,uuid,text,jsonb)') is null then
    raise exception 'P8_PREVIEW_FUNCTION_NOT_FOUND';
  end if;

  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'P8_PGCRYPTO_DIGEST_NOT_FOUND_IN_EXTENSIONS';
  end if;
end;
$check$;

alter function public.preview_value_object_tree_restructure_v1(
  uuid,
  uuid,
  uuid,
  text,
  jsonb
)
set search_path = public, extensions, pg_temp;

comment on function public.preview_value_object_tree_restructure_v1(
  uuid,
  uuid,
  uuid,
  text,
  jsonb
) is
  'P8 read-only tree restructure preview. Search path includes Supabase pgcrypto schema extensions for digest().';

commit;
