-- ARCTor.app
-- AI-A3-P1 DATA CAPITAL FOUNDATION v2
-- 2026-08-13
-- V2 fixes: acceptance UNION syntax + GLOBAL leaf support in manual/correction guards.
--
-- PURPOSE
--   Add append-only application feedback storage for review actions on AI analysis.
--   This migration creates storage only. It does not change /activity-ai-lab runtime,
--   does not write activity_value_object_links, does not call OpenAI, and does not
--   modify Global Reality ontology rows.
--
-- DATA MODEL
--   ai_feedback_events      = one immutable user review action against one analysis item.
--   ai_feedback_corrections = optional structured correction attached to one feedback event.
--   ai_feedback_outcomes    = future immutable downstream processing outcome/evidence.
--
-- SECURITY
--   Backend-mediated only: anon/authenticated have no direct table privileges.
--   service_role has SELECT + INSERT only; UPDATE/DELETE are intentionally not granted.
--
-- IMPORTANT
--   A manual leaf link from /activity-ai-lab is initially stored as feedback intent only.
--   Materialization into activity_value_object_links happens only after an activity_event exists
--   and is a separate runtime/save-gate step.

begin;

-- ------------------------------------------------------------
-- 0. Fail closed if this migration was already applied or drift exists.
-- ------------------------------------------------------------
do $preflight$
begin
  if to_regclass('public.ai_feedback_events') is not null
     or to_regclass('public.ai_feedback_corrections') is not null
     or to_regclass('public.ai_feedback_outcomes') is not null then
    raise exception using
      errcode = '55000',
      message = 'AI_A3_P1_TARGET_ALREADY_EXISTS';
  end if;

  if to_regclass('public.ai_analysis_executions') is null
     or to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.activity_value_object_links') is null then
    raise exception using
      errcode = '55000',
      message = 'AI_A3_P1_REQUIRED_FOUNDATION_MISSING';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_extension
    where extname = 'pgcrypto'
  ) then
    raise exception using
      errcode = '55000',
      message = 'AI_A3_P1_PGCRYPTO_REQUIRED';
  end if;
end
$preflight$;

-- ------------------------------------------------------------
-- 1. Immutable review actions.
-- ------------------------------------------------------------
create table public.ai_feedback_events (
  id uuid primary key default gen_random_uuid(),

  client_feedback_id uuid not null,

  analysis_execution_id uuid not null
    references public.ai_analysis_executions(id)
    on delete cascade,

  app_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  actor_id uuid
    references public.actors(id)
    on delete set null,

  surface_code text not null default 'activity_ai_lab',

  target_kind text not null,
  target_key text not null,
  target_value_object_id uuid
    references public.value_objects(id)
    on delete set null,

  verdict_code text not null,

  source_contract_code text,
  proposal_snapshot_json jsonb not null default '{}'::jsonb,
  explanation_text text,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),

  constraint ai_feedback_events_client_user_v1_unique
    unique (app_user_id, client_feedback_id),

  constraint ai_feedback_events_surface_v1_check
    check (
      char_length(surface_code) between 3 and 100
      and surface_code ~ '^[a-z][a-z0-9_.-]*$'
    ),

  constraint ai_feedback_events_target_kind_v1_check
    check (
      target_kind in (
        'primary_selection',
        'fact',
        'semantic_projection',
        'unresolved',
        'manual_leaf_link'
      )
    ),

  constraint ai_feedback_events_target_key_v1_check
    check (char_length(btrim(target_key)) between 1 and 240),

  constraint ai_feedback_events_verdict_v1_check
    check (
      verdict_code in (
        'confirmed',
        'rejected',
        'corrected',
        'commented',
        'manual_link_added'
      )
    ),

  constraint ai_feedback_events_contract_v1_check
    check (
      source_contract_code is null
      or char_length(btrim(source_contract_code)) between 1 and 180
    ),

  constraint ai_feedback_events_json_shapes_v1_check
    check (
      jsonb_typeof(proposal_snapshot_json) = 'object'
      and jsonb_typeof(metadata_json) = 'object'
    ),

  constraint ai_feedback_events_explanation_v1_check
    check (
      explanation_text is null
      or char_length(explanation_text) <= 4000
    ),

  constraint ai_feedback_events_manual_link_shape_v1_check
    check (
      (target_kind <> 'manual_leaf_link')
      or (
        verdict_code = 'manual_link_added'
        and target_value_object_id is not null
      )
    ),

  constraint ai_feedback_events_non_manual_verdict_shape_v1_check
    check (
      target_kind = 'manual_leaf_link'
      or verdict_code <> 'manual_link_added'
    )
);

