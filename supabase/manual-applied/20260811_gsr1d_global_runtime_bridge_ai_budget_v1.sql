/*
ARCTor.app — GSR-1D
Global observation runtime bridge + OpenAI pilot hard-budget gate v1
2026-08-11

MANUAL SUPABASE SQL EDITOR STEP.

NO OPENAI API CALLS ARE MADE BY THIS SQL.

LOCKED PILOT SAFETY POLICY
- Default maximum provider cost per one user operation: USD 0.10 total.
- The USD 0.10 ceiling is the SUM of all OpenAI calls inside that operation.
- Maximum OpenAI calls per operation: 3.
- Maximum operation window: 60 seconds.
- Price snapshot older than 7 days => request must be blocked.
- Unknown price => request must be blocked.
- There is NO persistent expensive-test override in this migration.
- A >USD 0.10 test requires a future, one-off path created only after fresh
  explicit user confirmation for that specific test.

RUNTIME MODEL
Personal activity / measure / fact rows remain actor-owned.
A fact may reference:
1) actor-owned ontology leaf (legacy/current path), OR
2) ownerless GLOBAL system ontology leaf (new GSR bridge).

GLOBAL facts MUST use an active SYSTEM parameter assignment belonging to that
same GLOBAL semantic leaf. This prevents arbitrary parameter writes.

This migration does NOT enable P8.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

-- ===========================================================================
-- 1. Hard preflight
-- ===========================================================================

do $preflight$
begin
  if to_regclass('public.activity_events') is null
     or to_regclass('public.activity_event_measures') is null
     or to_regclass('public.activity_object_facts') is null
     or to_regclass('public.activity_value_object_links') is null
     or to_regclass('public.activity_measure_provenance') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null
     or to_regclass('public.ai_model_price_snapshots') is null
     or to_regclass('public.ai_usage_events') is null then
    raise exception using
      errcode='42P01',
      message='GSR1D_REQUIRED_TABLES_MISSING';
  end if;

  if (
    select count(*)
    from public.value_objects
    where scope_code='global'
      and canonical_key is not null
  ) <> 150
     or (
       select count(*)
       from public.value_objects
       where scope_code='global'
         and ontology_node_role_code='leaf'
     ) <> 103
     or (
       select count(*)
       from public.value_object_parameter_assignments a
       join public.value_objects v on v.id=a.value_object_id
       where a.assignment_scope_code='system'
         and a.status='active'
         and v.scope_code='global'
     ) <> 52 then
    raise exception using
      errcode='23514',
      message='GSR1D_GLOBAL_REALITY_BASELINE_MISMATCH';
  end if;

  if to_regprocedure(
       'public.recognize_global_value_object_text_v1(text,text,text,text,integer)'
     ) is null
     or to_regprocedure(
       'public.get_global_value_object_leaf_candidates_v1(text,text,integer)'
     ) is null then
    raise exception using
      errcode='42883',
      message='GSR1D_GLOBAL_RECOGNITION_BASELINE_MISSING';
  end if;

  if to_regclass('public.global_observation_fact_write_operations_gsr1') is not null
     or to_regclass('public.ai_pilot_budget_reservations_gsr1') is not null
     or to_regprocedure(
       'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)'
     ) is not null
     or to_regprocedure(
       'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)'
     ) is not null then
    raise exception using
      errcode='23514',
      message='GSR1D_ALREADY_INSTALLED_OR_PARTIALLY_APPLIED';
  end if;

  if exists (
    select 1
    from public.activity_object_facts fact
    join public.value_objects value_object
      on value_object.id=fact.value_object_id
    where value_object.scope_code='global'
  ) then
    raise exception using
      errcode='23514',
      message='GSR1D_GLOBAL_FACTS_ALREADY_EXIST';
  end if;

  if exists (
    select 1
    from public.activity_value_object_links link_row
    join public.value_objects value_object
      on value_object.id=link_row.value_object_id
    where value_object.scope_code='global'
  ) then
    raise exception using
      errcode='23514',
      message='GSR1D_GLOBAL_ACTIVITY_LINKS_ALREADY_EXIST';
  end if;
end;
$preflight$;

-- ===========================================================================
-- 2. Extend generic measure/fact storage for GSR parameter dimensions
-- ===========================================================================

alter table public.activity_event_measures
  drop constraint activity_event_measures_measure_type_check;

alter table public.activity_event_measures
  add constraint activity_event_measures_measure_type_check
  check (
    measure_type in (
      'duration',
      'distance',
      'count',
      'volume',
      'mass',
      'money',
      'energy',
      'repetitions',
      'state_score',
      'state_text',
      'boolean_state',
      'role',
      'context_tag',
      'derived_metric',
      'rate',
      'pressure',
      'ratio',
      'temperature',
      'sound_level',
      'illuminance'
    )
  );

alter table public.activity_object_facts
  drop constraint activity_object_facts_measure_type_check;

alter table public.activity_object_facts
  add constraint activity_object_facts_measure_type_check
  check (
    measure_type in (
      'duration',
      'distance',
      'count',
      'volume',
      'mass',
      'money',
      'energy',
      'repetitions',
      'state_score',
      'state_text',
      'boolean_state',
      'role',
      'context_tag',
      'derived_metric',
      'rate',
      'pressure',
      'ratio',
      'temperature',
      'sound_level',
      'illuminance'
    )
  );

-- Legacy rows without parameter_definition_id retain the historical unit list.
-- Parameterized rows may use canonical registry unit codes, but a trigger below
-- validates the unit against value_object_parameter_definitions.allowed_unit_codes.

alter table public.activity_event_measures
  drop constraint activity_event_measures_unit_check;

alter table public.activity_event_measures
  add constraint activity_event_measures_unit_check
  check (
    (
      parameter_definition_id is null
      and unit in (
        'minute','hour','meter','kilometer','count','repetition','set',
        'milliliter','liter','gram','kilogram','kcal','pln','eur','usd',
        'score_0_10','boolean','text','tag','role','km_per_hour'
      )
    )
    or
    (
      parameter_definition_id is not null
      and unit ~ '^[a-z][a-z0-9_]{0,63}$'
    )
  );

alter table public.activity_object_facts
  drop constraint activity_object_facts_unit_check;

alter table public.activity_object_facts
  add constraint activity_object_facts_unit_check
  check (
    (
      parameter_definition_id is null
      and unit in (
        'minute','hour','meter','kilometer','count','repetition','set',
        'milliliter','liter','gram','kilogram','kcal','pln','eur','usd',
        'score_0_10','boolean','text','tag','role','km_per_hour'
      )
    )
    or
    (
      parameter_definition_id is not null
      and unit ~ '^[a-z][a-z0-9_]{0,63}$'
    )
  );

create or replace function public.enforce_activity_parameter_unit_gsr1()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_definition public.value_object_parameter_definitions%rowtype;
begin
  if new.parameter_definition_id is null then
    return new;
  end if;

  select *
  into v_definition
  from public.value_object_parameter_definitions
  where id=new.parameter_definition_id;

  if not found then
    raise exception using
      errcode='23503',
      message='GSR1D_PARAMETER_DEFINITION_NOT_FOUND';
  end if;

  if v_definition.status <> 'active' then
    raise exception using
      errcode='23514',
      message='GSR1D_PARAMETER_DEFINITION_NOT_ACTIVE';
  end if;

  if not (v_definition.allowed_unit_codes ? new.unit) then
    raise exception using
      errcode='23514',
      message='GSR1D_UNIT_NOT_ALLOWED_BY_PARAMETER_DEFINITION';
  end if;

  if v_definition.value_type_code='numeric'
     and new.value_numeric is null then
    raise exception using
      errcode='23514',
      message='GSR1D_NUMERIC_PARAMETER_REQUIRES_NUMERIC_VALUE';
  elsif v_definition.value_type_code='text'
     and new.value_text is null then
    raise exception using
      errcode='23514',
      message='GSR1D_TEXT_PARAMETER_REQUIRES_TEXT_VALUE';
  elsif v_definition.value_type_code='boolean'
     and new.value_boolean is null then
    raise exception using
      errcode='23514',
      message='GSR1D_BOOLEAN_PARAMETER_REQUIRES_BOOLEAN_VALUE';
  end if;

  return new;
end;
$function$;

create trigger activity_event_measures_parameter_unit_gsr1_trg
before insert or update of
  parameter_definition_id,
  unit,
  value_numeric,
  value_text,
  value_boolean
on public.activity_event_measures
for each row
execute function public.enforce_activity_parameter_unit_gsr1();

create trigger activity_object_facts_parameter_unit_gsr1_trg
before insert or update of
  parameter_definition_id,
  unit,
  value_numeric,
  value_text,
  value_boolean
on public.activity_object_facts
for each row
execute function public.enforce_activity_parameter_unit_gsr1();

-- ===========================================================================
-- 3. Widen fact guard narrowly: actor leaf OR ownerless GLOBAL system leaf
-- ===========================================================================

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

    elsif v_value_object.scope_code='actor' or v_value_object.scope_code is null then
      -- Existing actor/legacy rule preserved.
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

-- ===========================================================================
-- 4. Widen activity semantic-exposure guard narrowly
-- ===========================================================================

create or replace function public.enforce_activity_value_object_link_pp1a()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_activity public.activity_events%rowtype;
  v_value_object public.value_objects%rowtype;
begin
  if new.status='active' then
    new.deactivated_at := null;
  elsif new.deactivated_at is null then
    new.deactivated_at := clock_timestamp();
  end if;

  select *
  into v_activity
  from public.activity_events
  where id=new.activity_event_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_ACTIVITY_LINK_ACTIVITY_NOT_FOUND';
  end if;

  select *
  into v_value_object
  from public.value_objects
  where id=new.value_object_id;

  if not found then
    raise exception using
      errcode='23503',
      message='P4A_ACTIVITY_LINK_VALUE_OBJECT_NOT_FOUND';
  end if;

  if new.app_user_id is null then
    new.app_user_id := v_activity.user_id;
  end if;

  if new.actor_id is null then
    new.actor_id := v_activity.acting_as_actor_id;
  end if;

  if new.created_by_actor_id is null then
    new.created_by_actor_id := v_activity.acting_as_actor_id;
  end if;

  if new.app_user_id is distinct from v_activity.user_id
     or new.actor_id is distinct from v_activity.acting_as_actor_id then
    raise exception using
      errcode='42501',
      message='P4A_ACTIVITY_LINK_OWNER_MISMATCH';
  end if;

  if v_value_object.scope_code='global' then
    if new.link_type is distinct from 'semantic_exposure' then
      raise exception using
        errcode='23514',
        message='GSR1D_GLOBAL_VALUE_OBJECT_LINK_ONLY_SEMANTIC_EXPOSURE';
    end if;

    if v_value_object.ontology_node_role_code is distinct from 'leaf'
       or v_value_object.owner_user_id is not null
       or v_value_object.owner_actor_id is not null
       or v_value_object.origin_type_code is distinct from 'system_model'
       or v_value_object.status is distinct from 'active' then
      raise exception using
        errcode='23514',
        message='GSR1D_GLOBAL_SEMANTIC_EXPOSURE_REQUIRES_ACTIVE_OWNERLESS_SYSTEM_LEAF';
    end if;

    return new;
  end if;

  -- Existing actor/legacy ownership path preserved.
  if v_value_object.owner_user_id is distinct from v_activity.user_id
     or v_value_object.owner_actor_id is distinct from v_activity.acting_as_actor_id then
    raise exception using
      errcode='42501',
      message='P4A_ACTIVITY_LINK_OWNER_MISMATCH';
  end if;

  if new.link_type='planned_target' then
    if v_activity.activity_role_code <> 'planned' then
      raise exception using
        errcode='23514',
        message='P4A_PLANNED_TARGET_REQUIRES_PLANNED_ACTIVITY';
    end if;

    if v_value_object.ontology_node_role_code not in (
      'root','intermediate','leaf'
    ) then
      raise exception using
        errcode='23514',
        message='P4A_PLANNED_TARGET_REQUIRES_ONTOLOGY_VALUE_OBJECT';
    end if;

  elsif new.link_type='semantic_exposure' then
    if v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using
        errcode='23514',
        message='P4A_SEMANTIC_EXPOSURE_REQUIRES_ONTOLOGY_LEAF';
    end if;
  end if;

  return new;
end;
$function$;

-- ===========================================================================
-- 5. Idempotent GLOBAL observation write ledger
-- ===========================================================================

create table public.global_observation_fact_write_operations_gsr1 (
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

  idempotency_key text not null,
  request_hash text not null,

  result_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),

  constraint global_observation_fact_write_operations_gsr1_key_unique
    unique(owner_user_id,owner_actor_id,idempotency_key),

  constraint global_observation_fact_write_operations_gsr1_json_check
    check(jsonb_typeof(result_json)='object')
);

alter table public.global_observation_fact_write_operations_gsr1
  enable row level security;

revoke all
on table public.global_observation_fact_write_operations_gsr1
from public,anon,authenticated,service_role;

grant select,insert
on table public.global_observation_fact_write_operations_gsr1
to service_role;

create policy global_observation_fact_write_operations_gsr1_no_browser
on public.global_observation_fact_write_operations_gsr1
for all
to anon,authenticated
using(false)
with check(false);

-- ===========================================================================
-- 6. Controlled GLOBAL Activity -> Measure -> Fact writer
-- ===========================================================================

create or replace function public.attach_global_observation_facts_gsr1_v1(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_activity_event_id uuid,
  p_idempotency_key text,
  p_request_hash text,
  p_facts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_activity public.activity_events%rowtype;
  v_existing public.global_observation_fact_write_operations_gsr1%rowtype;
  v_fact jsonb;
  v_value_object public.value_objects%rowtype;
  v_assignment public.value_object_parameter_assignments%rowtype;
  v_definition public.value_object_parameter_definitions%rowtype;

  v_canonical_key text;
  v_parameter_code text;
  v_unit text;
  v_measure_type text;
  v_raw_fragment text;
  v_normalized_fragment text;
  v_match_method text;
  v_source_type text;
  v_precision_policy text;
  v_origin_code text;
  v_reliability_code text;

  v_confidence numeric;
  v_value_numeric numeric;
  v_value_text text;
  v_value_boolean boolean;

  v_has_numeric boolean;
  v_has_text boolean;
  v_has_boolean boolean;
  v_value_count integer;

  v_period_start timestamptz;
  v_period_end timestamptz;

  v_measure_id uuid;
  v_fact_id uuid;
  v_link_id uuid;

  v_rows_written integer := 0;
  v_result_rows jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  if p_owner_user_id is null
     or p_owner_actor_id is null
     or p_activity_event_id is null then
    raise exception using
      errcode='22023',
      message='GSR1D_GLOBAL_FACT_OWNER_ACTIVITY_REQUIRED';
  end if;

  if nullif(btrim(p_idempotency_key),'') is null
     or nullif(btrim(p_request_hash),'') is null then
    raise exception using
      errcode='22023',
      message='GSR1D_GLOBAL_FACT_IDEMPOTENCY_REQUIRED';
  end if;

  if jsonb_typeof(coalesce(p_facts,'[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_facts,'[]'::jsonb)) < 1
     or jsonb_array_length(coalesce(p_facts,'[]'::jsonb)) > 20 then
    raise exception using
      errcode='22023',
      message='GSR1D_GLOBAL_FACT_ARRAY_SIZE_INVALID';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_owner_user_id::text || ':' ||
      p_owner_actor_id::text || ':' ||
      btrim(p_idempotency_key),
      0
    )
  );

  select *
  into v_existing
  from public.global_observation_fact_write_operations_gsr1 operation
  where operation.owner_user_id=p_owner_user_id
    and operation.owner_actor_id=p_owner_actor_id
    and operation.idempotency_key=btrim(p_idempotency_key);

  if found then
    if v_existing.request_hash <> btrim(p_request_hash)
       or v_existing.activity_event_id <> p_activity_event_id then
      raise exception using
        errcode='23505',
        message='GSR1D_GLOBAL_FACT_IDEMPOTENCY_CONFLICT';
    end if;

    return v_existing.result_json
      || jsonb_build_object(
        'writeStatus','idempotent_replay',
        'dbWriteExecuted',false,
        'rowsActuallyWritten',0
      );
  end if;

  select *
  into v_activity
  from public.activity_events
  where id=p_activity_event_id
    and user_id=p_owner_user_id
    and acting_as_actor_id=p_owner_actor_id
  for update;

  if not found then
    raise exception using
      errcode='42501',
      message='GSR1D_GLOBAL_FACT_ACTIVITY_NOT_OWNED';
  end if;

  for v_fact in
    select value from jsonb_array_elements(p_facts)
  loop
    if jsonb_typeof(v_fact) <> 'object' then
      raise exception using
        errcode='22023',
        message='GSR1D_GLOBAL_FACT_ROW_MUST_BE_OBJECT';
    end if;

    v_canonical_key := nullif(btrim(v_fact->>'canonicalKey'),'');
    v_parameter_code := nullif(btrim(v_fact->>'parameterCode'),'');
    v_unit := lower(nullif(btrim(v_fact->>'unit'),''));

    if v_canonical_key is null
       or v_parameter_code is null
       or v_unit is null then
      raise exception using
        errcode='22023',
        message='GSR1D_GLOBAL_FACT_TARGET_PARAMETER_UNIT_REQUIRED';
    end if;

    select *
    into v_value_object
    from public.value_objects
    where canonical_key=v_canonical_key
      and scope_code='global'
      and ontology_node_role_code='leaf'
      and status='active';

    if not found then
      raise exception using
        errcode='23503',
        message='GSR1D_GLOBAL_FACT_CANONICAL_LEAF_NOT_FOUND';
    end if;

    select assignment
    into v_assignment
    from public.value_object_parameter_assignments assignment
    join public.value_object_parameter_definitions definition
      on definition.id=assignment.parameter_definition_id
    where assignment.value_object_id=v_value_object.id
      and assignment.assignment_scope_code='system'
      and assignment.status='active'
      and definition.parameter_code=v_parameter_code
      and definition.scope_code='system'
      and definition.status='active'
    limit 1;

    if not found then
      raise exception using
        errcode='23514',
        message='GSR1D_GLOBAL_FACT_PARAMETER_NOT_ALLOWED_FOR_LEAF';
    end if;

    select *
    into v_definition
    from public.value_object_parameter_definitions
    where id=v_assignment.parameter_definition_id;

    if not found then
      raise exception using
        errcode='23503',
        message='GSR1D_GLOBAL_FACT_PARAMETER_DEFINITION_NOT_FOUND';
    end if;

    if not (v_definition.allowed_unit_codes ? v_unit) then
      raise exception using
        errcode='23514',
        message='GSR1D_GLOBAL_FACT_UNIT_NOT_ALLOWED';
    end if;

    v_has_numeric := v_fact ? 'valueNumeric'
      and jsonb_typeof(v_fact->'valueNumeric')='number';
    v_has_text := v_fact ? 'valueText'
      and jsonb_typeof(v_fact->'valueText')='string';
    v_has_boolean := v_fact ? 'valueBoolean'
      and jsonb_typeof(v_fact->'valueBoolean')='boolean';

    v_value_count :=
      (case when v_has_numeric then 1 else 0 end)
      + (case when v_has_text then 1 else 0 end)
      + (case when v_has_boolean then 1 else 0 end);

    if v_value_count <> 1 then
      raise exception using
        errcode='23514',
        message='GSR1D_GLOBAL_FACT_EXACTLY_ONE_VALUE_REQUIRED';
    end if;

    v_value_numeric :=
      case when v_has_numeric then (v_fact->>'valueNumeric')::numeric else null end;
    v_value_text :=
      case when v_has_text then v_fact->>'valueText' else null end;
    v_value_boolean :=
      case when v_has_boolean then (v_fact->>'valueBoolean')::boolean else null end;

    if v_definition.value_type_code='numeric' and not v_has_numeric then
      raise exception using
        errcode='23514',
        message='GSR1D_GLOBAL_FACT_PARAMETER_EXPECTS_NUMERIC';
    elsif v_definition.value_type_code='text' and not v_has_text then
      raise exception using
        errcode='23514',
        message='GSR1D_GLOBAL_FACT_PARAMETER_EXPECTS_TEXT';
    elsif v_definition.value_type_code='boolean' and not v_has_boolean then
      raise exception using
        errcode='23514',
        message='GSR1D_GLOBAL_FACT_PARAMETER_EXPECTS_BOOLEAN';
    end if;

    v_measure_type :=
      case
        when v_definition.parameter_code='repetition_count' then 'repetitions'
        when v_definition.dimension_code='time' then 'duration'
        when v_definition.dimension_code='distance' then 'distance'
        when v_definition.dimension_code='count' then 'count'
        when v_definition.dimension_code='volume' then 'volume'
        when v_definition.dimension_code='mass' then 'mass'
        when v_definition.dimension_code='energy' then 'energy'
        when v_definition.dimension_code='money' then 'money'
        when v_definition.dimension_code='score' then 'state_score'
        when v_definition.dimension_code='text' then 'state_text'
        when v_definition.dimension_code='boolean' then 'boolean_state'
        when v_definition.dimension_code='rate' then 'rate'
        when v_definition.dimension_code='pressure' then 'pressure'
        when v_definition.dimension_code='ratio' then 'ratio'
        when v_definition.dimension_code='temperature' then 'temperature'
        when v_definition.dimension_code='sound_level' then 'sound_level'
        when v_definition.dimension_code='illuminance' then 'illuminance'
        else 'derived_metric'
      end;

    v_raw_fragment := nullif(v_fact->>'rawFragment','');
    v_normalized_fragment := nullif(v_fact->>'normalizedFragment','');
    v_match_method := coalesce(
      nullif(v_fact->>'semanticMatchMethodCode',''),
      'ai_candidate'
    );

    if v_match_method not in (
      'manual','exact_alias','exact_primary_name','rule_based',
      'ai_candidate','user_confirmed','import'
    ) then
      raise exception using
        errcode='22023',
        message='GSR1D_GLOBAL_FACT_MATCH_METHOD_INVALID';
    end if;

    v_source_type := coalesce(
      nullif(v_fact->>'sourceType',''),
      'ai_extraction'
    );

    if v_source_type not in (
      'user_text','user_edit','ai_extraction','rule_based',
      'tracker_import','derived_calculation','system_default'
    ) then
      raise exception using
        errcode='22023',
        message='GSR1D_GLOBAL_FACT_SOURCE_TYPE_INVALID';
    end if;

    v_confidence := coalesce(
      nullif(v_fact->>'confidence','')::numeric,
      case
        when v_match_method in ('exact_alias','exact_primary_name','user_confirmed') then 1
        else 0.8
      end
    );

    if v_confidence < 0 or v_confidence > 1 then
      raise exception using
        errcode='22023',
        message='GSR1D_GLOBAL_FACT_CONFIDENCE_INVALID';
    end if;

    v_precision_policy := nullif(v_fact->>'precisionPolicyCode','');

    v_origin_code := coalesce(
      nullif(v_fact->>'valueOriginCode',''),
      'user_explicit'
    );
    v_reliability_code := coalesce(
      nullif(v_fact->>'sourceReliabilityCode',''),
      'user_reported'
    );

    -- During this pilot, AI is allowed to EXTRACT explicit user values but not
    -- silently invent measured values.
    if v_origin_code in ('ai_estimate','typical_reference','system_default') then
      raise exception using
        errcode='23514',
        message='GSR1D_GLOBAL_FACT_AI_INVENTED_VALUE_BLOCKED';
    end if;

    v_period_start := coalesce(
      nullif(v_fact->>'periodStart','')::timestamptz,
      v_activity.started_at
    );
    v_period_end := coalesce(
      nullif(v_fact->>'periodEnd','')::timestamptz,
      v_activity.ended_at,
      v_period_start
    );

    insert into public.activity_event_measures (
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
    values (
      v_activity.id,
      v_activity.user_id,
      v_activity.performed_by_actor_id,
      v_activity.acting_as_actor_id,
      v_activity.acting_for_actor_id,
      v_measure_type,
      v_value_numeric,
      v_value_text,
      v_value_boolean,
      v_unit,
      v_source_type,
      v_confidence,
      v_source_type='derived_calculation',
      v_raw_fragment,
      v_normalized_fragment,
      jsonb_build_object(
        'contract','GSR1D_GLOBAL_OBSERVATION_RUNTIME_BRIDGE_V1',
        'requestHash',btrim(p_request_hash),
        'canonicalKey',v_value_object.canonical_key,
        'parameterCode',v_definition.parameter_code
      ),
      v_definition.id,
      v_precision_policy
    )
    returning id into v_measure_id;

    insert into public.activity_measure_provenance (
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
    values (
      v_measure_id,
      p_owner_user_id,
      p_owner_actor_id,
      v_origin_code,
      v_reliability_code,
      nullif(v_fact->>'sourceReferenceTypeCode',''),
      nullif(v_fact->>'sourceReference',''),
      coalesce(v_fact->'sourceSnapshotJson','{}'::jsonb),
      coalesce(v_fact->'identifiedEntityJson','{}'::jsonb),
      nullif(v_fact->>'assumptionText','')
    );

    insert into public.activity_object_facts (
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
    values (
      v_activity.id,
      v_measure_id,
      v_activity.user_id,
      v_activity.performed_by_actor_id,
      v_activity.acting_as_actor_id,
      v_activity.acting_for_actor_id,
      v_value_object.id,
      left(
        trim(both '_' from regexp_replace(
          lower(v_value_object.canonical_key),
          '[^a-z0-9_]+',
          '_',
          'g'
        )),
        80
      ),
      v_value_object.title,
      v_measure_type,
      v_value_numeric,
      v_value_text,
      v_value_boolean,
      v_unit,
      v_period_start,
      v_period_end,
      coalesce(nullif(v_fact->>'factStatus',''),'proposed'),
      v_confidence,
      v_source_type,
      coalesce((v_fact->>'isChronologicalPrimary')::boolean,false),
      true,
      coalesce((v_fact->>'isUserConfirmed')::boolean,false),
      jsonb_build_object(
        'contract','GSR1D_GLOBAL_OBSERVATION_RUNTIME_BRIDGE_V1',
        'requestHash',btrim(p_request_hash),
        'globalCanonicalKey',v_value_object.canonical_key,
        'systemParameterCode',v_definition.parameter_code
      ),
      v_confidence,
      v_match_method,
      v_definition.id,
      v_assignment.id
    )
    returning id into v_fact_id;

    insert into public.activity_value_object_links (
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
    values (
      v_activity.id,
      v_value_object.id,
      v_activity.acting_as_actor_id,
      v_activity.user_id,
      'semantic_exposure',
      null,
      v_confidence,
      jsonb_build_object(
        'rawFragment',v_raw_fragment,
        'parameterCode',v_definition.parameter_code
      ),
      jsonb_build_object(
        'contract','GSR1D_GLOBAL_OBSERVATION_RUNTIME_BRIDGE_V1'
      ),
      'active',
      case
        when v_match_method in ('ai_candidate','exact_alias','exact_primary_name')
          then 'ai_suggested'
        when v_match_method='import' then 'import'
        else 'manual'
      end,
      v_activity.acting_as_actor_id,
      v_confidence,
      v_match_method
    )
    on conflict(activity_event_id,value_object_id,link_type)
    do update
    set
      confidence=greatest(
        coalesce(public.activity_value_object_links.confidence,0),
        excluded.confidence
      ),
      semantic_match_confidence=greatest(
        coalesce(public.activity_value_object_links.semantic_match_confidence,0),
        excluded.semantic_match_confidence
      ),
      updated_at=clock_timestamp()
    returning id into v_link_id;

    v_rows_written := v_rows_written + 1;

    v_result_rows := v_result_rows || jsonb_build_array(
      jsonb_build_object(
        'canonicalKey',v_value_object.canonical_key,
        'valueObjectId',v_value_object.id,
        'parameterCode',v_definition.parameter_code,
        'parameterDefinitionId',v_definition.id,
        'parameterAssignmentId',v_assignment.id,
        'measureId',v_measure_id,
        'factId',v_fact_id,
        'semanticExposureLinkId',v_link_id
      )
    );
  end loop;

  v_result := jsonb_build_object(
    'ok',true,
    'contractVersion','GSR1D_GLOBAL_OBSERVATION_RUNTIME_BRIDGE_V1',
    'writeStatus','written',
    'transactional',true,
    'dbWriteExecuted',true,
    'rowsActuallyWritten',v_rows_written,
    'activityEventId',v_activity.id,
    'requestHash',btrim(p_request_hash),
    'rows',v_result_rows
  );

  insert into public.global_observation_fact_write_operations_gsr1 (
    owner_user_id,
    owner_actor_id,
    activity_event_id,
    idempotency_key,
    request_hash,
    result_json
  )
  values (
    p_owner_user_id,
    p_owner_actor_id,
    p_activity_event_id,
    btrim(p_idempotency_key),
    btrim(p_request_hash),
    v_result
  );

  return v_result;
end;
$function$;

revoke all
on function public.attach_global_observation_facts_gsr1_v1(
  uuid,uuid,uuid,text,text,jsonb
)
from public,anon,authenticated;

grant execute
on function public.attach_global_observation_facts_gsr1_v1(
  uuid,uuid,uuid,text,text,jsonb
)
to service_role;

-- ===========================================================================
-- 7. Hard OpenAI pilot budget reservation ledger
-- ===========================================================================

create table public.ai_pilot_budget_reservations_gsr1 (
  id uuid primary key default gen_random_uuid(),

  operation_id uuid not null,

  app_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  call_index integer not null,

  tier_code text not null
    references public.ai_model_tiers(tier_code)
    on delete restrict,

  model_name text not null,

  price_snapshot_id uuid not null
    references public.ai_model_price_snapshots(id)
    on delete restrict,

  input_tokens integer not null,
  cached_input_tokens integer not null default 0,
  max_output_tokens integer not null,

  estimated_max_cost_usd numeric(14,8) not null,

  hard_cap_usd numeric(14,8) not null default 0.10,
  max_calls integer not null default 3,
  timeout_ms integer not null default 60000,

  created_at timestamptz not null default clock_timestamp(),

  constraint ai_pilot_budget_reservations_gsr1_operation_call_unique
    unique(operation_id,call_index),

  constraint ai_pilot_budget_reservations_gsr1_tokens_check
    check(
      input_tokens >= 0
      and cached_input_tokens >= 0
      and cached_input_tokens <= input_tokens
      and max_output_tokens > 0
    ),

  constraint ai_pilot_budget_reservations_gsr1_cost_check
    check(
      estimated_max_cost_usd >= 0
      and hard_cap_usd = 0.10
      and max_calls = 3
      and timeout_ms = 60000
    )
);

create index ai_pilot_budget_reservations_gsr1_operation_idx
  on public.ai_pilot_budget_reservations_gsr1(
    operation_id,
    created_at
  );

alter table public.ai_pilot_budget_reservations_gsr1
  enable row level security;

revoke all
on table public.ai_pilot_budget_reservations_gsr1
from public,anon,authenticated,service_role;

grant select,insert
on table public.ai_pilot_budget_reservations_gsr1
to service_role;

create policy ai_pilot_budget_reservations_gsr1_no_browser
on public.ai_pilot_budget_reservations_gsr1
for all
to anon,authenticated
using(false)
with check(false);

-- Link future usage rows to the exact operation-level reservation.
alter table public.ai_usage_events
  add column pilot_operation_id uuid,
  add column pilot_budget_reservation_id uuid
    references public.ai_pilot_budget_reservations_gsr1(id)
    on delete set null,
  add column estimated_provider_cost_usd numeric(14,8),
  add column actual_provider_cost_usd numeric(14,8),
  add column max_output_tokens integer;

alter table public.ai_usage_events
  add constraint ai_usage_events_pilot_provider_costs_gsr1_check
  check(
    (estimated_provider_cost_usd is null or estimated_provider_cost_usd >= 0)
    and
    (actual_provider_cost_usd is null or actual_provider_cost_usd >= 0)
    and
    (max_output_tokens is null or max_output_tokens > 0)
  );

create index ai_usage_events_pilot_operation_gsr1_idx
  on public.ai_usage_events(pilot_operation_id,created_at desc);

-- ===========================================================================
-- 8. Server-only hard preflight: one call within one <= USD 0.10 operation
-- ===========================================================================

create or replace function public.preflight_ai_pilot_call_budget_v1(
  p_app_user_id uuid,
  p_operation_id uuid,
  p_tier_code text,
  p_model_name text,
  p_input_tokens integer,
  p_cached_input_tokens integer,
  p_max_output_tokens integer
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_snapshot public.ai_model_price_snapshots%rowtype;

  v_hard_cap_usd constant numeric := 0.10;
  v_max_calls constant integer := 3;
  v_timeout_ms constant integer := 60000;
  v_price_max_age interval := interval '7 days';

  v_call_count integer := 0;
  v_call_index integer := 1;
  v_first_call_at timestamptz;

  v_existing_reserved_usd numeric := 0;
  v_uncached_input_tokens integer;
  v_cached_price numeric;
  v_new_max_cost_usd numeric;
  v_new_operation_max_usd numeric;

  v_reservation_id uuid;
begin
  if p_app_user_id is null
     or p_operation_id is null
     or nullif(btrim(p_tier_code),'') is null
     or nullif(btrim(p_model_name),'') is null then
    raise exception using
      errcode='22023',
      message='GSR1D_AI_BUDGET_REQUIRED_ARGUMENT_MISSING';
  end if;

  if p_input_tokens is null
     or p_cached_input_tokens is null
     or p_max_output_tokens is null
     or p_input_tokens < 0
     or p_cached_input_tokens < 0
     or p_cached_input_tokens > p_input_tokens
     or p_max_output_tokens < 1 then
    raise exception using
      errcode='22023',
      message='GSR1D_AI_BUDGET_TOKEN_ENVELOPE_INVALID';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_operation_id::text,
      0
    )
  );

  if exists (
    select 1
    from public.ai_pilot_budget_reservations_gsr1 reservation
    where reservation.operation_id=p_operation_id
      and reservation.app_user_id is distinct from p_app_user_id
  ) then
    raise exception using
      errcode='42501',
      message='GSR1D_AI_BUDGET_OPERATION_USER_MISMATCH';
  end if;

  select
    count(*)::integer,
    min(created_at),
    coalesce(sum(estimated_max_cost_usd),0)
  into
    v_call_count,
    v_first_call_at,
    v_existing_reserved_usd
  from public.ai_pilot_budget_reservations_gsr1
  where operation_id=p_operation_id
    and app_user_id=p_app_user_id;

  if v_call_count >= v_max_calls then
    return jsonb_build_object(
      'allowed',false,
      'reason','MAX_CALLS_REACHED',
      'operationId',p_operation_id,
      'hardCapUsd',v_hard_cap_usd,
      'maxCalls',v_max_calls,
      'callCount',v_call_count,
      'timeoutMs',v_timeout_ms,
      'requiresFreshExplicitConfirmation',false
    );
  end if;

  if v_first_call_at is not null
     and clock_timestamp() > v_first_call_at + make_interval(secs => v_timeout_ms / 1000) then
    return jsonb_build_object(
      'allowed',false,
      'reason','OPERATION_TIMEOUT',
      'operationId',p_operation_id,
      'hardCapUsd',v_hard_cap_usd,
      'maxCalls',v_max_calls,
      'callCount',v_call_count,
      'timeoutMs',v_timeout_ms,
      'requiresFreshExplicitConfirmation',false
    );
  end if;

  select *
  into v_snapshot
  from public.ai_model_price_snapshots snapshot
  where snapshot.provider='openai'
    and snapshot.tier_code=btrim(p_tier_code)
    and snapshot.model_name=btrim(p_model_name)
    and snapshot.pricing_currency='USD'
    and snapshot.is_active=true
    and snapshot.valid_from <= clock_timestamp()
    and (
      snapshot.valid_to is null
      or snapshot.valid_to > clock_timestamp()
    )
  order by snapshot.valid_from desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'allowed',false,
      'reason','PRICE_UNKNOWN',
      'operationId',p_operation_id,
      'modelName',btrim(p_model_name),
      'tierCode',btrim(p_tier_code),
      'hardCapUsd',v_hard_cap_usd,
      'requiresFreshExplicitConfirmation',false
    );
  end if;

  if v_snapshot.valid_from < clock_timestamp() - v_price_max_age then
    return jsonb_build_object(
      'allowed',false,
      'reason','PRICE_SNAPSHOT_STALE',
      'operationId',p_operation_id,
      'modelName',v_snapshot.model_name,
      'tierCode',v_snapshot.tier_code,
      'priceSnapshotId',v_snapshot.id,
      'priceValidFrom',v_snapshot.valid_from,
      'maxPriceAgeDays',7,
      'hardCapUsd',v_hard_cap_usd,
      'requiresFreshExplicitConfirmation',false
    );
  end if;

  v_cached_price := coalesce(
    v_snapshot.cached_input_cost_per_1m_tokens,
    v_snapshot.input_cost_per_1m_tokens
  );

  v_uncached_input_tokens := p_input_tokens - p_cached_input_tokens;

  v_new_max_cost_usd := round(
    (
      (
        v_uncached_input_tokens::numeric
        * v_snapshot.input_cost_per_1m_tokens
      )
      +
      (
        p_cached_input_tokens::numeric
        * v_cached_price
      )
      +
      (
        p_max_output_tokens::numeric
        * v_snapshot.output_cost_per_1m_tokens
      )
    ) / 1000000::numeric,
    8
  );

  v_new_operation_max_usd :=
    v_existing_reserved_usd + v_new_max_cost_usd;

  if v_new_operation_max_usd > v_hard_cap_usd then
    return jsonb_build_object(
      'allowed',false,
      'reason','HARD_COST_CAP_EXCEEDED',
      'operationId',p_operation_id,
      'modelName',v_snapshot.model_name,
      'tierCode',v_snapshot.tier_code,
      'priceSnapshotId',v_snapshot.id,
      'existingReservedUsd',v_existing_reserved_usd,
      'requestedCallMaxCostUsd',v_new_max_cost_usd,
      'operationMaxCostUsd',v_new_operation_max_usd,
      'hardCapUsd',v_hard_cap_usd,
      'overByUsd',v_new_operation_max_usd-v_hard_cap_usd,
      'requiresFreshExplicitConfirmation',true
    );
  end if;

  v_call_index := v_call_count + 1;

  insert into public.ai_pilot_budget_reservations_gsr1 (
    operation_id,
    app_user_id,
    call_index,
    tier_code,
    model_name,
    price_snapshot_id,
    input_tokens,
    cached_input_tokens,
    max_output_tokens,
    estimated_max_cost_usd
  )
  values (
    p_operation_id,
    p_app_user_id,
    v_call_index,
    v_snapshot.tier_code,
    v_snapshot.model_name,
    v_snapshot.id,
    p_input_tokens,
    p_cached_input_tokens,
    p_max_output_tokens,
    v_new_max_cost_usd
  )
  returning id into v_reservation_id;

  return jsonb_build_object(
    'allowed',true,
    'reason','WITHIN_HARD_CAP',
    'contractVersion','GSR1D_AI_PILOT_HARD_BUDGET_V1',
    'operationId',p_operation_id,
    'reservationId',v_reservation_id,
    'callIndex',v_call_index,
    'maxCalls',v_max_calls,
    'remainingCalls',v_max_calls-v_call_index,
    'timeoutMs',v_timeout_ms,
    'modelName',v_snapshot.model_name,
    'tierCode',v_snapshot.tier_code,
    'priceSnapshotId',v_snapshot.id,
    'inputTokens',p_input_tokens,
    'cachedInputTokens',p_cached_input_tokens,
    'maxOutputTokens',p_max_output_tokens,
    'requestedCallMaxCostUsd',v_new_max_cost_usd,
    'operationReservedMaxCostUsd',v_new_operation_max_usd,
    'hardCapUsd',v_hard_cap_usd,
    'remainingBudgetUsd',v_hard_cap_usd-v_new_operation_max_usd,
    'requiresFreshExplicitConfirmation',false
  );
end;
$function$;

revoke all
on function public.preflight_ai_pilot_call_budget_v1(
  uuid,uuid,text,text,integer,integer,integer
)
from public,anon,authenticated;

grant execute
on function public.preflight_ai_pilot_call_budget_v1(
  uuid,uuid,text,text,integer,integer,integer
)
to service_role;

-- ===========================================================================
-- 9. Acceptance gates
-- ===========================================================================

do $acceptance$
begin
  if to_regprocedure(
       'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)'
     ) is null
     or to_regprocedure(
       'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)'
     ) is null then
    raise exception using
      errcode='42883',
      message='GSR1D_REQUIRED_RPC_MISSING_AFTER_WRITE';
  end if;

  if has_function_privilege(
       'anon',
       'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)',
       'EXECUTE'
     ) then
    raise exception using
      errcode='42501',
      message='GSR1D_GLOBAL_FACT_RPC_PRIVILEGE_GUARD_FAILED';
  end if;

  if has_function_privilege(
       'anon',
       'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)',
       'EXECUTE'
     ) then
    raise exception using
      errcode='42501',
      message='GSR1D_AI_BUDGET_RPC_PRIVILEGE_GUARD_FAILED';
  end if;

  if exists (
    select 1
    from public.activity_object_facts fact
    join public.value_objects value_object
      on value_object.id=fact.value_object_id
    where value_object.scope_code='global'
  )
  or exists (
    select 1
    from public.activity_value_object_links link_row
    join public.value_objects value_object
      on value_object.id=link_row.value_object_id
    where value_object.scope_code='global'
  ) then
    raise exception using
      errcode='23514',
      message='GSR1D_ACCEPTANCE_UNEXPECTED_GLOBAL_RUNTIME_WRITE';
  end if;

  if (
    select count(*)
    from public.value_objects
    where scope_code='global'
      and canonical_key is not null
  ) <> 150
     or (
       select count(*)
       from public.value_object_parameter_assignments a
       join public.value_objects v on v.id=a.value_object_id
       where a.assignment_scope_code='system'
         and a.status='active'
         and v.scope_code='global'
     ) <> 52 then
    raise exception using
      errcode='23514',
      message='GSR1D_ACCEPTANCE_GLOBAL_BASELINE_CHANGED';
  end if;
end;
$acceptance$;

commit;

-- ===========================================================================
-- 10. One compact result row
-- ===========================================================================

select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_GSR1D_GLOBAL_RUNTIME_BRIDGE_AI_BUDGET_V1',

    'global_objects',
      (
        select count(*)
        from public.value_objects
        where scope_code='global'
          and canonical_key is not null
      ),

    'global_leaves',
      (
        select count(*)
        from public.value_objects
        where scope_code='global'
          and ontology_node_role_code='leaf'
      ),

    'system_parameter_assignments',
      (
        select count(*)
        from public.value_object_parameter_assignments a
        join public.value_objects v on v.id=a.value_object_id
        where a.assignment_scope_code='system'
          and a.status='active'
          and v.scope_code='global'
      ),

    'global_fact_writer_rpc',
      to_regprocedure(
        'public.attach_global_observation_facts_gsr1_v1(uuid,uuid,uuid,text,text,jsonb)'
      ) is not null,

    'ai_budget_preflight_rpc',
      to_regprocedure(
        'public.preflight_ai_pilot_call_budget_v1(uuid,uuid,text,text,integer,integer,integer)'
      ) is not null,

    'hard_cap_usd',0.10,
    'max_openai_calls_per_operation',3,
    'operation_timeout_ms',60000,
    'max_price_snapshot_age_days',7,

    'active_price_snapshots',
      (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'tierCode',tier_code,
              'modelName',model_name,
              'validFrom',valid_from,
              'ageDays',
                floor(
                  extract(epoch from (clock_timestamp()-valid_from))
                  / 86400
                ),
              'pilotPriceFresh',
                valid_from >= clock_timestamp()-interval '7 days'
            )
            order by tier_code
          ),
          '[]'::jsonb
        )
        from public.ai_model_price_snapshots
        where provider='openai'
          and is_active=true
          and (valid_to is null or valid_to > clock_timestamp())
      ),

    'existing_global_runtime_facts',
      (
        select count(*)
        from public.activity_object_facts fact
        join public.value_objects value_object
          on value_object.id=fact.value_object_id
        where value_object.scope_code='global'
      ),

    'existing_global_semantic_links',
      (
        select count(*)
        from public.activity_value_object_links link_row
        join public.value_objects value_object
          on value_object.id=link_row.value_object_id
        where value_object.scope_code='global'
      )
  )
) as gsr1d_result;
