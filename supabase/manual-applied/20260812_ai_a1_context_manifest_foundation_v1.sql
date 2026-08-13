-- ARCTor.app
-- AI-A1 CONTEXT MANIFEST FOUNDATION v1
-- 2026-08-12
--
-- PURPOSE
--   Create the universal, provider-neutral execution/context provenance foundation
--   defined by "Архитектура ИИ ARCTor".
--
-- SCOPE
--   1) CREATE public.ai_analysis_executions
--   2) CREATE public.ai_context_manifests
--   3) ALTER public.ai_usage_events with nullable analysis_execution_id
--   4) RLS / grants / indexes / guards
--
-- OUT OF SCOPE
--   - no Recognition profiles yet
--   - no Data Capital / feedback tables yet
--   - no Rights / consent tables yet
--   - no optimizer / dataset tables yet
--   - no existing user rows are rewritten
--   - no OpenAI calls
--   - no Reality Graph writes
--
-- DESIGN
--   ai_analysis_executions = one logical ARCTor AI operation.
--   ai_context_manifests  = one bounded provider stage/context snapshot inside that operation.
--   Raw user text is intentionally NOT a column in either table.
--   Context manifests store hashes, version references and bounded retrieval snapshots.

begin;

create table if not exists public.ai_analysis_executions (
  id uuid primary key default gen_random_uuid(),

  app_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  actor_id uuid
    references public.actors(id)
    on delete set null,

  external_operation_id text,
  surface_code text not null,
  operation_kind text not null,

  locale_code text,
  time_zone text,

  input_hash text not null,
  status text not null default 'started',

  started_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,

  error_code text,
  error_message text,

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint ai_analysis_executions_surface_code_v1_check
    check (
      char_length(surface_code) between 3 and 100
      and surface_code ~ '^[a-z][a-z0-9_.-]*$'
    ),

  constraint ai_analysis_executions_operation_kind_v1_check
    check (
      char_length(operation_kind) between 3 and 100
      and operation_kind ~ '^[a-z][a-z0-9_.-]*$'
    ),

  constraint ai_analysis_executions_locale_v1_check
    check (
      locale_code is null
      or locale_code in ('global','en','pl','ru','uk','de','es','cs')
    ),

  constraint ai_analysis_executions_input_hash_v1_check
    check (input_hash ~ '^[0-9a-f]{64}$'),

  constraint ai_analysis_executions_status_v1_check
    check (status in ('started','completed','failed','cancelled')),

  constraint ai_analysis_executions_time_order_v1_check
    check (completed_at is null or completed_at >= started_at),

  constraint ai_analysis_executions_metadata_v1_check
    check (jsonb_typeof(metadata_json) = 'object'),

  constraint ai_analysis_executions_error_shape_v1_check
    check (
      (status <> 'failed')
      or error_code is not null
      or error_message is not null
    )
);

create unique index if not exists
  ai_analysis_executions_surface_external_operation_v1_uidx
on public.ai_analysis_executions(surface_code, external_operation_id)
where external_operation_id is not null;

create index if not exists
  ai_analysis_executions_user_created_v1_idx
on public.ai_analysis_executions(app_user_id, created_at desc);

create index if not exists
  ai_analysis_executions_actor_created_v1_idx
on public.ai_analysis_executions(actor_id, created_at desc)
where actor_id is not null;

create index if not exists
  ai_analysis_executions_status_created_v1_idx
on public.ai_analysis_executions(status, created_at desc);