create index ai_feedback_events_execution_created_v1_idx
  on public.ai_feedback_events(analysis_execution_id, created_at desc);

create index ai_feedback_events_user_created_v1_idx
  on public.ai_feedback_events(app_user_id, created_at desc);

create index ai_feedback_events_actor_created_v1_idx
  on public.ai_feedback_events(actor_id, created_at desc)
  where actor_id is not null;

create index ai_feedback_events_target_created_v1_idx
  on public.ai_feedback_events(target_kind, target_key, created_at desc);

create index ai_feedback_events_target_vo_created_v1_idx
  on public.ai_feedback_events(target_value_object_id, created_at desc)
  where target_value_object_id is not null;

-- ------------------------------------------------------------
-- 2. Structured correction payload. Original proposal stays in event.
-- ------------------------------------------------------------
create table public.ai_feedback_corrections (
  id uuid primary key default gen_random_uuid(),

  feedback_event_id uuid not null
    references public.ai_feedback_events(id)
    on delete cascade,

  corrected_value_object_id uuid
    references public.value_objects(id)
    on delete set null,

  correction_json jsonb not null default '{}'::jsonb,
  explanation_text text,

  created_at timestamptz not null default clock_timestamp(),

  constraint ai_feedback_corrections_event_v1_unique
    unique (feedback_event_id),

  constraint ai_feedback_corrections_json_v1_check
    check (jsonb_typeof(correction_json) = 'object'),

  constraint ai_feedback_corrections_explanation_v1_check
    check (
      explanation_text is null
      or char_length(explanation_text) <= 4000
    ),

  constraint ai_feedback_corrections_payload_v1_check
    check (
      corrected_value_object_id is not null
      or correction_json <> '{}'::jsonb
      or nullif(btrim(explanation_text), '') is not null
    )
);

create index ai_feedback_corrections_target_vo_created_v1_idx
  on public.ai_feedback_corrections(corrected_value_object_id, created_at desc)
  where corrected_value_object_id is not null;

-- ------------------------------------------------------------
-- 3. Future downstream outcome/evidence, still append-only.
--    P1 runtime does not write this table yet.
-- ------------------------------------------------------------
create table public.ai_feedback_outcomes (
  id uuid primary key default gen_random_uuid(),

  feedback_event_id uuid not null
    references public.ai_feedback_events(id)
    on delete cascade,

  outcome_code text not null,
  processor_code text not null,
  processor_version text,
  outcome_snapshot_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),

  constraint ai_feedback_outcomes_code_v1_check
    check (
      outcome_code in (
        'accepted_personal_evidence',
        'optimizer_candidate',
        'dataset_candidate',
        'ignored',
        'superseded'
      )
    ),

  constraint ai_feedback_outcomes_processor_v1_check
    check (
      char_length(processor_code) between 2 and 120
      and processor_code ~ '^[a-z][a-z0-9_.-]*$'
    ),

  constraint ai_feedback_outcomes_processor_version_v1_check
    check (
      processor_version is null
      or char_length(btrim(processor_version)) between 1 and 120
    ),

  constraint ai_feedback_outcomes_json_v1_check
    check (jsonb_typeof(outcome_snapshot_json) = 'object')
);

create index ai_feedback_outcomes_event_created_v1_idx
  on public.ai_feedback_outcomes(feedback_event_id, created_at desc);

-- ------------------------------------------------------------
-- 4. Server-side insert guards.
--    These guards make ownership/provenance checks independent of API code.
-- ------------------------------------------------------------
create function public.enforce_ai_feedback_event_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_execution public.ai_analysis_executions%rowtype;
  v_value_object public.value_objects%rowtype;
