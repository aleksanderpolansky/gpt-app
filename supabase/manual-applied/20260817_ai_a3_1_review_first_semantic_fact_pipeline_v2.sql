-- ARCTor.app
-- AI-A3.1 REVIEW-FIRST SEMANTIC FACT PIPELINE v2
-- 2026-08-17
--
-- V2 fixes only the dependency preflight contract from the never-applied V1:
-- create_activity_event_pp1_v1 fifth argument is uuid[], not jsonb.
-- V1 stopped before any schema mutation with SQLSTATE 42883.
--
-- APPLY IN SUPABASE SQL EDITOR BEFORE SOURCE RELEASE.
--
-- LOCKED USER MODEL:
-- 1) quick capture saves activity immediately; no fact write before review;
-- 2) review AI proposes 1 primary + >=5 additional LEAF observation objects;
-- 3) user accepts/rejects/replaces/adds leafs;
-- 4) on Save, each (measurement x selected leaf) is one separate fact;
-- 5) process_count=1 is always written for every selected leaf;
-- 6) duration is always written for every selected leaf when duration is known;
-- 7) NO "parameter compatible with leaf" check exists in this pipeline;
-- 8) leaf card formulas are coefficient rules, not actual observed values;
-- 9) missing/no-match/no-rule coefficient means x1; matching rules multiply;
-- 10) no raw/calculated fact split: only final fact value is persisted;
-- 11) user correction may store actor-scoped wording example; never auto-mutates global profile.
--
-- This migration does not delete existing facts or old P5/GSR writers.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
declare
  v_pp1_oid regprocedure;
  v_budget_oid regprocedure;
  v_pp1_argnames text[];
  v_budget_argnames text[];
  v_found_signatures text;
begin
  if to_regclass('public.activity_events') is null
     or to_regclass('public.raw_activity_signals') is null
     or to_regclass('public.activity_event_measures') is null
     or to_regclass('public.activity_object_facts') is null
     or to_regclass('public.activity_value_object_links') is null
     or to_regclass('public.activity_measure_provenance') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.ai_analysis_executions') is null
     or to_regclass('public.ai_context_manifests') is null
     or to_regclass('public.ai_usage_events') is null
     or to_regclass('public.ai_pilot_budget_reservations_gsr1') is null
     or to_regclass('public.actor_public_profiles') is null then
    raise exception using
      errcode='42P01',
      message='AI_A3_1_REVIEW_FIRST_REQUIRED_FOUNDATION_MISSING';
  end if;

  -- PP1 exact source/deployed contract:
  -- (uuid,uuid,text,jsonb,uuid[]), with named arguments used by Supabase RPC.
  v_pp1_oid := to_regprocedure(
    'public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[])'
  );

  if v_pp1_oid is null then
    select string_agg(
      p.oid::regprocedure::text,
      ' | '
      order by p.oid::regprocedure::text
    )
    into v_found_signatures
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='create_activity_event_pp1_v1';

    raise exception using
      errcode='42883',
      message='AI_A3_1_REVIEW_FIRST_PP1_RPC_CONTRACT_MISMATCH',
      detail='Expected public.create_activity_event_pp1_v1(uuid,uuid,text,jsonb,uuid[]); found: '
        ||coalesce(v_found_signatures,'none');
  end if;

  select p.proargnames
  into v_pp1_argnames
  from pg_catalog.pg_proc p
  where p.oid=v_pp1_oid::oid;

  if v_pp1_argnames is distinct from array[
    'p_owner_user_id',
    'p_owner_actor_id',
    'p_idempotency_key',
    'p_activity',
    'p_planned_target_ids'
  ]::text[] then
    raise exception using
      errcode='42883',
      message='AI_A3_1_REVIEW_FIRST_PP1_RPC_ARGUMENT_NAMES_MISMATCH',
      detail='Expected argument names: p_owner_user_id,p_owner_actor_id,p_idempotency_key,p_activity,p_planned_target_ids; found: '
        ||coalesce(array_to_string(v_pp1_argnames,','),'none');
  end if;

  -- Existing GSR hard-budget contract.
  v_budget_oid := to_regprocedure(
    'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)'
  );

  if v_budget_oid is null then
    select string_agg(
      p.oid::regprocedure::text,
      ' | '
      order by p.oid::regprocedure::text
    )
    into v_found_signatures
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='preflight_ai_pilot_call_budget_v1';

    raise exception using
      errcode='42883',
      message='AI_A3_1_REVIEW_FIRST_BUDGET_RPC_CONTRACT_MISMATCH',
      detail='Expected public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer); found: '
        ||coalesce(v_found_signatures,'none');
  end if;

  select p.proargnames
  into v_budget_argnames
  from pg_catalog.pg_proc p
  where p.oid=v_budget_oid::oid;

  if v_budget_argnames is distinct from array[
    'p_app_user_id',
    'p_operation_id',
    'p_tier_code',
    'p_model_name',
    'p_input_tokens',
    'p_cached_input_tokens',
    'p_max_output_tokens'
  ]::text[] then
    raise exception using
      errcode='42883',
      message='AI_A3_1_REVIEW_FIRST_BUDGET_RPC_ARGUMENT_NAMES_MISMATCH',
      detail='Expected argument names: p_app_user_id,p_operation_id,p_tier_code,p_model_name,p_input_tokens,p_cached_input_tokens,p_max_output_tokens; found: '
        ||coalesce(array_to_string(v_budget_argnames,','),'none');
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_extension
    where extname='pgcrypto'
  ) then
    raise exception using
      errcode='55000',
      message='AI_A3_1_REVIEW_FIRST_PGCRYPTO_REQUIRED';
  end if;

  if to_regclass('public.activity_semantic_review_drafts_a31') is not null
     or to_regclass('public.activity_leaf_fact_coefficient_rules_a31') is not null
     or to_regclass('public.actor_value_object_recognition_examples_a31') is not null
     or to_regclass('public.activity_semantic_review_commit_operations_a31') is not null
     or to_regprocedure(
       'public.commit_activity_semantic_review_a31_v1(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)'
     ) is not null then
    raise exception using
      errcode='42P07',
      message='AI_A3_1_REVIEW_FIRST_TARGET_ALREADY_EXISTS';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid='public.activity_event_measures'::regclass
      and conname='activity_event_measures_unit_check'
      and pg_get_constraintdef(oid) like '%parameter_definition_id IS NULL%'
      and pg_get_constraintdef(oid) like '%km_per_hour%'
  )
  or not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid='public.activity_object_facts'::regclass
      and conname='activity_object_facts_unit_check'
      and pg_get_constraintdef(oid) like '%parameter_definition_id IS NULL%'
      and pg_get_constraintdef(oid) like '%km_per_hour%'
  ) then
    raise exception using
      errcode='23514',
      message='AI_A3_1_REVIEW_FIRST_UNIT_CONSTRAINT_BASELINE_UNEXPECTED';
  end if;

  if to_regprocedure(
       'public.enforce_activity_fact_actor_alignment_v2()'
     ) is null
     or position(
       'GSR1D_GLOBAL_FACT_REQUIRES_SYSTEM_PARAMETER_CONTRACT'
       in pg_get_functiondef(
         'public.enforce_activity_fact_actor_alignment_v2()'::regprocedure
       )
     )=0
     or position(
       'GSR1D_GLOBAL_FACT_SYSTEM_PARAMETER_ASSIGNMENT_MISMATCH'
       in pg_get_functiondef(
         'public.enforce_activity_fact_actor_alignment_v2()'::regprocedure
       )
     )=0 then
    raise exception using
      errcode='23514',
      message='AI_A3_1_REVIEW_FIRST_FACT_GUARD_BASELINE_UNEXPECTED';
  end if;