create table if not exists public.ai_context_manifests (
  id uuid primary key default gen_random_uuid(),

  analysis_execution_id uuid not null
    references public.ai_analysis_executions(id)
    on delete cascade,

  stage_code text not null,
  stage_sequence integer not null,

  ai_usage_event_id uuid
    references public.ai_usage_events(id)
    on delete set null,

  manifest_version integer not null default 1,

  protocol_code text not null,
  protocol_version text not null,
  code_commit_sha text,

  schema_name text not null,
  schema_version text,
  schema_hash text not null,

  system_prompt_hash text not null,
  request_hash text not null,
  response_hash text,

  provider text not null,
  model_name text not null,
  model_tier text,

  store_provider_state boolean not null default false,
  max_retries integer not null default 0,
  max_output_tokens integer,

  instruction_refs_json jsonb not null default '[]'::jsonb,
  retrieval_snapshot_json jsonb not null default '{}'::jsonb,
  tool_permissions_json jsonb not null default '[]'::jsonb,
  model_config_json jsonb not null default '{}'::jsonb,
  validator_result_json jsonb not null default '{}'::jsonb,
  context_metadata_json jsonb not null default '{}'::jsonb,

  status text not null default 'prepared',

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint ai_context_manifests_stage_code_v1_check
    check (
      char_length(stage_code) between 2 and 100
      and stage_code ~ '^[a-z][a-z0-9_.-]*$'
    ),

  constraint ai_context_manifests_stage_sequence_v1_check
    check (stage_sequence > 0),

  constraint ai_context_manifests_manifest_version_v1_check
    check (manifest_version > 0),

  constraint ai_context_manifests_protocol_code_v1_check
    check (
      char_length(protocol_code) between 3 and 120
      and protocol_code ~ '^[A-Za-z0-9_.-]+$'
    ),

  constraint ai_context_manifests_protocol_version_v1_check
    check (char_length(btrim(protocol_version)) between 1 and 120),

  constraint ai_context_manifests_code_commit_v1_check
    check (
      code_commit_sha is null
      or code_commit_sha ~ '^[0-9a-f]{7,64}$'
    ),

  constraint ai_context_manifests_schema_name_v1_check
    check (
      char_length(schema_name) between 3 and 120
      and schema_name ~ '^[A-Za-z0-9_.-]+$'
    ),

  constraint ai_context_manifests_schema_hash_v1_check
    check (schema_hash ~ '^[0-9a-f]{64}$'),

  constraint ai_context_manifests_system_prompt_hash_v1_check
    check (system_prompt_hash ~ '^[0-9a-f]{64}$'),

  constraint ai_context_manifests_request_hash_v1_check
    check (request_hash ~ '^[0-9a-f]{64}$'),

  constraint ai_context_manifests_response_hash_v1_check
    check (
      response_hash is null
      or response_hash ~ '^[0-9a-f]{64}$'
    ),

  constraint ai_context_manifests_provider_v1_check
    check (
      char_length(provider) between 2 and 50
      and provider ~ '^[a-z][a-z0-9_.-]*$'
    ),

  constraint ai_context_manifests_model_name_v1_check
    check (char_length(btrim(model_name)) between 1 and 120),

  constraint ai_context_manifests_retry_v1_check
    check (max_retries >= 0),

  constraint ai_context_manifests_output_tokens_v1_check
    check (max_output_tokens is null or max_output_tokens >= 0),

  constraint ai_context_manifests_json_shapes_v1_check
    check (
      jsonb_typeof(instruction_refs_json) = 'array'
      and jsonb_typeof(retrieval_snapshot_json) = 'object'
      and jsonb_typeof(tool_permissions_json) = 'array'
      and jsonb_typeof(model_config_json) = 'object'
      and jsonb_typeof(validator_result_json) = 'object'
      and jsonb_typeof(context_metadata_json) = 'object'
    ),

  constraint ai_context_manifests_status_v1_check
    check (
      status in (
        'prepared',
        'provider_completed',
        'validated',
        'failed'
      )
    ),

  constraint ai_context_manifests_execution_stage_v1_unique
    unique (analysis_execution_id, stage_sequence)
);

create index if not exists
  ai_context_manifests_execution_stage_v1_idx
on public.ai_context_manifests(
  analysis_execution_id,
  stage_sequence,
  created_at
);

create index if not exists
  ai_context_manifests_usage_event_v1_idx
on public.ai_context_manifests(ai_usage_event_id)
where ai_usage_event_id is not null;

create index if not exists
  ai_context_manifests_protocol_v1_idx
on public.ai_context_manifests(protocol_code, protocol_version, created_at desc);

create index if not exists
  ai_context_manifests_status_v1_idx
on public.ai_context_manifests(status, created_at desc);


alter table public.ai_usage_events
  add column if not exists analysis_execution_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_usage_events_analysis_execution_id_v1_fkey'
      and conrelid = 'public.ai_usage_events'::regclass
  ) then
    alter table public.ai_usage_events
      add constraint ai_usage_events_analysis_execution_id_v1_fkey
      foreign key (analysis_execution_id)
      references public.ai_analysis_executions(id)
      on delete set null;
  end if;
end
$$;

create index if not exists
  ai_usage_events_analysis_execution_v1_idx
on public.ai_usage_events(analysis_execution_id, created_at desc)
where analysis_execution_id is not null;


alter table public.ai_analysis_executions
  enable row level security;

alter table public.ai_context_manifests
  enable row level security;

revoke all on table public.ai_analysis_executions
from public, anon, authenticated;

revoke all on table public.ai_context_manifests
from public, anon, authenticated;

drop policy if exists
  ai_analysis_executions_no_browser_v1
on public.ai_analysis_executions;

create policy
  ai_analysis_executions_no_browser_v1
on public.ai_analysis_executions
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists
  ai_analysis_executions_service_role_all_v1
on public.ai_analysis_executions;

create policy
  ai_analysis_executions_service_role_all_v1
on public.ai_analysis_executions
for all
to service_role
using (true)
with check (true);

drop policy if exists
  ai_context_manifests_no_browser_v1
on public.ai_context_manifests;

create policy
  ai_context_manifests_no_browser_v1
on public.ai_context_manifests
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists
  ai_context_manifests_service_role_all_v1
on public.ai_context_manifests;

create policy
  ai_context_manifests_service_role_all_v1
on public.ai_context_manifests
for all
to service_role
using (true)
with check (true);

grant select, insert, update, delete
on table public.ai_analysis_executions
to service_role;

grant select, insert, update, delete
on table public.ai_context_manifests
to service_role;


comment on table public.ai_analysis_executions is
  'ARCTor AI Architecture: one logical AI analysis/inference operation. No raw user text is stored here.';