begin
  select *
  into v_execution
  from public.ai_analysis_executions
  where id = new.analysis_execution_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'AI_A3_FEEDBACK_EXECUTION_NOT_FOUND';
  end if;

  if new.app_user_id is distinct from v_execution.app_user_id
     or new.actor_id is distinct from v_execution.actor_id then
    raise exception using
      errcode = '42501',
      message = 'AI_A3_FEEDBACK_EXECUTION_OWNER_MISMATCH';
  end if;

  if new.surface_code = 'activity_ai_lab'
     and (
       v_execution.surface_code is distinct from 'global_observation_preview'
       or v_execution.operation_kind is distinct from 'activity_semantic_intake'
       or v_execution.status is distinct from 'completed'
     ) then
    raise exception using
      errcode = '23514',
      message = 'AI_A3_FEEDBACK_EXECUTION_SURFACE_MISMATCH';
  end if;

  if new.target_kind = 'manual_leaf_link' then
    select *
    into v_value_object
    from public.value_objects
    where id = new.target_value_object_id;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'AI_A3_MANUAL_LINK_VALUE_OBJECT_NOT_FOUND';
    end if;

    if v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode = '23514',
        message = 'AI_A3_MANUAL_LINK_REQUIRES_LEAF';
    end if;

    if v_value_object.scope_code = 'global' then
      if v_value_object.status is distinct from 'active' then
        raise exception using
          errcode = '23514',
          message = 'AI_A3_MANUAL_LINK_GLOBAL_VALUE_OBJECT_INACTIVE';
      end if;
    else
      if v_value_object.status is null
         or v_value_object.status not in ('draft', 'active') then
        raise exception using
          errcode = '23514',
          message = 'AI_A3_MANUAL_LINK_VALUE_OBJECT_INACTIVE';
      end if;

      if v_value_object.owner_user_id is distinct from new.app_user_id
         or v_value_object.owner_actor_id is distinct from new.actor_id then
        raise exception using
          errcode = '42501',
          message = 'AI_A3_MANUAL_LINK_OWNER_MISMATCH';
      end if;
    end if;
  end if;

  return new;
end
$function$;

create trigger ai_feedback_events_insert_guard_v1_trg
before insert on public.ai_feedback_events
for each row execute function public.enforce_ai_feedback_event_v1();

create function public.enforce_ai_feedback_correction_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_event public.ai_feedback_events%rowtype;
  v_value_object public.value_objects%rowtype;
begin
  select *
  into v_event
  from public.ai_feedback_events
  where id = new.feedback_event_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'AI_A3_CORRECTION_FEEDBACK_EVENT_NOT_FOUND';
  end if;

  if v_event.verdict_code is distinct from 'corrected' then
    raise exception using
      errcode = '23514',
      message = 'AI_A3_CORRECTION_REQUIRES_CORRECTED_VERDICT';
  end if;

  if new.corrected_value_object_id is not null then
    select *
    into v_value_object
    from public.value_objects
    where id = new.corrected_value_object_id;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'AI_A3_CORRECTION_VALUE_OBJECT_NOT_FOUND';
    end if;

    if v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode = '23514',
        message = 'AI_A3_CORRECTION_VALUE_OBJECT_REQUIRES_LEAF';
    end if;

    if v_value_object.scope_code = 'global' then
      if v_value_object.status is distinct from 'active' then
        raise exception using
          errcode = '23514',
          message = 'AI_A3_CORRECTION_GLOBAL_VALUE_OBJECT_INACTIVE';
      end if;
    else
      if v_value_object.status is null
         or v_value_object.status not in ('draft', 'active') then
        raise exception using
          errcode = '23514',
          message = 'AI_A3_CORRECTION_VALUE_OBJECT_INACTIVE';
      end if;

      if v_value_object.owner_user_id is distinct from v_event.app_user_id
         or v_value_object.owner_actor_id is distinct from v_event.actor_id then
        raise exception using
          errcode = '42501',
          message = 'AI_A3_CORRECTION_VALUE_OBJECT_OWNER_MISMATCH';
      end if;
    end if;
  end if;

  return new;
end
$function$;

create trigger ai_feedback_corrections_insert_guard_v1_trg
before insert on public.ai_feedback_corrections
for each row execute function public.enforce_ai_feedback_correction_v1();

-- ------------------------------------------------------------
-- 5. RLS and backend-only privileges.
-- ------------------------------------------------------------
alter table public.ai_feedback_events enable row level security;
alter table public.ai_feedback_corrections enable row level security;
alter table public.ai_feedback_outcomes enable row level security;

revoke all on table public.ai_feedback_events from public, anon, authenticated;
revoke all on table public.ai_feedback_corrections from public, anon, authenticated;
revoke all on table public.ai_feedback_outcomes from public, anon, authenticated;

revoke all on table public.ai_feedback_events from service_role;
revoke all on table public.ai_feedback_corrections from service_role;
revoke all on table public.ai_feedback_outcomes from service_role;

grant select, insert on table public.ai_feedback_events to service_role;
grant select, insert on table public.ai_feedback_corrections to service_role;
grant select, insert on table public.ai_feedback_outcomes to service_role;


