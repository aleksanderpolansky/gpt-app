begin;

-- ARCTOR HELP + FILES V1 / MANUAL SQL V3
-- Safe for Supabase SQL Editor. Additive + idempotent.
-- If an incompatible partial object already exists, stop before changing it.
do $$
declare
  v_missing text;
begin
  if to_regclass('public.platform_help_content_current') is not null then
    select string_agg(req.col, ', ' order by req.col)
      into v_missing
      from (values
        ('help_key'),('block_kind'),('source_locale'),('source_text'),('translations_json'),
        ('source_hash'),('revision'),('provider'),('model_name'),('reasoning_effort'),
        ('response_id'),('usage_json'),('updated_by_app_user_id'),('updated_at')
      ) as req(col)
     where not exists (
       select 1 from information_schema.columns c
        where c.table_schema='public'
          and c.table_name='platform_help_content_current'
          and c.column_name=req.col
     );
    if v_missing is not null then
      raise exception 'HELP_CURRENT_INCOMPATIBLE_MISSING_COLUMNS:%', v_missing;
    end if;
  end if;

  if to_regclass('public.platform_help_content_history') is not null then
    select string_agg(req.col, ', ' order by req.col)
      into v_missing
      from (values
        ('id'),('help_key'),('block_kind'),('source_locale'),('source_text'),('translations_json'),
        ('source_hash'),('revision'),('provider'),('model_name'),('reasoning_effort'),
        ('response_id'),('usage_json'),('updated_by_app_user_id'),('created_at')
      ) as req(col)
     where not exists (
       select 1 from information_schema.columns c
        where c.table_schema='public'
          and c.table_name='platform_help_content_history'
          and c.column_name=req.col
     );
    if v_missing is not null then
      raise exception 'HELP_HISTORY_INCOMPATIBLE_MISSING_COLUMNS:%', v_missing;
    end if;
  end if;
end
$$;

create table if not exists public.platform_help_content_current (
  help_key text not null,
  block_kind text not null,
  source_locale text not null,
  source_text text not null,
  translations_json jsonb not null default '{}'::jsonb,
  source_hash text not null,
  revision integer not null default 1,
  provider text not null default 'openai',
  model_name text,
  reasoning_effort text,
  response_id text,
  usage_json jsonb not null default '{}'::jsonb,
  updated_by_app_user_id uuid,
  updated_at timestamptz not null default now(),
  constraint platform_help_content_current_pk primary key (help_key, block_kind),
  constraint platform_help_content_current_help_key_check
    check (char_length(help_key) between 1 and 320),
  constraint platform_help_content_current_block_kind_check
    check (block_kind in ('what', 'why')),
  constraint platform_help_content_current_source_locale_check
    check (source_locale in ('ru','pl','en','es','uk','de','cs')),
  constraint platform_help_content_current_source_text_check
    check (char_length(source_text) <= 12000),
  constraint platform_help_content_current_source_hash_check
    check (source_hash ~ '^[0-9a-f]{64}$'),
  constraint platform_help_content_current_revision_check
    check (revision >= 1),
  constraint platform_help_content_current_translations_shape_check
    check (
      jsonb_typeof(translations_json) = 'object'
      and translations_json ?& array['ru','pl','en','es','uk','de','cs']
      and jsonb_typeof(translations_json->'ru') = 'string'
      and jsonb_typeof(translations_json->'pl') = 'string'
      and jsonb_typeof(translations_json->'en') = 'string'
      and jsonb_typeof(translations_json->'es') = 'string'
      and jsonb_typeof(translations_json->'uk') = 'string'
      and jsonb_typeof(translations_json->'de') = 'string'
      and jsonb_typeof(translations_json->'cs') = 'string'
    )
);