end
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Review draft: AI output is a draft, never a fact.
-- ---------------------------------------------------------------------------

create table public.activity_semantic_review_drafts_a31 (
  id uuid primary key default gen_random_uuid(),

  activity_event_id uuid not null
    references public.activity_events(id)
    on delete cascade,

  app_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  source_text_hash text not null,
  locale_code text not null,
  time_zone text not null,

  analysis_execution_id uuid
    references public.ai_analysis_executions(id)
    on delete set null,

  status text not null default 'draft',

  measurements_json jsonb not null default '[]'::jsonb,
  proposals_json jsonb not null default '[]'::jsonb,

  model_tier text,
  model_name text,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  committed_at timestamptz,

  constraint activity_semantic_review_drafts_a31_status_check
    check (status in ('draft','committed','superseded','failed')),

  constraint activity_semantic_review_drafts_a31_locale_check
    check (locale_code in ('ru','en','pl','uk','de','es','cs')),

  constraint activity_semantic_review_drafts_a31_hash_check
    check (source_text_hash ~ '^[0-9a-f]{64}$'),

  constraint activity_semantic_review_drafts_a31_measurements_check
    check (
      jsonb_typeof(measurements_json)='array'
      and jsonb_array_length(measurements_json) between 1 and 30
    ),

  constraint activity_semantic_review_drafts_a31_proposals_check
    check (
      jsonb_typeof(proposals_json)='array'
      and jsonb_array_length(proposals_json) between 6 and 20
    )
);

create unique index activity_semantic_review_drafts_a31_one_open_idx
  on public.activity_semantic_review_drafts_a31(activity_event_id)
  where status='draft';

create index activity_semantic_review_drafts_a31_owner_idx
  on public.activity_semantic_review_drafts_a31(
    app_user_id,
    actor_id,
    created_at desc
  );

alter table public.activity_semantic_review_drafts_a31 enable row level security;

revoke all on table public.activity_semantic_review_drafts_a31
  from public,anon,authenticated,service_role;
grant select,insert,update on table public.activity_semantic_review_drafts_a31
  to service_role;

create policy activity_semantic_review_drafts_a31_service
  on public.activity_semantic_review_drafts_a31
  for all to service_role
  using(true)
  with check(true);

-- ---------------------------------------------------------------------------
-- 2. Actor-scoped "typical formulations".
-- These are personal recognition evidence, not global ontology mutation.
-- ---------------------------------------------------------------------------

create table public.actor_value_object_recognition_examples_a31 (
  id uuid primary key default gen_random_uuid(),

  app_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  activity_event_id uuid not null
    references public.activity_events(id)
    on delete cascade,

  review_draft_id uuid not null
    references public.activity_semantic_review_drafts_a31(id)
    on delete cascade,

  locale_code text not null,
  example_text text not null,
  normalized_text text not null,

  source_kind text not null default 'explicit_primary_correction',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),

  constraint actor_vo_recognition_examples_a31_locale_check
    check (locale_code in ('ru','en','pl','uk','de','es','cs')),

  constraint actor_vo_recognition_examples_a31_text_check
    check (
      char_length(example_text) between 2 and 12000
      and char_length(normalized_text) between 2 and 12000
    ),

  constraint actor_vo_recognition_examples_a31_source_check
    check (source_kind='explicit_primary_correction'),

  constraint actor_vo_recognition_examples_a31_metadata_check
    check (jsonb_typeof(metadata_json)='object'),

  constraint actor_vo_recognition_examples_a31_unique
    unique(actor_id,value_object_id,locale_code,normalized_text)
);

create index actor_vo_recognition_examples_a31_actor_idx
  on public.actor_value_object_recognition_examples_a31(
    actor_id,
    locale_code,
    created_at desc
  );

alter table public.actor_value_object_recognition_examples_a31 enable row level security;

revoke all on table public.actor_value_object_recognition_examples_a31
  from public,anon,authenticated,service_role;
grant select,insert on table public.actor_value_object_recognition_examples_a31
  to service_role;

create policy actor_vo_recognition_examples_a31_service
  on public.actor_value_object_recognition_examples_a31
  for select to service_role using(true);

create policy actor_vo_recognition_examples_a31_service_insert
  on public.actor_value_object_recognition_examples_a31
  for insert to service_role with check(true);

-- ---------------------------------------------------------------------------
-- 3. Coefficient rules on a leaf.
-- There is deliberately NO list of "parameters compatible with this leaf".
-- target_parameter_code is simply the fact parameter to which this rule applies.
-- source_parameter_code points to a fact parameter tagged by another VO.
-- Missing source / no matching condition => multiplier 1.
-- Multiple matching rules multiply.
-- ---------------------------------------------------------------------------

create table public.activity_leaf_fact_coefficient_rules_a31 (
  id uuid primary key default gen_random_uuid(),
  client_rule_id uuid not null,

  rule_scope_code text not null default 'actor',

  owner_user_id uuid
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid
    references public.actors(id)
    on delete cascade,

  target_value_object_id uuid not null
    references public.value_objects(id)
    on delete cascade,

  target_parameter_code text not null,

  source_value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  source_parameter_code text not null,

  condition_operator text not null,
  condition_numeric_value numeric,
  condition_text_value text,
  condition_boolean_value boolean,

  multiplier numeric not null,

  priority integer not null default 1000,
  status text not null default 'active',

  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  retired_at timestamptz,

  constraint activity_leaf_fact_coefficient_rules_a31_scope_check
    check (
      (rule_scope_code='actor'
       and owner_user_id is not null
       and owner_actor_id is not null)
      or
      (rule_scope_code='system'
       and owner_user_id is null
       and owner_actor_id is null)
    ),

  constraint activity_leaf_fact_coefficient_rules_a31_parameter_code_check
    check (
      target_parameter_code ~ '^[a-z][a-z0-9_]{0,79}$'
      and source_parameter_code ~ '^[a-z][a-z0-9_]{0,79}$'
    ),

  constraint activity_leaf_fact_coefficient_rules_a31_condition_operator_check
    check (
      condition_operator in (
        'lt','lte','numeric_eq','gte','gt','text_eq','boolean_eq'
      )
    ),

  constraint activity_leaf_fact_coefficient_rules_a31_condition_shape_check
    check (
      (
        condition_operator in ('lt','lte','numeric_eq','gte','gt')
        and condition_numeric_value is not null
        and condition_text_value is null
        and condition_boolean_value is null
      )
      or
      (
        condition_operator='text_eq'
        and nullif(btrim(condition_text_value),'') is not null
        and condition_numeric_value is null
        and condition_boolean_value is null
      )
      or
      (
        condition_operator='boolean_eq'
        and condition_boolean_value is not null
        and condition_numeric_value is null
        and condition_text_value is null
      )
    ),

  constraint activity_leaf_fact_coefficient_rules_a31_multiplier_check
    check (multiplier between -1000000 and 1000000),

  constraint activity_leaf_fact_coefficient_rules_a31_priority_check
    check (priority between 1 and 10000),

  constraint activity_leaf_fact_coefficient_rules_a31_status_check
    check (status in ('active','retired')),

  constraint activity_leaf_fact_coefficient_rules_a31_metadata_check
    check (jsonb_typeof(metadata_json)='object'),

  constraint activity_leaf_fact_coefficient_rules_a31_not_same_vo_check
    check (target_value_object_id<>source_value_object_id),

  constraint activity_leaf_fact_coefficient_rules_a31_actor_client_unique
    unique(owner_user_id,owner_actor_id,client_rule_id)
);