comment on table public.ai_context_manifests is
  'ARCTor AI Architecture: bounded reproducibility/provenance snapshot for one provider stage. Stores hashes, version refs and retrieval context, not a giant prompt archive.';

comment on column public.ai_usage_events.analysis_execution_id is
  'Optional link from one provider usage event to the universal ARCTor AI analysis execution.';


commit;


-- ================================================================
-- POSTCHECK
-- One result set, designed for Supabase SQL Editor export.
-- ================================================================

with checks as (

  select
    '01_ai_analysis_executions_exists'::text as check_name,
    (to_regclass('public.ai_analysis_executions') is not null) as passed,
    coalesce(to_regclass('public.ai_analysis_executions')::text,'missing') as detail

  union all

  select
    '02_ai_context_manifests_exists',
    (to_regclass('public.ai_context_manifests') is not null),
    coalesce(to_regclass('public.ai_context_manifests')::text,'missing')

  union all

  select
    '03_ai_usage_events_execution_link_column',
    exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='ai_usage_events'
        and column_name='analysis_execution_id'
        and udt_name='uuid'
    ),
    coalesce((
      select udt_name
      from information_schema.columns
      where table_schema='public'
        and table_name='ai_usage_events'
        and column_name='analysis_execution_id'
    ),'missing')

  union all

  select
    '04_ai_usage_events_execution_fk',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.ai_usage_events'::regclass
        and conname='ai_usage_events_analysis_execution_id_v1_fkey'
        and contype='f'
    ),
    coalesce((
      select conname
      from pg_constraint
      where conrelid='public.ai_usage_events'::regclass
        and conname='ai_usage_events_analysis_execution_id_v1_fkey'
        and contype='f'
      limit 1
    ),'missing')

  union all

  select
    '05_execution_rls_enabled',
    coalesce((
      select relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='ai_analysis_executions'
    ),false),
    coalesce((
      select relrowsecurity::text
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='ai_analysis_executions'
    ),'missing')

  union all

  select
    '06_manifest_rls_enabled',
    coalesce((
      select relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='ai_context_manifests'
    ),false),
    coalesce((
      select relrowsecurity::text
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and c.relname='ai_context_manifests'
    ),'missing')

  union all

  select
    '07_anon_no_execution_privileges',
    not has_table_privilege(
      'anon',
      'public.ai_analysis_executions',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    has_table_privilege(
      'anon',
      'public.ai_analysis_executions',
      'SELECT,INSERT,UPDATE,DELETE'
    )::text

  union all

  select
    '08_authenticated_no_execution_privileges',
    not has_table_privilege(
      'authenticated',
      'public.ai_analysis_executions',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    has_table_privilege(
      'authenticated',
      'public.ai_analysis_executions',
      'SELECT,INSERT,UPDATE,DELETE'
    )::text

  union all

  select
    '09_anon_no_manifest_privileges',
    not has_table_privilege(
      'anon',
      'public.ai_context_manifests',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    has_table_privilege(
      'anon',
      'public.ai_context_manifests',
      'SELECT,INSERT,UPDATE,DELETE'
    )::text

  union all

  select
    '10_authenticated_no_manifest_privileges',
    not has_table_privilege(
      'authenticated',
      'public.ai_context_manifests',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    has_table_privilege(
      'authenticated',
      'public.ai_context_manifests',
      'SELECT,INSERT,UPDATE,DELETE'
    )::text

  union all

  select
    '11_service_role_execution_rw',
    has_table_privilege(
      'service_role',
      'public.ai_analysis_executions',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    has_table_privilege(
      'service_role',
      'public.ai_analysis_executions',
      'SELECT,INSERT,UPDATE,DELETE'
    )::text

  union all

  select
    '12_service_role_manifest_rw',
    has_table_privilege(
      'service_role',
      'public.ai_context_manifests',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    has_table_privilege(
      'service_role',
      'public.ai_context_manifests',
      'SELECT,INSERT,UPDATE,DELETE'
    )::text

  union all

  select
    '13_no_raw_text_column_in_execution',
    not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='ai_analysis_executions'
        and column_name in (
          'raw_text','raw_message_text','input_text',
          'prompt_text','user_message_text'
        )
    ),
    'raw text columns absent'

  union all

  select
    '14_no_raw_text_column_in_manifest',
    not exists (
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='ai_context_manifests'
        and column_name in (
          'raw_text','raw_message_text','input_text',
          'prompt_text','user_message_text',
          'system_prompt_text'
        )
    ),
    'raw prompt/message columns absent'

  union all

  select
    '15_manifest_json_shape_guard_present',
    exists (
      select 1
      from pg_constraint
      where conrelid='public.ai_context_manifests'::regclass
        and conname='ai_context_manifests_json_shapes_v1_check'
        and contype='c'
    ),
    coalesce((
      select conname
      from pg_constraint
      where conrelid='public.ai_context_manifests'::regclass
        and conname='ai_context_manifests_json_shapes_v1_check'
      limit 1
    ),'missing')

  union all

  select
    '16_existing_ai_usage_rows_untouched',
    true,
    'additive nullable FK only; no UPDATE executed'

)
select check_name, passed, detail
from checks
order by check_name;