revoke all on function public.enforce_ai_feedback_event_v1() from public, anon, authenticated;
revoke all on function public.enforce_ai_feedback_correction_v1() from public, anon, authenticated;
grant execute on function public.enforce_ai_feedback_event_v1() to service_role;
grant execute on function public.enforce_ai_feedback_correction_v1() to service_role;

create policy ai_feedback_events_service_role_select_v1
  on public.ai_feedback_events
  for select
  to service_role
  using (true);

create policy ai_feedback_events_service_role_insert_v1
  on public.ai_feedback_events
  for insert
  to service_role
  with check (true);

create policy ai_feedback_corrections_service_role_select_v1
  on public.ai_feedback_corrections
  for select
  to service_role
  using (true);

create policy ai_feedback_corrections_service_role_insert_v1
  on public.ai_feedback_corrections
  for insert
  to service_role
  with check (true);

create policy ai_feedback_outcomes_service_role_select_v1
  on public.ai_feedback_outcomes
  for select
  to service_role
  using (true);

create policy ai_feedback_outcomes_service_role_insert_v1
  on public.ai_feedback_outcomes
  for insert
  to service_role
  with check (true);

comment on table public.ai_feedback_events is
  'AI-A3 Data Capital: immutable user review actions bound to an AI analysis execution. No automatic ontology or Reality Graph mutation.';

comment on table public.ai_feedback_corrections is
  'AI-A3 Data Capital: immutable structured correction attached to a feedback event; original proposal remains preserved.';

comment on table public.ai_feedback_outcomes is
  'AI-A3 Data Capital: immutable downstream processing outcome/evidence. Runtime integration is intentionally deferred.';

-- ------------------------------------------------------------
-- 6. In-transaction acceptance gate. Any failed assertion rolls back all DDL.
-- ------------------------------------------------------------
do $acceptance$
declare
  v_failed text;