create unique index activity_leaf_fact_coefficient_rules_a31_system_client_idx
  on public.activity_leaf_fact_coefficient_rules_a31(client_rule_id)
  where rule_scope_code='system';

create index activity_leaf_fact_coefficient_rules_a31_target_idx
  on public.activity_leaf_fact_coefficient_rules_a31(
    target_value_object_id,
    target_parameter_code,
    status,
    priority
  );

alter table public.activity_leaf_fact_coefficient_rules_a31 enable row level security;

revoke all on table public.activity_leaf_fact_coefficient_rules_a31
  from public,anon,authenticated,service_role;
grant select on table public.activity_leaf_fact_coefficient_rules_a31
  to service_role;

create policy activity_leaf_fact_coefficient_rules_a31_service
  on public.activity_leaf_fact_coefficient_rules_a31
  for select to service_role using(true);

-- ---------------------------------------------------------------------------
-- 4. Commit ledger.
-- ---------------------------------------------------------------------------

create table public.activity_semantic_review_commit_operations_a31 (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  activity_event_id uuid not null
    references public.activity_events(id)
    on delete cascade,

  review_draft_id uuid not null
    references public.activity_semantic_review_drafts_a31(id)
    on delete cascade,

  idempotency_key text not null,
  request_hash text not null,
  result_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),

  constraint activity_semantic_review_commit_operations_a31_unique
    unique(owner_user_id,owner_actor_id,idempotency_key),

  constraint activity_semantic_review_commit_operations_a31_hash_check
    check (request_hash ~ '^[0-9a-f]{64}$'),

  constraint activity_semantic_review_commit_operations_a31_result_check
    check (jsonb_typeof(result_json)='object')
);

alter table public.activity_semantic_review_commit_operations_a31
  enable row level security;

revoke all on table public.activity_semantic_review_commit_operations_a31
  from public,anon,authenticated,service_role;
grant select,insert on table public.activity_semantic_review_commit_operations_a31
  to service_role;

create policy activity_semantic_review_commit_operations_a31_service
  on public.activity_semantic_review_commit_operations_a31
  for select to service_role using(true);

create policy activity_semantic_review_commit_operations_a31_service_insert
  on public.activity_semantic_review_commit_operations_a31
  for insert to service_role with check(true);

-- ---------------------------------------------------------------------------
-- 5. Generic unit slug for observation facts.
-- Facts are not required to have a parameter definition/assignment.
-- ---------------------------------------------------------------------------

alter table public.activity_event_measures
  drop constraint activity_event_measures_unit_check;

alter table public.activity_event_measures
  add constraint activity_event_measures_unit_check
  check (unit ~ '^[a-z][a-z0-9_]{0,63}$');

alter table public.activity_object_facts
  drop constraint activity_object_facts_unit_check;

alter table public.activity_object_facts
  add constraint activity_object_facts_unit_check
  check (unit ~ '^[a-z][a-z0-9_]{0,63}$');

-- ---------------------------------------------------------------------------
-- 6. Narrowly widen GLOBAL fact guard for USER-CONFIRMED review facts.
-- Existing GSR parameter-assignment path remains unchanged for old writers.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_activity_fact_actor_alignment_v2()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_measure public.activity_event_measures%rowtype;
  v_value_object public.value_objects%rowtype;
  v_assignment public.value_object_parameter_assignments%rowtype;
  v_is_review_fact boolean;
begin
  select *
  into v_measure
  from public.activity_event_measures measure
  where measure.id=new.measure_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_FACT_MEASURE_NOT_FOUND';
  end if;

  if new.activity_event_id is distinct from v_measure.activity_event_id
     or new.user_id is distinct from v_measure.user_id
     or new.performed_by_actor_id is distinct from v_measure.performed_by_actor_id
     or new.acting_as_actor_id is distinct from v_measure.acting_as_actor_id
     or new.acting_for_actor_id is distinct from v_measure.acting_for_actor_id then
    raise exception using
      errcode='42501',
      message='P4A_FACT_MEASURE_ACTOR_MISMATCH';
  end if;

  if new.parameter_definition_id is distinct from v_measure.parameter_definition_id then
    raise exception using
      errcode='23514',
      message='GSR1D_FACT_MEASURE_PARAMETER_DEFINITION_MISMATCH';
  end if;

  v_is_review_fact :=
    coalesce(new.metadata->>'contract','')='ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1'
    and new.is_user_confirmed is true
    and new.semantic_match_method_code='user_confirmed';

  if new.value_object_id is not null then
    select *
    into v_value_object
    from public.value_objects
    where id=new.value_object_id;

    if not found then
      raise exception using
        errcode='23503',
        message='GSR1D_FACT_VALUE_OBJECT_NOT_FOUND';
    end if;

    if v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode='23514',
        message='P4A_FACT_REQUIRES_ONTOLOGY_LEAF';
    end if;

    if v_value_object.scope_code='global' then
      if v_value_object.owner_user_id is not null
         or v_value_object.owner_actor_id is not null
         or v_value_object.origin_type_code is distinct from 'system_model'
         or v_value_object.status is distinct from 'active' then
        raise exception using
          errcode='23514',
          message='GSR1D_GLOBAL_FACT_REQUIRES_ACTIVE_OWNERLESS_SYSTEM_LEAF';
      end if;

      if v_is_review_fact then
        if new.parameter_definition_id is not null
           or new.parameter_assignment_id is not null then
          raise exception using
            errcode='23514',
            message='AI_A3_1_REVIEW_FACT_MUST_NOT_USE_LEAF_PARAMETER_ASSIGNMENT';
        end if;
      else
        if new.parameter_definition_id is null
           or new.parameter_assignment_id is null then
          raise exception using
            errcode='23514',
            message='GSR1D_GLOBAL_FACT_REQUIRES_SYSTEM_PARAMETER_CONTRACT';
        end if;

        select *
        into v_assignment
        from public.value_object_parameter_assignments assignment
        where assignment.id=new.parameter_assignment_id;

        if not found
           or v_assignment.assignment_scope_code is distinct from 'system'
           or v_assignment.status is distinct from 'active'
           or v_assignment.value_object_id is distinct from new.value_object_id
           or v_assignment.parameter_definition_id is distinct from new.parameter_definition_id
           or v_assignment.owner_user_id is not null
           or v_assignment.owner_actor_id is not null then
          raise exception using
            errcode='23514',
            message='GSR1D_GLOBAL_FACT_SYSTEM_PARAMETER_ASSIGNMENT_MISMATCH';
        end if;
      end if;

    elsif v_value_object.scope_code='actor' or v_value_object.scope_code is null then
      if v_value_object.owner_user_id is distinct from new.user_id
         or v_value_object.owner_actor_id is distinct from new.acting_as_actor_id then
        raise exception using
          errcode='42501',
          message='P4A_FACT_VALUE_OBJECT_ACTOR_MISMATCH';
      end if;

      if new.parameter_assignment_id is not null
         and not exists (
           select 1
           from public.value_object_parameter_assignments assignment
           where assignment.id=new.parameter_assignment_id
             and assignment.value_object_id=new.value_object_id
             and assignment.owner_user_id=new.user_id
             and assignment.owner_actor_id=new.acting_as_actor_id
         ) then
        raise exception using
          errcode='23514',
          message='P4A_FACT_PARAMETER_ASSIGNMENT_TARGET_MISMATCH';
      end if;

    else
      raise exception using
        errcode='23514',
        message='GSR1D_FACT_VALUE_OBJECT_SCOPE_UNSUPPORTED';
    end if;
  end if;

  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Rule authoring RPCs.