create table if not exists public.platform_help_content_history (
  id uuid primary key default gen_random_uuid(),
  help_key text not null,
  block_kind text not null,
  source_locale text not null,
  source_text text not null,
  translations_json jsonb not null,
  source_hash text not null,
  revision integer not null,
  provider text not null,
  model_name text,
  reasoning_effort text,
  response_id text,
  usage_json jsonb not null default '{}'::jsonb,
  updated_by_app_user_id uuid,
  created_at timestamptz not null default now(),
  constraint platform_help_content_history_key_revision_unique
    unique (help_key, block_kind, revision),
  constraint platform_help_content_history_block_kind_check
    check (block_kind in ('what', 'why')),
  constraint platform_help_content_history_source_locale_check
    check (source_locale in ('ru','pl','en','es','uk','de','cs')),
  constraint platform_help_content_history_source_hash_check
    check (source_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists platform_help_content_history_help_key_idx
  on public.platform_help_content_history(help_key, block_kind, revision desc);

alter table public.platform_help_content_current enable row level security;
alter table public.platform_help_content_history enable row level security;

revoke all on table public.platform_help_content_current from anon, authenticated;
revoke all on table public.platform_help_content_history from anon, authenticated;
grant select, insert, update, delete on table public.platform_help_content_current to service_role;
grant select, insert on table public.platform_help_content_history to service_role;

create or replace function public.upsert_platform_help_content_v1(
  p_help_key text,
  p_block_kind text,
  p_source_locale text,
  p_source_text text,
  p_translations_json jsonb,
  p_source_hash text,
  p_provider text,
  p_model_name text,
  p_reasoning_effort text,
  p_response_id text,
  p_usage_json jsonb,
  p_updated_by_app_user_id uuid
)
returns setof public.platform_help_content_current
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_revision integer;
begin
  if p_help_key is null or char_length(trim(p_help_key)) = 0 then
    raise exception 'HELP_KEY_REQUIRED';
  end if;
  if p_block_kind not in ('what', 'why') then
    raise exception 'HELP_BLOCK_KIND_INVALID';
  end if;
  if p_source_locale not in ('ru','pl','en','es','uk','de','cs') then
    raise exception 'HELP_SOURCE_LOCALE_INVALID';
  end if;
  if p_source_text is null or char_length(p_source_text) > 12000 then
    raise exception 'HELP_SOURCE_TEXT_INVALID';
  end if;
  if p_translations_json is null
     or jsonb_typeof(p_translations_json) <> 'object'
     or not (p_translations_json ?& array['ru','pl','en','es','uk','de','cs'])
     or jsonb_typeof(p_translations_json->'ru') <> 'string'
     or jsonb_typeof(p_translations_json->'pl') <> 'string'
     or jsonb_typeof(p_translations_json->'en') <> 'string'
     or jsonb_typeof(p_translations_json->'es') <> 'string'
     or jsonb_typeof(p_translations_json->'uk') <> 'string'
     or jsonb_typeof(p_translations_json->'de') <> 'string'
     or jsonb_typeof(p_translations_json->'cs') <> 'string' then
    raise exception 'HELP_TRANSLATIONS_INVALID';
  end if;
  if p_source_hash is null or p_source_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'HELP_SOURCE_HASH_INVALID';
  end if;

  -- Serialize revisions for the same help block so two admin saves cannot
  -- race into the same revision number. The lock lives only for this tx.
  perform pg_advisory_xact_lock(
    hashtextextended(trim(p_help_key) || ':' || p_block_kind, 0)
  );

  select coalesce(max(revision), 0) + 1
    into v_revision
    from public.platform_help_content_history
   where help_key = p_help_key
     and block_kind = p_block_kind;

  insert into public.platform_help_content_history (
    help_key,
    block_kind,
    source_locale,
    source_text,
    translations_json,
    source_hash,
    revision,
    provider,
    model_name,
    reasoning_effort,
    response_id,
    usage_json,
    updated_by_app_user_id
  )
  values (
    trim(p_help_key),
    p_block_kind,
    p_source_locale,
    p_source_text,
    p_translations_json,
    p_source_hash,
    v_revision,
    coalesce(nullif(trim(p_provider), ''), 'openai'),
    nullif(trim(coalesce(p_model_name, '')), ''),
    nullif(trim(coalesce(p_reasoning_effort, '')), ''),
    nullif(trim(coalesce(p_response_id, '')), ''),
    coalesce(p_usage_json, '{}'::jsonb),
    p_updated_by_app_user_id
  );

  insert into public.platform_help_content_current (
    help_key,
    block_kind,
    source_locale,
    source_text,
    translations_json,
    source_hash,
    revision,
    provider,
    model_name,
    reasoning_effort,
    response_id,
    usage_json,
    updated_by_app_user_id,
    updated_at
  )
  values (
    trim(p_help_key),
    p_block_kind,
    p_source_locale,
    p_source_text,
    p_translations_json,
    p_source_hash,
    v_revision,
    coalesce(nullif(trim(p_provider), ''), 'openai'),
    nullif(trim(coalesce(p_model_name, '')), ''),
    nullif(trim(coalesce(p_reasoning_effort, '')), ''),
    nullif(trim(coalesce(p_response_id, '')), ''),
    coalesce(p_usage_json, '{}'::jsonb),
    p_updated_by_app_user_id,
    now()
  )
  on conflict (help_key, block_kind)
  do update set
    source_locale = excluded.source_locale,
    source_text = excluded.source_text,
    translations_json = excluded.translations_json,
    source_hash = excluded.source_hash,
    revision = excluded.revision,
    provider = excluded.provider,
    model_name = excluded.model_name,
    reasoning_effort = excluded.reasoning_effort,
    response_id = excluded.response_id,
    usage_json = excluded.usage_json,
    updated_by_app_user_id = excluded.updated_by_app_user_id,
    updated_at = now();

  return query
    select *
      from public.platform_help_content_current
     where help_key = trim(p_help_key)
       and block_kind = p_block_kind;
end;
$$;

revoke all on function public.upsert_platform_help_content_v1(
  text,text,text,text,jsonb,text,text,text,text,text,jsonb,uuid
) from public, anon, authenticated;

grant execute on function public.upsert_platform_help_content_v1(
  text,text,text,text,jsonb,text,text,text,text,text,jsonb,uuid
) to service_role;

comment on table public.platform_help_content_current is
  'ARCTor administrator-authored WHAT/WHY help copy. Every save replaces all seven locale translations as one revision.';
comment on table public.platform_help_content_history is
  'Append-only help copy revision history including model/provenance metadata.';

do $$
begin
  if to_regclass('public.platform_help_content_current') is null then
    raise exception 'HELP_CURRENT_TABLE_MISSING';
  end if;
  if to_regclass('public.platform_help_content_history') is null then
    raise exception 'HELP_HISTORY_TABLE_MISSING';
  end if;
  if to_regprocedure('public.upsert_platform_help_content_v1(text,text,text,text,jsonb,text,text,text,text,text,jsonb,uuid)') is null then
    raise exception 'HELP_UPSERT_RPC_MISSING';
  end if;

  if not exists (select 1 from pg_class where oid='public.platform_help_content_current'::regclass and relrowsecurity) then
    raise exception 'HELP_CURRENT_RLS_NOT_ENABLED';
  end if;
  if not exists (select 1 from pg_class where oid='public.platform_help_content_history'::regclass and relrowsecurity) then
    raise exception 'HELP_HISTORY_RLS_NOT_ENABLED';
  end if;

  if has_table_privilege('anon', 'public.platform_help_content_current', 'SELECT')
     or has_table_privilege('authenticated', 'public.platform_help_content_current', 'SELECT')
     or has_table_privilege('anon', 'public.platform_help_content_history', 'SELECT')
     or has_table_privilege('authenticated', 'public.platform_help_content_history', 'SELECT') then
    raise exception 'HELP_DIRECT_CLIENT_TABLE_PRIVILEGE_PRESENT';
  end if;

  if not has_table_privilege('service_role', 'public.platform_help_content_current', 'SELECT')
     or not has_table_privilege('service_role', 'public.platform_help_content_current', 'INSERT')
     or not has_table_privilege('service_role', 'public.platform_help_content_current', 'UPDATE')
     or not has_table_privilege('service_role', 'public.platform_help_content_current', 'DELETE') then
    raise exception 'HELP_CURRENT_SERVICE_ROLE_PRIVILEGE_MISSING';
  end if;
  if not has_table_privilege('service_role', 'public.platform_help_content_history', 'SELECT')
     or not has_table_privilege('service_role', 'public.platform_help_content_history', 'INSERT') then
    raise exception 'HELP_HISTORY_SERVICE_ROLE_PRIVILEGE_MISSING';
  end if;

  if has_function_privilege('anon', 'public.upsert_platform_help_content_v1(text,text,text,text,jsonb,text,text,text,text,text,jsonb,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.upsert_platform_help_content_v1(text,text,text,text,jsonb,text,text,text,text,text,jsonb,uuid)', 'EXECUTE') then
    raise exception 'HELP_DIRECT_CLIENT_RPC_PRIVILEGE_PRESENT';
  end if;
  if not has_function_privilege('service_role', 'public.upsert_platform_help_content_v1(text,text,text,text,jsonb,text,text,text,text,text,jsonb,uuid)', 'EXECUTE') then
    raise exception 'HELP_SERVICE_ROLE_RPC_PRIVILEGE_MISSING';
  end if;
end
$$;

commit;

-- Ask PostgREST to refresh function/table schema cache after the committed DDL.
notify pgrst, 'reload schema';

-- Visible final acceptance row in Supabase SQL Editor.
select
  'PASS'::text as status,
  to_regclass('public.platform_help_content_current') is not null as current_table,
  to_regclass('public.platform_help_content_history') is not null as history_table,
  to_regprocedure('public.upsert_platform_help_content_v1(text,text,text,text,jsonb,text,text,text,text,text,jsonb,uuid)') is not null as upsert_rpc,
  (select relrowsecurity from pg_class where oid='public.platform_help_content_current'::regclass) as current_rls,
  (select relrowsecurity from pg_class where oid='public.platform_help_content_history'::regclass) as history_rls,
  not has_table_privilege('anon', 'public.platform_help_content_current', 'SELECT') as anon_current_read_blocked,
  not has_table_privilege('authenticated', 'public.platform_help_content_current', 'SELECT') as authenticated_current_read_blocked,
  has_function_privilege('service_role', 'public.upsert_platform_help_content_v1(text,text,text,text,jsonb,text,text,text,text,text,jsonb,uuid)', 'EXECUTE') as service_rpc_execute;