begin
  with checks(check_name, passed) as (
    select
      '01_tables_exist',
      to_regclass('public.ai_feedback_events') is not null
        and to_regclass('public.ai_feedback_corrections') is not null
        and to_regclass('public.ai_feedback_outcomes') is not null

    union all

    select
      '02_events_columns_ready',
      (
        select count(*) = 15
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'ai_feedback_events'
          and column_name in (
            'id',
            'client_feedback_id',
            'analysis_execution_id',
            'app_user_id',
            'actor_id',
            'surface_code',
            'target_kind',
            'target_key',
            'target_value_object_id',
            'verdict_code',
            'source_contract_code',
            'proposal_snapshot_json',
            'explanation_text',
            'metadata_json',
            'created_at'
          )
      )

    union all

    select
      '03_corrections_columns_ready',
      (
        select count(*) = 6
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'ai_feedback_corrections'
          and column_name in (
            'id',
            'feedback_event_id',
            'corrected_value_object_id',
            'correction_json',
            'explanation_text',
            'created_at'
          )
      )

    union all

    select
      '04_outcomes_columns_ready',
      (
        select count(*) = 7
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'ai_feedback_outcomes'
          and column_name in (
            'id',
            'feedback_event_id',
            'outcome_code',
            'processor_code',
            'processor_version',
            'outcome_snapshot_json',
            'created_at'
          )
      )

    union all

    select
      '05_events_execution_fk',
      exists (
        select 1
        from pg_catalog.pg_constraint
        where conrelid = to_regclass('public.ai_feedback_events')
          and contype = 'f'
          and pg_get_constraintdef(oid) ilike '%analysis_execution_id%'
          and pg_get_constraintdef(oid) ilike '%ai_analysis_executions%'
      )

    union all

    select
      '06_events_client_idempotency_unique',
      exists (
        select 1
        from pg_catalog.pg_constraint
        where conrelid = to_regclass('public.ai_feedback_events')
          and conname = 'ai_feedback_events_client_user_v1_unique'
          and contype = 'u'
      )

    union all

    select
      '07_correction_one_per_feedback_event',
      exists (
        select 1
        from pg_catalog.pg_constraint
        where conrelid = to_regclass('public.ai_feedback_corrections')
          and conname = 'ai_feedback_corrections_event_v1_unique'
          and contype = 'u'
      )

    union all

    select
      '08_rls_enabled_all',
      (
        select count(*) = 3
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in (
            'ai_feedback_events',
            'ai_feedback_corrections',
            'ai_feedback_outcomes'
          )
          and c.relrowsecurity = true
      )

    union all

    select
      '09_anon_has_no_table_privileges',
      not has_table_privilege('anon', 'public.ai_feedback_events', 'SELECT')
        and not has_table_privilege('anon', 'public.ai_feedback_events', 'INSERT')
        and not has_table_privilege('anon', 'public.ai_feedback_events', 'UPDATE')
        and not has_table_privilege('anon', 'public.ai_feedback_events', 'DELETE')
        and not has_table_privilege('anon', 'public.ai_feedback_corrections', 'SELECT')
        and not has_table_privilege('anon', 'public.ai_feedback_corrections', 'INSERT')
        and not has_table_privilege('anon', 'public.ai_feedback_corrections', 'UPDATE')
        and not has_table_privilege('anon', 'public.ai_feedback_corrections', 'DELETE')
        and not has_table_privilege('anon', 'public.ai_feedback_outcomes', 'SELECT')
        and not has_table_privilege('anon', 'public.ai_feedback_outcomes', 'INSERT')
        and not has_table_privilege('anon', 'public.ai_feedback_outcomes', 'UPDATE')
        and not has_table_privilege('anon', 'public.ai_feedback_outcomes', 'DELETE')

    union all

    select
      '10_authenticated_has_no_table_privileges',
      not has_table_privilege('authenticated', 'public.ai_feedback_events', 'SELECT')
        and not has_table_privilege('authenticated', 'public.ai_feedback_events', 'INSERT')
        and not has_table_privilege('authenticated', 'public.ai_feedback_events', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.ai_feedback_events', 'DELETE')
        and not has_table_privilege('authenticated', 'public.ai_feedback_corrections', 'SELECT')
        and not has_table_privilege('authenticated', 'public.ai_feedback_corrections', 'INSERT')
        and not has_table_privilege('authenticated', 'public.ai_feedback_corrections', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.ai_feedback_corrections', 'DELETE')
        and not has_table_privilege('authenticated', 'public.ai_feedback_outcomes', 'SELECT')
        and not has_table_privilege('authenticated', 'public.ai_feedback_outcomes', 'INSERT')
        and not has_table_privilege('authenticated', 'public.ai_feedback_outcomes', 'UPDATE')
        and not has_table_privilege('authenticated', 'public.ai_feedback_outcomes', 'DELETE')

    union all

    select
      '11_service_role_select_insert_only',
      has_table_privilege('service_role', 'public.ai_feedback_events', 'SELECT')
        and has_table_privilege('service_role', 'public.ai_feedback_events', 'INSERT')
        and not has_table_privilege('service_role', 'public.ai_feedback_events', 'UPDATE')
        and not has_table_privilege('service_role', 'public.ai_feedback_events', 'DELETE')
        and has_table_privilege('service_role', 'public.ai_feedback_corrections', 'SELECT')
        and has_table_privilege('service_role', 'public.ai_feedback_corrections', 'INSERT')
        and not has_table_privilege('service_role', 'public.ai_feedback_corrections', 'UPDATE')
        and not has_table_privilege('service_role', 'public.ai_feedback_corrections', 'DELETE')
        and has_table_privilege('service_role', 'public.ai_feedback_outcomes', 'SELECT')
        and has_table_privilege('service_role', 'public.ai_feedback_outcomes', 'INSERT')
        and not has_table_privilege('service_role', 'public.ai_feedback_outcomes', 'UPDATE')
        and not has_table_privilege('service_role', 'public.ai_feedback_outcomes', 'DELETE')

    union all

    select
      '12_service_role_policies_ready',
      (
        select count(*) = 6
        from pg_catalog.pg_policies
        where schemaname = 'public'
          and tablename in (
            'ai_feedback_events',
            'ai_feedback_corrections',
            'ai_feedback_outcomes'
          )
          and policyname in (
            'ai_feedback_events_service_role_select_v1',
            'ai_feedback_events_service_role_insert_v1',
            'ai_feedback_corrections_service_role_select_v1',
            'ai_feedback_corrections_service_role_insert_v1',
            'ai_feedback_outcomes_service_role_select_v1',
            'ai_feedback_outcomes_service_role_insert_v1'
          )
      )

    union all

    select
      '13_manual_link_shape_guard_present',
      exists (
        select 1
        from pg_catalog.pg_constraint
        where conrelid = to_regclass('public.ai_feedback_events')
          and conname = 'ai_feedback_events_manual_link_shape_v1_check'
          and contype = 'c'
          and pg_get_constraintdef(oid) ilike '%manual_leaf_link%'
          and pg_get_constraintdef(oid) ilike '%manual_link_added%'
      )

    union all

    select
      '14_existing_feedback_sources_preserved',
      to_regclass('public.activity_corrections') is not null
        and to_regclass('public.activity_fact_review_items') is not null
        and to_regclass('public.resolver_feedback') is not null
        and to_regclass('public.recommendation_feedback') is not null

    union all

    select
      '15_ai_a1_execution_foundation_preserved',
      to_regclass('public.ai_analysis_executions') is not null
        and to_regclass('public.ai_context_manifests') is not null

    union all

    select
      '16_activity_link_contract_preserved',
      to_regclass('public.activity_value_object_links') is not null
        and exists (
          select 1
          from pg_catalog.pg_constraint
          where conrelid = to_regclass('public.activity_value_object_links')
            and conname = 'activity_value_object_links_unique_semantic_link'
            and contype = 'u'
        )

    union all

    select
      '17_global_leaf_baseline_unchanged',
      (
        select count(*) = 103
        from public.value_objects
        where scope_code = 'global'
          and ontology_node_role_code = 'leaf'
          and status = 'active'
      )

    union all

    select
      '18_new_tables_start_empty',
      (select count(*) = 0 from public.ai_feedback_events)
        and (select count(*) = 0 from public.ai_feedback_corrections)
        and (select count(*) = 0 from public.ai_feedback_outcomes)

    union all

    select
      '19_feedback_insert_guard_ready',
      exists (
        select 1
        from pg_catalog.pg_trigger
        where tgrelid = to_regclass('public.ai_feedback_events')
          and tgname = 'ai_feedback_events_insert_guard_v1_trg'
          and not tgisinternal
      )
        and exists (
          select 1
          from pg_catalog.pg_proc p
          join pg_catalog.pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname = 'enforce_ai_feedback_event_v1'
            and p.prosecdef = true
            and position('v_value_object.scope_code = ''global''' in p.prosrc) > 0
            and position('v_value_object.owner_user_id is distinct from new.app_user_id' in p.prosrc) > 0
        )

    union all

    select
      '20_correction_insert_guard_ready',
      exists (
        select 1
        from pg_catalog.pg_trigger
        where tgrelid = to_regclass('public.ai_feedback_corrections')
          and tgname = 'ai_feedback_corrections_insert_guard_v1_trg'
          and not tgisinternal
      )
        and exists (
          select 1
          from pg_catalog.pg_proc p
          join pg_catalog.pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname = 'enforce_ai_feedback_correction_v1'
            and p.prosecdef = true
            and position('v_value_object.scope_code = ''global''' in p.prosrc) > 0
            and position('v_value_object.owner_user_id is distinct from v_event.app_user_id' in p.prosrc) > 0
        )
  )
  select string_agg(check_name, ', ' order by check_name)
  into v_failed
  from checks
  where passed is not true;

  if v_failed is not null then
    raise exception using
      errcode = '55000',
      message = 'AI_A3_P1_ACCEPTANCE_FAILED: ' || v_failed;
  end if;
end
$acceptance$;

commit;

-- ------------------------------------------------------------
-- 7. Visible postcheck. Expected: 20/20 true.
-- ------------------------------------------------------------
with checks(check_name, passed, detail) as (
  select
    '01_tables_exist',
    to_regclass('public.ai_feedback_events') is not null
      and to_regclass('public.ai_feedback_corrections') is not null
      and to_regclass('public.ai_feedback_outcomes') is not null,
    'three AI-A3 Data Capital tables exist'

  union all

  select
    '02_events_columns_ready',
    (
      select count(*) = 15
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'ai_feedback_events'
        and column_name in (
          'id','client_feedback_id','analysis_execution_id','app_user_id','actor_id',
          'surface_code','target_kind','target_key','target_value_object_id','verdict_code',
          'source_contract_code','proposal_snapshot_json','explanation_text','metadata_json','created_at'
        )
    ),
    'event identity, provenance, target, verdict and snapshot columns present'

  union all

  select
    '03_corrections_columns_ready',
    (
      select count(*) = 6
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'ai_feedback_corrections'
        and column_name in (
          'id','feedback_event_id','corrected_value_object_id','correction_json',
          'explanation_text','created_at'
        )
    ),
    'structured correction columns present'

  union all

  select
    '04_outcomes_columns_ready',
    (
      select count(*) = 7
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'ai_feedback_outcomes'
        and column_name in (
          'id','feedback_event_id','outcome_code','processor_code','processor_version',
          'outcome_snapshot_json','created_at'
        )
    ),
    'future downstream outcome columns present'

  union all

  select
    '05_events_execution_fk',
    exists (
      select 1
      from pg_catalog.pg_constraint
      where conrelid = to_regclass('public.ai_feedback_events')
        and contype = 'f'
        and pg_get_constraintdef(oid) ilike '%analysis_execution_id%'
        and pg_get_constraintdef(oid) ilike '%ai_analysis_executions%'
    ),
    'feedback is provenance-bound to AI analysis execution'

  union all

  select
    '06_events_client_idempotency_unique',
    exists (
      select 1
      from pg_catalog.pg_constraint
      where conrelid = to_regclass('public.ai_feedback_events')
        and conname = 'ai_feedback_events_client_user_v1_unique'
        and contype = 'u'
    ),
    'client retry idempotency is enforced per app user'

  union all

  select
    '07_correction_one_per_feedback_event',
    exists (
      select 1
      from pg_catalog.pg_constraint
      where conrelid = to_regclass('public.ai_feedback_corrections')
        and conname = 'ai_feedback_corrections_event_v1_unique'
        and contype = 'u'
    ),
    'one immutable structured correction per feedback event'

  union all

  select
    '08_rls_enabled_all',
    (
      select count(*) = 3
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('ai_feedback_events','ai_feedback_corrections','ai_feedback_outcomes')
        and c.relrowsecurity = true
    ),
    'RLS enabled on all new tables'

  union all

  select
    '09_anon_has_no_table_privileges',
    not has_table_privilege('anon', 'public.ai_feedback_events', 'SELECT')
      and not has_table_privilege('anon', 'public.ai_feedback_events', 'INSERT')
      and not has_table_privilege('anon', 'public.ai_feedback_events', 'UPDATE')
      and not has_table_privilege('anon', 'public.ai_feedback_events', 'DELETE')
      and not has_table_privilege('anon', 'public.ai_feedback_corrections', 'SELECT')
      and not has_table_privilege('anon', 'public.ai_feedback_corrections', 'INSERT')
      and not has_table_privilege('anon', 'public.ai_feedback_corrections', 'UPDATE')
      and not has_table_privilege('anon', 'public.ai_feedback_corrections', 'DELETE')
      and not has_table_privilege('anon', 'public.ai_feedback_outcomes', 'SELECT')
      and not has_table_privilege('anon', 'public.ai_feedback_outcomes', 'INSERT')
      and not has_table_privilege('anon', 'public.ai_feedback_outcomes', 'UPDATE')
      and not has_table_privilege('anon', 'public.ai_feedback_outcomes', 'DELETE'),
    'anon cannot directly access feedback events'

  union all

  select
    '10_authenticated_has_no_table_privileges',
    not has_table_privilege('authenticated', 'public.ai_feedback_events', 'SELECT')
      and not has_table_privilege('authenticated', 'public.ai_feedback_events', 'INSERT')
      and not has_table_privilege('authenticated', 'public.ai_feedback_events', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.ai_feedback_events', 'DELETE')
      and not has_table_privilege('authenticated', 'public.ai_feedback_corrections', 'SELECT')
      and not has_table_privilege('authenticated', 'public.ai_feedback_corrections', 'INSERT')
      and not has_table_privilege('authenticated', 'public.ai_feedback_corrections', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.ai_feedback_corrections', 'DELETE')
      and not has_table_privilege('authenticated', 'public.ai_feedback_outcomes', 'SELECT')
      and not has_table_privilege('authenticated', 'public.ai_feedback_outcomes', 'INSERT')
      and not has_table_privilege('authenticated', 'public.ai_feedback_outcomes', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.ai_feedback_outcomes', 'DELETE'),
    'authenticated cannot directly access feedback events'

  union all

  select
    '11_service_role_select_insert_only',
    has_table_privilege('service_role', 'public.ai_feedback_events', 'SELECT')
      and has_table_privilege('service_role', 'public.ai_feedback_events', 'INSERT')
      and not has_table_privilege('service_role', 'public.ai_feedback_events', 'UPDATE')
      and not has_table_privilege('service_role', 'public.ai_feedback_events', 'DELETE')
      and has_table_privilege('service_role', 'public.ai_feedback_corrections', 'SELECT')
      and has_table_privilege('service_role', 'public.ai_feedback_corrections', 'INSERT')
      and not has_table_privilege('service_role', 'public.ai_feedback_corrections', 'UPDATE')
      and not has_table_privilege('service_role', 'public.ai_feedback_corrections', 'DELETE')
      and has_table_privilege('service_role', 'public.ai_feedback_outcomes', 'SELECT')
      and has_table_privilege('service_role', 'public.ai_feedback_outcomes', 'INSERT')
      and not has_table_privilege('service_role', 'public.ai_feedback_outcomes', 'UPDATE')
      and not has_table_privilege('service_role', 'public.ai_feedback_outcomes', 'DELETE'),
    'application backend is append-only for Data Capital'

  union all

  select
    '12_service_role_policies_ready',
    (
      select count(*) = 6
      from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename in ('ai_feedback_events','ai_feedback_corrections','ai_feedback_outcomes')
        and policyname in (
          'ai_feedback_events_service_role_select_v1',
          'ai_feedback_events_service_role_insert_v1',
          'ai_feedback_corrections_service_role_select_v1',
          'ai_feedback_corrections_service_role_insert_v1',
          'ai_feedback_outcomes_service_role_select_v1',
          'ai_feedback_outcomes_service_role_insert_v1'
        )
    ),
    'explicit service-role SELECT/INSERT policies present'

  union all

  select
    '13_manual_link_shape_guard_present',
    exists (
      select 1
      from pg_catalog.pg_constraint
      where conrelid = to_regclass('public.ai_feedback_events')
        and conname = 'ai_feedback_events_manual_link_shape_v1_check'
        and contype = 'c'
    ),
    'manual leaf link intent requires target VO and dedicated verdict'

  union all

  select
    '14_existing_feedback_sources_preserved',
    to_regclass('public.activity_corrections') is not null
      and to_regclass('public.activity_fact_review_items') is not null
      and to_regclass('public.resolver_feedback') is not null
      and to_regclass('public.recommendation_feedback') is not null,
    'existing specialized feedback evidence sources preserved'

  union all

  select
    '15_ai_a1_execution_foundation_preserved',
    to_regclass('public.ai_analysis_executions') is not null
      and to_regclass('public.ai_context_manifests') is not null,
    'AI-A1 execution/context provenance remains present'

  union all

  select
    '16_activity_link_contract_preserved',
    to_regclass('public.activity_value_object_links') is not null
      and exists (
        select 1
        from pg_catalog.pg_constraint
        where conrelid = to_regclass('public.activity_value_object_links')
          and conname = 'activity_value_object_links_unique_semantic_link'
          and contype = 'u'
      ),
    'canonical activity-to-VO link table remains unchanged'

  union all

  select
    '17_global_leaf_baseline_unchanged',
    (
      select count(*) = 103
      from public.value_objects
      where scope_code = 'global'
        and ontology_node_role_code = 'leaf'
        and status = 'active'
    ),
    'expected 103 active GLOBAL leaves unchanged'

  union all

  select
    '18_new_tables_start_empty',
    (select count(*) = 0 from public.ai_feedback_events)
      and (select count(*) = 0 from public.ai_feedback_corrections)
      and (select count(*) = 0 from public.ai_feedback_outcomes),
    'migration created no user feedback rows'

  union all

  select
    '19_feedback_insert_guard_ready',
    exists (
      select 1
      from pg_catalog.pg_trigger
      where tgrelid = to_regclass('public.ai_feedback_events')
        and tgname = 'ai_feedback_events_insert_guard_v1_trg'
        and not tgisinternal
    )
      and exists (
        select 1
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'enforce_ai_feedback_event_v1'
          and p.prosecdef = true
          and position('v_value_object.scope_code = ''global''' in p.prosrc) > 0
          and position('v_value_object.owner_user_id is distinct from new.app_user_id' in p.prosrc) > 0
      ),
    'execution ownership and manual leaf-link guard is active'

  union all

  select
    '20_correction_insert_guard_ready',
    exists (
      select 1
      from pg_catalog.pg_trigger
      where tgrelid = to_regclass('public.ai_feedback_corrections')
        and tgname = 'ai_feedback_corrections_insert_guard_v1_trg'
        and not tgisinternal
    )
      and exists (
        select 1
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'enforce_ai_feedback_correction_v1'
          and p.prosecdef = true
          and position('v_value_object.scope_code = ''global''' in p.prosrc) > 0
          and position('v_value_object.owner_user_id is distinct from v_event.app_user_id' in p.prosrc) > 0
      ),
    'structured correction ownership/leaf guard is active'
)
select check_name, passed, detail
from checks
order by check_name;