-- These are actor overlays even when target leaf itself is GLOBAL.
-- ---------------------------------------------------------------------------

create function public.save_activity_leaf_fact_coefficient_rule_a31_v1(
  p_client_rule_id uuid,
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_target_value_object_id uuid,
  p_target_parameter_code text,
  p_source_value_object_id uuid,
  p_source_parameter_code text,
  p_condition_operator text,
  p_condition_numeric_value numeric,
  p_condition_text_value text,
  p_condition_boolean_value boolean,
  p_multiplier numeric,
  p_priority integer
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_target public.value_objects%rowtype;
  v_source public.value_objects%rowtype;
  v_rule_id uuid;
begin
  if not exists (
    select 1
    from public.actor_public_profiles profile
    where profile.owner_user_id=p_owner_user_id
      and profile.actor_id=p_owner_actor_id
  ) then
    raise exception using
      errcode='42501',
      message='AI_A3_1_COEFFICIENT_RULE_ACTOR_MISMATCH';
  end if;

  select * into v_target
  from public.value_objects
  where id=p_target_value_object_id;

  select * into v_source
  from public.value_objects
  where id=p_source_value_object_id;

  if v_target.id is null or v_source.id is null then
    raise exception using
      errcode='23503',
      message='AI_A3_1_COEFFICIENT_RULE_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_target.ontology_node_role_code is distinct from 'leaf'
     or v_source.ontology_node_role_code is distinct from 'leaf' then
    raise exception using
      errcode='23514',
      message='AI_A3_1_COEFFICIENT_RULE_REQUIRES_LEAF_OBJECTS';
  end if;

  if v_target.id=v_source.id then
    raise exception using
      errcode='23514',
      message='AI_A3_1_COEFFICIENT_RULE_SOURCE_MUST_BE_ANOTHER_VALUE_OBJECT';
  end if;

  if not (
    (
      v_target.scope_code='global'
      and v_target.status='active'
    )
    or
    (
      v_target.owner_user_id=p_owner_user_id
      and v_target.owner_actor_id=p_owner_actor_id
      and v_target.status in ('draft','active')
    )
  ) then
    raise exception using
      errcode='42501',
      message='AI_A3_1_COEFFICIENT_RULE_TARGET_ACCESS_DENIED';
  end if;

  if not (
    (
      v_source.scope_code='global'
      and v_source.status='active'
    )
    or
    (
      v_source.owner_user_id=p_owner_user_id
      and v_source.owner_actor_id=p_owner_actor_id
      and v_source.status in ('draft','active')
    )
  ) then
    raise exception using
      errcode='42501',
      message='AI_A3_1_COEFFICIENT_RULE_SOURCE_ACCESS_DENIED';
  end if;

  insert into public.activity_leaf_fact_coefficient_rules_a31(
    client_rule_id,
    rule_scope_code,
    owner_user_id,
    owner_actor_id,
    target_value_object_id,
    target_parameter_code,
    source_value_object_id,
    source_parameter_code,
    condition_operator,
    condition_numeric_value,
    condition_text_value,
    condition_boolean_value,
    multiplier,
    priority,
    metadata_json
  )
  values(
    p_client_rule_id,
    'actor',
    p_owner_user_id,
    p_owner_actor_id,
    p_target_value_object_id,
    lower(btrim(p_target_parameter_code)),
    p_source_value_object_id,
    lower(btrim(p_source_parameter_code)),
    p_condition_operator,
    p_condition_numeric_value,
    nullif(btrim(p_condition_text_value),''),
    p_condition_boolean_value,
    p_multiplier,
    coalesce(p_priority,1000),
    jsonb_build_object(
      'contract','ARCTOR_AI_A3_1_COEFFICIENT_RULE_V1',
      'missingContextMultiplier',1,
      'conditionNotMatchedMultiplier',1,
      'combinationMode','multiply',
      'arbitraryExpressionAllowed',false
    )
  )
  on conflict(owner_user_id,owner_actor_id,client_rule_id) do nothing
  returning id into v_rule_id;

  if v_rule_id is null then
    select id into v_rule_id
    from public.activity_leaf_fact_coefficient_rules_a31
    where owner_user_id=p_owner_user_id
      and owner_actor_id=p_owner_actor_id
      and client_rule_id=p_client_rule_id;
  end if;

  return jsonb_build_object(
    'ok',true,
    'contract','ARCTOR_AI_A3_1_COEFFICIENT_RULE_V1',
    'ruleId',v_rule_id,
    'combinationMode','multiply',
    'missingContextMultiplier',1
  );
end
$function$;

create function public.retire_activity_leaf_fact_coefficient_rule_a31_v1(
  p_rule_id uuid,
  p_owner_user_id uuid,
  p_owner_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_rows integer;
begin
  update public.activity_leaf_fact_coefficient_rules_a31
  set
    status='retired',
    retired_at=clock_timestamp(),
    updated_at=clock_timestamp()
  where id=p_rule_id
    and rule_scope_code='actor'
    and owner_user_id=p_owner_user_id
    and owner_actor_id=p_owner_actor_id
    and status='active';

  get diagnostics v_rows=row_count;

  if v_rows=0 and not exists (
    select 1
    from public.activity_leaf_fact_coefficient_rules_a31
    where id=p_rule_id
      and owner_user_id=p_owner_user_id
      and owner_actor_id=p_owner_actor_id
      and status='retired'
  ) then
    raise exception using
      errcode='42501',
      message='AI_A3_1_COEFFICIENT_RULE_RETIRE_DENIED_OR_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'ok',true,
    'contract','ARCTOR_AI_A3_1_COEFFICIENT_RULE_V1',
    'ruleId',p_rule_id,
    'status','retired'
  );
end
$function$;

-- ---------------------------------------------------------------------------
-- 8. Review commit writer.
-- Measurements are taken only from the server-stored draft.
-- Client supplies only selected leaf IDs and optional primary correction mapping.
-- ---------------------------------------------------------------------------

create function public.commit_activity_semantic_review_a31_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_activity_event_id uuid,
  p_review_draft_id uuid,
  p_idempotency_key text,
  p_request_hash text,
  p_selected_leaf_ids jsonb,
  p_primary_correction jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_activity public.activity_events%rowtype;
  v_draft public.activity_semantic_review_drafts_a31%rowtype;
  v_existing public.activity_semantic_review_commit_operations_a31%rowtype;

  v_selected_ids uuid[];
  v_selected_count integer;

  v_measurements jsonb;
  v_measurement jsonb;
  v_leaf_id uuid;
  v_leaf public.value_objects%rowtype;

  v_parameter_code text;
  v_measure_type text;
  v_unit text;
  v_value_type text;
  v_value_numeric numeric;
  v_value_text text;
  v_value_boolean boolean;
  v_raw_fragment text;

  v_final_numeric numeric;
  v_coefficient_product numeric;
  v_rule public.activity_leaf_fact_coefficient_rules_a31%rowtype;
  v_context_fact public.activity_object_facts%rowtype;
  v_rule_matches boolean;
  v_applied_rule_ids jsonb;
  v_neutral_rule_reasons jsonb;

  v_measure_id uuid;
  v_fact_id uuid;
  v_link_id uuid;

  v_fact_rows integer := 0;
  v_link_rows integer := 0;
  v_result_rows jsonb := '[]'::jsonb;
  v_result jsonb;

  v_metadata jsonb;
  v_review_resolved_at timestamptz := clock_timestamp();

  v_original_primary uuid;
  v_corrected_primary uuid;
  v_normalized_example text;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_activity_event_id is null
     or p_review_draft_id is null then
    raise exception using
      errcode='22023',
      message='AI_A3_1_REVIEW_COMMIT_REQUIRED_ARGUMENT_MISSING';
  end if;

  if nullif(btrim(p_idempotency_key),'') is null
     or p_request_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode='22023',
      message='AI_A3_1_REVIEW_COMMIT_IDEMPOTENCY_INVALID';
  end if;

  if jsonb_typeof(coalesce(p_selected_leaf_ids,'[]'::jsonb))<>'array' then
    raise exception using
      errcode='22023',
      message='AI_A3_1_REVIEW_COMMIT_SELECTED_LEAF_ARRAY_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_owner_user_id::text||':'||
      p_owner_actor_id::text||':'||
      btrim(p_idempotency_key),
      0
    )
  );

  select * into v_existing
  from public.activity_semantic_review_commit_operations_a31 operation
  where operation.owner_user_id=p_owner_user_id
    and operation.owner_actor_id=p_owner_actor_id
    and operation.idempotency_key=btrim(p_idempotency_key);

  if found then
    if v_existing.request_hash<>p_request_hash
       or v_existing.activity_event_id<>p_activity_event_id
       or v_existing.review_draft_id<>p_review_draft_id then
      raise exception using
        errcode='23505',
        message='AI_A3_1_REVIEW_COMMIT_IDEMPOTENCY_CONFLICT';
    end if;

    return v_existing.result_json
      ||jsonb_build_object(
        'writeStatus','idempotent_replay',
        'dbWriteExecuted',false,
        'factsActuallyWritten',0
      );
  end if;

  select * into v_activity
  from public.activity_events
  where id=p_activity_event_id
    and user_id=p_owner_user_id
    and acting_as_actor_id=p_owner_actor_id
  for update;

  if not found then
    raise exception using
      errcode='42501',
      message='AI_A3_1_REVIEW_COMMIT_ACTIVITY_NOT_OWNED';
  end if;

  v_metadata:=coalesce(v_activity.metadata_json,'{}'::jsonb);

  if coalesce((v_metadata->>'quickCaptureReviewRequired')::boolean,false) is not true
     or coalesce(v_metadata->>'quickCaptureReviewStatus','')='resolved' then
    raise exception using
      errcode='23514',
      message='AI_A3_1_REVIEW_COMMIT_ACTIVITY_NOT_PENDING_REVIEW';
  end if;

  select * into v_draft
  from public.activity_semantic_review_drafts_a31
  where id=p_review_draft_id
    and activity_event_id=p_activity_event_id
    and app_user_id=p_owner_user_id
    and actor_id=p_owner_actor_id
    and status='draft'
  for update;

  if not found then
    raise exception using
      errcode='23503',
      message='AI_A3_1_REVIEW_COMMIT_DRAFT_NOT_FOUND';
  end if;

  begin
    select array_agg(distinct value::uuid order by value::uuid)
    into v_selected_ids
    from jsonb_array_elements_text(p_selected_leaf_ids);
  exception
    when invalid_text_representation then
      raise exception using
        errcode='22023',
        message='AI_A3_1_REVIEW_COMMIT_SELECTED_LEAF_UUID_INVALID';
  end;

  v_selected_count:=coalesce(array_length(v_selected_ids,1),0);

  if v_selected_count<1 or v_selected_count>30 then
    raise exception using
      errcode='22023',
      message='AI_A3_1_REVIEW_COMMIT_SELECTED_LEAF_COUNT_INVALID';
  end if;

  begin
    select nullif(item->>'valueObjectId','')::uuid
    into v_original_primary
    from jsonb_array_elements(v_draft.proposals_json) item
    where coalesce((item->>'isPrimary')::boolean,false) is true
    limit 1;
  exception
    when invalid_text_representation then
      raise exception using
        errcode='23514',
        message='AI_A3_1_REVIEW_COMMIT_DRAFT_PRIMARY_INVALID';
  end;

  if v_original_primary is null then
    raise exception using
      errcode='23514',
      message='AI_A3_1_REVIEW_COMMIT_DRAFT_PRIMARY_MISSING';
  end if;

  begin
    v_corrected_primary:=
      nullif(p_primary_correction->>'correctedValueObjectId','')::uuid;

    if p_primary_correction ? 'originalValueObjectId' then
      if nullif(p_primary_correction->>'originalValueObjectId','')::uuid
         is distinct from v_original_primary then
        raise exception using
          errcode='23514',
          message='AI_A3_1_REVIEW_COMMIT_PRIMARY_CORRECTION_ORIGINAL_MISMATCH';
      end if;
    end if;
  exception
    when invalid_text_representation then
      raise exception using
        errcode='22023',
        message='AI_A3_1_REVIEW_COMMIT_PRIMARY_CORRECTION_UUID_INVALID';
  end;

  if v_corrected_primary is not null then
    if not (v_corrected_primary=any(v_selected_ids)) then
      raise exception using
        errcode='23514',
        message='AI_A3_1_REVIEW_COMMIT_CORRECTED_PRIMARY_NOT_SELECTED';
    end if;
  elsif not (v_original_primary=any(v_selected_ids)) then
    raise exception using
      errcode='23514',
      message='AI_A3_1_REVIEW_COMMIT_PRIMARY_NOT_SELECTED';
  end if;

  foreach v_leaf_id in array v_selected_ids
  loop
    select * into v_leaf
    from public.value_objects
    where id=v_leaf_id;

    if not found
       or v_leaf.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode='23514',
        message='AI_A3_1_REVIEW_COMMIT_REQUIRES_LEAF';
    end if;

    if not (
      (
        v_leaf.scope_code='global'
        and v_leaf.status='active'
        and v_leaf.owner_user_id is null
        and v_leaf.owner_actor_id is null
      )
      or
      (
        v_leaf.owner_user_id=p_owner_user_id
        and v_leaf.owner_actor_id=p_owner_actor_id
        and v_leaf.status in ('draft','active')
      )
    ) then
      raise exception using
        errcode='42501',
        message='AI_A3_1_REVIEW_COMMIT_LEAF_ACCESS_DENIED';
    end if;
  end loop;

  v_measurements:=v_draft.measurements_json;

  -- process_count=1 is universal for every selected leaf.
  if not exists (
    select 1
    from jsonb_array_elements(v_measurements) item
    where item->>'parameterCode'='process_count'
  ) then
    v_measurements:=v_measurements||jsonb_build_array(
      jsonb_build_object(
        'parameterCode','process_count',
        'measureType','count',
        'unit','count',
        'valueType','numeric',
        'valueNumeric',1,
        'valueText',null,
        'valueBoolean',null,
        'rawFragment','activity episode'
      )
    );
  end if;

  -- Known server duration is universal too.
  if v_activity.duration_minutes is not null
     and v_activity.duration_minutes>=0
     and not exists (
       select 1
       from jsonb_array_elements(v_measurements) item
       where item->>'parameterCode'='duration'
     ) then
    v_measurements:=v_measurements||jsonb_build_array(
      jsonb_build_object(
        'parameterCode','duration',
        'measureType','duration',
        'unit','minute',
        'valueType','numeric',
        'valueNumeric',v_activity.duration_minutes,
        'valueText',null,
        'valueBoolean',null,
        'rawFragment','server activity duration'
      )
    );
  end if;

  if jsonb_array_length(v_measurements)>30 then
    raise exception using
      errcode='22023',
      message='AI_A3_1_REVIEW_COMMIT_MEASUREMENT_LIMIT_EXCEEDED';
  end if;

  foreach v_leaf_id in array v_selected_ids
  loop
    select * into v_leaf
    from public.value_objects
    where id=v_leaf_id;

    insert into public.activity_value_object_links(
      activity_event_id,
      value_object_id,
      actor_id,
      app_user_id,
      link_type,
      exposure_type,
      confidence,
      evidence,
      metadata,
      status,
      provenance_code,
      created_by_actor_id,
      semantic_match_confidence,
      semantic_match_method_code
    )
    values(
      v_activity.id,
      v_leaf.id,
      v_activity.acting_as_actor_id,
      v_activity.user_id,
      'semantic_exposure',
      null,
      1,
      jsonb_build_object(
        'reviewDraftId',v_draft.id,
        'userConfirmed',true
      ),
      jsonb_build_object(
        'contract','ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1'
      ),
      'active',
      'manual',
      v_activity.acting_as_actor_id,
      1,
      'user_confirmed'
    )
    on conflict(activity_event_id,value_object_id,link_type)
    do update
    set
      confidence=1,
      semantic_match_confidence=1,
      semantic_match_method_code='user_confirmed',
      provenance_code='manual',
      status='active',
      updated_at=clock_timestamp()
    returning id into v_link_id;

    v_link_rows:=v_link_rows+1;

    for v_measurement in
      select value
      from jsonb_array_elements(v_measurements)
    loop
      if jsonb_typeof(v_measurement)<>'object' then
        raise exception using
          errcode='22023',
          message='AI_A3_1_REVIEW_COMMIT_MEASUREMENT_ROW_INVALID';
      end if;

      v_parameter_code:=lower(nullif(btrim(v_measurement->>'parameterCode'),''));
      v_measure_type:=lower(nullif(btrim(v_measurement->>'measureType'),''));
      v_unit:=lower(nullif(btrim(v_measurement->>'unit'),''));
      v_value_type:=lower(nullif(btrim(v_measurement->>'valueType'),''));
      v_raw_fragment:=nullif(v_measurement->>'rawFragment','');

      if v_parameter_code is null
         or v_parameter_code !~ '^[a-z][a-z0-9_]{0,79}$'
         or v_measure_type not in (
           'duration','distance','count','volume','mass','money','energy',
           'repetitions','state_score','state_text','boolean_state','role',
           'context_tag','derived_metric','rate','pressure','ratio',
           'temperature','sound_level','illuminance'
         )
         or v_unit is null
         or v_unit !~ '^[a-z][a-z0-9_]{0,63}$'
         or v_value_type not in ('numeric','text','boolean') then
        raise exception using
          errcode='22023',
          message='AI_A3_1_REVIEW_COMMIT_MEASUREMENT_CONTRACT_INVALID';
      end if;

      v_value_numeric:=null;
      v_value_text:=null;
      v_value_boolean:=null;

      if v_value_type='numeric' then
        if jsonb_typeof(v_measurement->'valueNumeric')<>'number' then
          raise exception using
            errcode='23514',
            message='AI_A3_1_REVIEW_COMMIT_NUMERIC_VALUE_REQUIRED';
        end if;
        v_value_numeric:=(v_measurement->>'valueNumeric')::numeric;
      elsif v_value_type='text' then
        if jsonb_typeof(v_measurement->'valueText')<>'string' then
          raise exception using
            errcode='23514',
            message='AI_A3_1_REVIEW_COMMIT_TEXT_VALUE_REQUIRED';
        end if;
        v_value_text:=v_measurement->>'valueText';
      else
        if jsonb_typeof(v_measurement->'valueBoolean')<>'boolean' then
          raise exception using
            errcode='23514',
            message='AI_A3_1_REVIEW_COMMIT_BOOLEAN_VALUE_REQUIRED';
        end if;
        v_value_boolean:=(v_measurement->>'valueBoolean')::boolean;
      end if;

      v_coefficient_product:=1;
      v_applied_rule_ids:='[]'::jsonb;
      v_neutral_rule_reasons:='[]'::jsonb;

      if v_value_type='numeric'
         and v_parameter_code<>'process_count' then
        for v_rule in
          select *
          from public.activity_leaf_fact_coefficient_rules_a31 rule_row
          where rule_row.target_value_object_id=v_leaf.id
            and rule_row.target_parameter_code=v_parameter_code
            and rule_row.status='active'
            and (
              rule_row.rule_scope_code='system'
              or (
                rule_row.rule_scope_code='actor'
                and rule_row.owner_user_id=p_owner_user_id
                and rule_row.owner_actor_id=p_owner_actor_id
              )
            )
          order by rule_row.priority,rule_row.created_at,rule_row.id
        loop
          v_context_fact:=null;
          v_rule_matches:=false;

          select fact.*
          into v_context_fact
          from public.activity_object_facts fact
          where fact.user_id=p_owner_user_id
            and fact.acting_as_actor_id=p_owner_actor_id
            and fact.value_object_id=v_rule.source_value_object_id
            and fact.activity_event_id<>p_activity_event_id
            and fact.fact_status='confirmed'
            and coalesce(
              fact.period_end,
              fact.period_start,
              fact.created_at
            )<=coalesce(
              v_activity.started_at,
              v_activity.created_at
            )
            and coalesce(
              fact.metadata->>'parameterCode',
              fact.metadata->>'systemParameterCode'
            )=v_rule.source_parameter_code
          order by
            coalesce(fact.period_end,fact.period_start,fact.created_at) desc,
            fact.created_at desc
          limit 1;

          if not found then
            v_neutral_rule_reasons:=v_neutral_rule_reasons||jsonb_build_array(
              jsonb_build_object(
                'ruleId',v_rule.id,
                'reason','CONTEXT_MISSING',
                'multiplier',1
              )
            );
            continue;
          end if;

          if v_rule.condition_operator='lt' then
            v_rule_matches:=
              v_context_fact.value_numeric is not null
              and v_context_fact.value_numeric<v_rule.condition_numeric_value;
          elsif v_rule.condition_operator='lte' then
            v_rule_matches:=
              v_context_fact.value_numeric is not null
              and v_context_fact.value_numeric<=v_rule.condition_numeric_value;
          elsif v_rule.condition_operator='numeric_eq' then
            v_rule_matches:=
              v_context_fact.value_numeric is not null
              and v_context_fact.value_numeric=v_rule.condition_numeric_value;
          elsif v_rule.condition_operator='gte' then
            v_rule_matches:=
              v_context_fact.value_numeric is not null
              and v_context_fact.value_numeric>=v_rule.condition_numeric_value;
          elsif v_rule.condition_operator='gt' then
            v_rule_matches:=
              v_context_fact.value_numeric is not null
              and v_context_fact.value_numeric>v_rule.condition_numeric_value;
          elsif v_rule.condition_operator='text_eq' then
            v_rule_matches:=
              v_context_fact.value_text is not null
              and lower(btrim(v_context_fact.value_text))
                  =lower(btrim(v_rule.condition_text_value));
          elsif v_rule.condition_operator='boolean_eq' then
            v_rule_matches:=
              v_context_fact.value_boolean is not null
              and v_context_fact.value_boolean=v_rule.condition_boolean_value;
          end if;

          if v_rule_matches then
            v_coefficient_product:=v_coefficient_product*v_rule.multiplier;
            v_applied_rule_ids:=v_applied_rule_ids||jsonb_build_array(v_rule.id);
          else
            v_neutral_rule_reasons:=v_neutral_rule_reasons||jsonb_build_array(
              jsonb_build_object(
                'ruleId',v_rule.id,
                'reason','CONDITION_NOT_MATCHED',
                'multiplier',1
              )
            );
          end if;
        end loop;
      end if;

      v_final_numeric:=
        case
          when v_value_numeric is null then null
          else v_value_numeric*v_coefficient_product
        end;

      insert into public.activity_event_measures(
        activity_event_id,
        user_id,
        performed_by_actor_id,
        acting_as_actor_id,
        acting_for_actor_id,
        measure_type,
        value_numeric,
        value_text,
        value_boolean,
        unit,
        source_type,
        confidence,
        is_derived,
        raw_fragment,
        normalized_fragment,
        metadata,
        parameter_definition_id,
        precision_policy_code
      )
      values(
        v_activity.id,
        v_activity.user_id,
        v_activity.performed_by_actor_id,
        v_activity.acting_as_actor_id,
        v_activity.acting_for_actor_id,
        v_measure_type,
        v_final_numeric,
        v_value_text,
        v_value_boolean,
        v_unit,
        case
          when v_value_type='numeric' and v_coefficient_product<>1
            then 'derived_calculation'
          else 'user_edit'
        end,
        1,
        v_value_type='numeric' and v_coefficient_product<>1,
        v_raw_fragment,
        v_raw_fragment,
        jsonb_build_object(
          'contract','ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1',
          'reviewDraftId',v_draft.id,
          'parameterCode',v_parameter_code,
          'coefficientProduct',v_coefficient_product,
          'appliedRuleIds',v_applied_rule_ids,
          'neutralRuleReasons',v_neutral_rule_reasons
        ),
        null,
        null
      )
      returning id into v_measure_id;

      insert into public.activity_measure_provenance(
        measure_id,
        owner_user_id,
        owner_actor_id,
        value_origin_code,
        source_reliability_code,
        source_reference_type_code,
        source_reference,
        source_snapshot_json,
        identified_entity_json,
        assumption_text
      )
      values(
        v_measure_id,
        p_owner_user_id,
        p_owner_actor_id,
        'user_explicit',
        'user_reported',
        null,
        null,
        jsonb_build_object(
          'contract','ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1',
          'reviewDraftId',v_draft.id,
          'parameterCode',v_parameter_code
        ),
        '{}'::jsonb,
        null
      );

      insert into public.activity_object_facts(
        activity_event_id,
        measure_id,
        user_id,
        performed_by_actor_id,
        acting_as_actor_id,
        acting_for_actor_id,
        value_object_id,
        semantic_object_key,
        semantic_object_label,
        measure_type,
        value_numeric,
        value_text,
        value_boolean,
        unit,
        period_start,
        period_end,
        fact_status,
        confidence,
        source_type,
        is_chronological_primary,
        is_exposure_fact,
        is_user_confirmed,
        metadata,
        semantic_match_confidence,
        semantic_match_method_code,
        parameter_definition_id,
        parameter_assignment_id
      )
      values(
        v_activity.id,
        v_measure_id,
        v_activity.user_id,
        v_activity.performed_by_actor_id,
        v_activity.acting_as_actor_id,
        v_activity.acting_for_actor_id,
        v_leaf.id,
        left(
          case
            when nullif(v_leaf.canonical_key,'') is not null
              then trim(both '_' from regexp_replace(
                lower(v_leaf.canonical_key),
                '[^a-z0-9_]+',
                '_',
                'g'
              ))
            else 'leaf_'||replace(v_leaf.id::text,'-','')
          end,
          80
        ),
        v_leaf.title,
        v_measure_type,
        v_final_numeric,
        v_value_text,
        v_value_boolean,
        v_unit,
        coalesce(v_activity.started_at,v_activity.created_at),
        coalesce(v_activity.ended_at,v_activity.started_at,v_activity.created_at),
        'confirmed',
        1,
        case
          when v_value_type='numeric' and v_coefficient_product<>1
            then 'derived_calculation'
          else 'user_edit'
        end,
        false,
        true,
        true,
        jsonb_build_object(
          'contract','ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1',
          'reviewDraftId',v_draft.id,
          'parameterCode',v_parameter_code,
          'coefficientProduct',v_coefficient_product,
          'appliedRuleIds',v_applied_rule_ids,
          'neutralRuleReasons',v_neutral_rule_reasons
        ),
        1,
        'user_confirmed',
        null,
        null
      )
      returning id into v_fact_id;

      v_fact_rows:=v_fact_rows+1;

      v_result_rows:=v_result_rows||jsonb_build_array(
        jsonb_build_object(
          'factId',v_fact_id,
          'measureId',v_measure_id,
          'valueObjectId',v_leaf.id,
          'parameterCode',v_parameter_code,
          'coefficientProduct',v_coefficient_product
        )
      );
    end loop;
  end loop;

  -- Learn wording ONLY when user explicitly replaced the PRIMARY proposal.
  if v_original_primary is not null
     and v_corrected_primary is not null
     and v_original_primary<>v_corrected_primary then
      v_normalized_example:=lower(
        btrim(
          regexp_replace(
            regexp_replace(coalesce(v_activity.input_text,v_activity.title),E'[\r\n\t]+',' ','g'),
            E'\\s+',
            ' ',
            'g'
          )
        )
      );

      if char_length(v_normalized_example)>=2 then
        insert into public.actor_value_object_recognition_examples_a31(
          app_user_id,
          actor_id,
          value_object_id,
          activity_event_id,
          review_draft_id,
          locale_code,
          example_text,
          normalized_text,
          metadata_json
        )
        values(
          p_owner_user_id,
          p_owner_actor_id,
          v_corrected_primary,
          v_activity.id,
          v_draft.id,
          v_draft.locale_code,
          coalesce(v_activity.input_text,v_activity.title),
          v_normalized_example,
          jsonb_build_object(
            'contract','ARCTOR_AI_A3_1_ACTOR_TYPICAL_FORMULATION_V1',
            'globalProfileMutated',false,
            'trainingConsentInferred',false
          )
        )
        on conflict(actor_id,value_object_id,locale_code,normalized_text)
        do nothing;
      end if;
  end if;

  update public.activity_semantic_review_drafts_a31
  set
    status='committed',
    committed_at=v_review_resolved_at,
    updated_at=v_review_resolved_at
  where id=v_draft.id;

  update public.activity_events
  set
    metadata_json=
      v_metadata||jsonb_build_object(
        'quickCaptureReviewStatus','resolved',
        'quickCaptureReviewResolvedAt',v_review_resolved_at,
        'quickCaptureReviewResolvedByActorId',p_owner_actor_id,
        'quickCaptureReviewResolutionContract','ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1',
        'semanticReviewDraftId',v_draft.id,
        'semanticReviewSelectedLeafCount',v_selected_count,
        'semanticReviewFactCount',v_fact_rows
      ),
    updated_at=v_review_resolved_at
  where id=v_activity.id;

  v_result:=jsonb_build_object(
    'ok',true,
    'contract','ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1',
    'writeStatus','written',
    'transactional',true,
    'dbWriteExecuted',true,
    'activityEventId',v_activity.id,
    'reviewDraftId',v_draft.id,
    'selectedLeafCount',v_selected_count,
    'factCount',v_fact_rows,
    'semanticLinkCount',v_link_rows,
    'rows',v_result_rows
  );

  insert into public.activity_semantic_review_commit_operations_a31(
    owner_user_id,
    owner_actor_id,
    activity_event_id,
    review_draft_id,
    idempotency_key,
    request_hash,
    result_json
  )
  values(
    p_owner_user_id,
    p_owner_actor_id,
    p_activity_event_id,
    p_review_draft_id,
    btrim(p_idempotency_key),
    p_request_hash,
    v_result
  );

  return v_result;
end
$function$;

-- ---------------------------------------------------------------------------
-- 9. Schema preflight RPC for source release.
-- ---------------------------------------------------------------------------

create function public.ai_a3_1_review_first_schema_preflight_v1()
returns jsonb
language sql
security definer
set search_path=public,pg_temp
as $function$
  select jsonb_build_object(
    'contract','ARCTOR_AI_A3_1_REVIEW_FIRST_SCHEMA_PREFLIGHT_V1',
    'ready',
      to_regclass('public.activity_semantic_review_drafts_a31') is not null
      and to_regclass('public.activity_leaf_fact_coefficient_rules_a31') is not null
      and to_regclass('public.actor_value_object_recognition_examples_a31') is not null
      and to_regclass('public.activity_semantic_review_commit_operations_a31') is not null
      and to_regprocedure(
        'public.commit_activity_semantic_review_a31_v1(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)'
      ) is not null
      and to_regprocedure(
        'public.save_activity_leaf_fact_coefficient_rule_a31_v1(uuid,uuid,uuid,uuid,text,uuid,text,text,numeric,text,boolean,numeric,integer)'
      ) is not null,
    'reviewDraftTable',
      to_regclass('public.activity_semantic_review_drafts_a31') is not null,
    'coefficientRuleTable',
      to_regclass('public.activity_leaf_fact_coefficient_rules_a31') is not null,
    'actorRecognitionExampleTable',
      to_regclass('public.actor_value_object_recognition_examples_a31') is not null,
    'reviewCommitRpc',
      to_regprocedure(
        'public.commit_activity_semantic_review_a31_v1(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)'
      ) is not null,
    'parameterCompatibilityCheckRequired',false,
    'processCountAlways',true,
    'missingContextMultiplier',1,
    'coefficientCombinationMode','multiply',
    'globalProfileAutoMutation',false
  )
$function$;

-- Privileges: server only.
revoke all on function public.save_activity_leaf_fact_coefficient_rule_a31_v1(
  uuid,uuid,uuid,uuid,text,uuid,text,text,numeric,text,boolean,numeric,integer
) from public,anon,authenticated;
grant execute on function public.save_activity_leaf_fact_coefficient_rule_a31_v1(
  uuid,uuid,uuid,uuid,text,uuid,text,text,numeric,text,boolean,numeric,integer
) to service_role;

revoke all on function public.retire_activity_leaf_fact_coefficient_rule_a31_v1(
  uuid,uuid,uuid
) from public,anon,authenticated;
grant execute on function public.retire_activity_leaf_fact_coefficient_rule_a31_v1(
  uuid,uuid,uuid
) to service_role;

revoke all on function public.commit_activity_semantic_review_a31_v1(
  uuid,uuid,uuid,uuid,text,text,jsonb,jsonb
) from public,anon,authenticated;
grant execute on function public.commit_activity_semantic_review_a31_v1(
  uuid,uuid,uuid,uuid,text,text,jsonb,jsonb
) to service_role;

revoke all on function public.ai_a3_1_review_first_schema_preflight_v1()
  from public,anon,authenticated;
grant execute on function public.ai_a3_1_review_first_schema_preflight_v1()
  to service_role;

-- ---------------------------------------------------------------------------
-- 10. Acceptance.
-- ---------------------------------------------------------------------------

do $acceptance$
declare
  v_failed text;
begin
  with checks(check_name,passed) as (
    select '01_review_drafts',
      to_regclass('public.activity_semantic_review_drafts_a31') is not null
    union all
    select '02_coefficient_rules',
      to_regclass('public.activity_leaf_fact_coefficient_rules_a31') is not null
    union all
    select '03_actor_examples',
      to_regclass('public.actor_value_object_recognition_examples_a31') is not null
    union all
    select '04_commit_ledger',
      to_regclass('public.activity_semantic_review_commit_operations_a31') is not null
    union all
    select '05_commit_rpc',
      to_regprocedure(
        'public.commit_activity_semantic_review_a31_v1(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)'
      ) is not null
    union all
    select '06_browser_drafts_blocked',
      not has_table_privilege('anon','public.activity_semantic_review_drafts_a31','SELECT')
      and not has_table_privilege('authenticated','public.activity_semantic_review_drafts_a31','SELECT')
    union all
    select '07_browser_rules_blocked',
      not has_table_privilege('anon','public.activity_leaf_fact_coefficient_rules_a31','SELECT')
      and not has_table_privilege('authenticated','public.activity_leaf_fact_coefficient_rules_a31','SELECT')
    union all
    select '08_browser_examples_blocked',
      not has_table_privilege('anon','public.actor_value_object_recognition_examples_a31','SELECT')
      and not has_table_privilege('authenticated','public.actor_value_object_recognition_examples_a31','SELECT')
    union all
    select '09_service_commit_rpc',
      has_function_privilege(
        'service_role',
        'public.commit_activity_semantic_review_a31_v1(uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)',
        'EXECUTE'
      )
    union all
    select '10_generic_unit_slug_measures',
      position(
        '^[a-z][a-z0-9_]{0,63}$'
        in pg_get_constraintdef((
          select oid
          from pg_catalog.pg_constraint
          where conrelid='public.activity_event_measures'::regclass
            and conname='activity_event_measures_unit_check'
        ))
      )>0
    union all
    select '11_generic_unit_slug_facts',
      position(
        '^[a-z][a-z0-9_]{0,63}$'
        in pg_get_constraintdef((
          select oid
          from pg_catalog.pg_constraint
          where conrelid='public.activity_object_facts'::regclass
            and conname='activity_object_facts_unit_check'
        ))
      )>0
    union all
    select '12_schema_ready',
      coalesce(
        (public.ai_a3_1_review_first_schema_preflight_v1()->>'ready')::boolean,
        false
      )
  )
  select string_agg(check_name,', ' order by check_name)
  into v_failed
  from checks
  where not passed;

  if v_failed is not null then
    raise exception using
      errcode='23514',
      message='AI_A3_1_REVIEW_FIRST_ACCEPTANCE_FAILED',
      detail=v_failed;
  end if;
end
$acceptance$;

commit;

select jsonb_pretty(
  public.ai_a3_1_review_first_schema_preflight_v1()
  ||jsonb_build_object(
    'check','ARCTOR_AI_A3_1_REVIEW_FIRST_SCHEMA_APPLY_V2',
    'acceptance','12/12 PASS',
    'existingActivityFactsModified',0,
    'factsWrittenByMigration',0,
    'globalRecognitionProfilesModified',0
  )
) as arctor_ai_a3_1_review_first_schema_apply;
