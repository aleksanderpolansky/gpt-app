-- ARCTOR_FACT_CARD_V1_DB_FOUNDATION
-- Reconciliation migration for the fact-card foundation applied and verified on production.
-- It is safe on a fresh pre-V1 schema and on the already-applied production schema.

begin;

do $preflight$
declare
  v_target_columns integer;
  v_table_exists boolean;
begin
  if to_regclass('public.activity_object_facts') is null
     or to_regclass('public.activity_events') is null
     or to_regclass('public.activity_event_measures') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null then
    raise exception using
      errcode='42P01',
      message='ARCTOR_FACT_CARD_V1_REQUIRED_FOUNDATION_MISSING';
  end if;

  select count(*)
  into v_target_columns
  from information_schema.columns
  where table_schema='public'
    and table_name='activity_object_facts'
    and column_name in (
      'fact_role_code',
      'effective_at',
      'valid_from',
      'valid_to',
      'snapshot_window_code',
      'calculation_rule_code',
      'calculation_rule_version',
      'previous_snapshot_fact_id'
    );

  v_table_exists := to_regclass('public.activity_fact_derivation_inputs_v1') is not null;

  if (v_target_columns > 0 or v_table_exists)
     and not (v_target_columns = 8 and v_table_exists) then
    raise exception using
      errcode='55000',
      message='ARCTOR_FACT_CARD_V1_PARTIAL_INSTALLATION_DETECTED';
  end if;

  if to_regprocedure('public.enforce_activity_fact_actor_alignment_v2()') is null then
    raise exception using
      errcode='42883',
      message='ARCTOR_FACT_CARD_V1_FACT_GUARD_MISSING';
  end if;
end
$preflight$;

alter table public.activity_object_facts
  alter column activity_event_id drop not null;

alter table public.activity_object_facts
  add column if not exists fact_role_code text not null default 'source',
  add column if not exists effective_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_to timestamptz,
  add column if not exists snapshot_window_code text,
  add column if not exists calculation_rule_code text,
  add column if not exists calculation_rule_version text,
  add column if not exists previous_snapshot_fact_id uuid;

update public.activity_object_facts
set effective_at = coalesce(period_end, period_start, created_at)
where effective_at is null;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.activity_object_facts'::regclass
      and conname='activity_object_facts_previous_snapshot_fact_id_fkey'
  ) then
    alter table public.activity_object_facts
      add constraint activity_object_facts_previous_snapshot_fact_id_fkey
      foreign key(previous_snapshot_fact_id)
      references public.activity_object_facts(id)
      on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conrelid='public.activity_object_facts'::regclass and conname='activity_object_facts_role_v1_check') then
    alter table public.activity_object_facts add constraint activity_object_facts_role_v1_check check (fact_role_code in ('source','result','snapshot'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.activity_object_facts'::regclass and conname='activity_object_facts_snapshot_window_v1_check') then
    alter table public.activity_object_facts add constraint activity_object_facts_snapshot_window_v1_check check (snapshot_window_code is null or snapshot_window_code in ('point_in_time','daily','weekly','event_driven','custom'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.activity_object_facts'::regclass and conname='activity_object_facts_snapshot_shape_v1_check') then
    alter table public.activity_object_facts add constraint activity_object_facts_snapshot_shape_v1_check check (fact_role_code <> 'snapshot' or (effective_at is not null and snapshot_window_code is not null));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.activity_object_facts'::regclass and conname='activity_object_facts_result_shape_v1_check') then
    alter table public.activity_object_facts add constraint activity_object_facts_result_shape_v1_check check (fact_role_code <> 'result' or (effective_at is not null and nullif(btrim(calculation_rule_code),'') is not null and nullif(btrim(calculation_rule_version),'') is not null));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.activity_object_facts'::regclass and conname='activity_object_facts_calculated_snapshot_shape_v1_check') then
    alter table public.activity_object_facts add constraint activity_object_facts_calculated_snapshot_shape_v1_check check (not (fact_role_code='snapshot' and source_type='derived_calculation') or (nullif(btrim(calculation_rule_code),'') is not null and nullif(btrim(calculation_rule_version),'') is not null));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.activity_object_facts'::regclass and conname='activity_object_facts_validity_v1_check') then
    alter table public.activity_object_facts add constraint activity_object_facts_validity_v1_check check (valid_from is null or valid_to is null or valid_to > valid_from);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.activity_object_facts'::regclass and conname='activity_object_facts_previous_snapshot_not_self_v1_check') then
    alter table public.activity_object_facts add constraint activity_object_facts_previous_snapshot_not_self_v1_check check (previous_snapshot_fact_id is null or previous_snapshot_fact_id <> id);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.activity_object_facts'::regclass and conname='activity_object_facts_rule_code_v1_check') then
    alter table public.activity_object_facts add constraint activity_object_facts_rule_code_v1_check check (calculation_rule_code is null or calculation_rule_code ~ '^[a-z][a-z0-9_.-]{1,159}$');
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.activity_object_facts'::regclass and conname='activity_object_facts_rule_version_v1_check') then
    alter table public.activity_object_facts add constraint activity_object_facts_rule_version_v1_check check (calculation_rule_version is null or char_length(btrim(calculation_rule_version)) between 1 and 80);
  end if;
end
$constraints$;

create index if not exists activity_object_facts_role_created_v1_idx
  on public.activity_object_facts(user_id,acting_as_actor_id,fact_role_code,created_at desc);
create index if not exists activity_object_facts_effective_v1_idx
  on public.activity_object_facts(user_id,acting_as_actor_id,effective_at desc)
  where effective_at is not null;
create index if not exists activity_object_facts_previous_snapshot_v1_idx
  on public.activity_object_facts(previous_snapshot_fact_id)
  where previous_snapshot_fact_id is not null;

comment on column public.activity_object_facts.fact_role_code is 'ARCTor fact role: source = recorded/input value; result = value calculated from other facts; snapshot = fixed state/status-quo value for a point or period.';
comment on column public.activity_object_facts.effective_at is 'Moment at which the fact value represents reality.';
comment on column public.activity_object_facts.valid_from is 'Optional beginning of the period during which this fact/snapshot/coefficient is considered applicable.';
comment on column public.activity_object_facts.valid_to is 'Optional end of the applicability period.';
comment on column public.activity_object_facts.snapshot_window_code is 'Snapshot cadence/basis: point_in_time, daily, weekly, event_driven, custom.';
comment on column public.activity_object_facts.calculation_rule_code is 'Stable identifier of the registered calculation rule that produced a resulting or calculated snapshot fact.';
comment on column public.activity_object_facts.calculation_rule_version is 'Version of the registered calculation rule used for reproducibility.';
comment on column public.activity_object_facts.previous_snapshot_fact_id is 'Optional previous state snapshot used as the prior status quo for this snapshot/result.';

create table if not exists public.activity_fact_derivation_inputs_v1 (
  id uuid primary key default gen_random_uuid(),
  result_fact_id uuid not null references public.activity_object_facts(id) on delete cascade,
  input_fact_id uuid not null references public.activity_object_facts(id) on delete restrict,
  input_role_code text not null default 'input',
  input_ordinal integer,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  constraint activity_fact_derivation_inputs_v1_not_self_check check (result_fact_id <> input_fact_id),
  constraint activity_fact_derivation_inputs_v1_role_check check (input_role_code ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint activity_fact_derivation_inputs_v1_ordinal_check check (input_ordinal is null or input_ordinal >= 0),
  constraint activity_fact_derivation_inputs_v1_metadata_check check (jsonb_typeof(metadata_json)='object'),
  constraint activity_fact_derivation_inputs_v1_unique unique(result_fact_id,input_fact_id,input_role_code)
);

create index if not exists activity_fact_derivation_inputs_v1_result_idx
  on public.activity_fact_derivation_inputs_v1(result_fact_id,input_ordinal);
create index if not exists activity_fact_derivation_inputs_v1_input_idx
  on public.activity_fact_derivation_inputs_v1(input_fact_id);

alter table public.activity_fact_derivation_inputs_v1 enable row level security;
revoke all on table public.activity_fact_derivation_inputs_v1 from public,anon,authenticated,service_role;
grant select,insert,update,delete on table public.activity_fact_derivation_inputs_v1 to service_role;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='activity_fact_derivation_inputs_v1'
      and policyname='activity_fact_derivation_inputs_v1_service'
  ) then
    create policy activity_fact_derivation_inputs_v1_service
      on public.activity_fact_derivation_inputs_v1
      for all to service_role
      using(true)
      with check(true);
  end if;
end
$policy$;

comment on table public.activity_fact_derivation_inputs_v1 is 'Lineage edges from a resulting/snapshot fact to the source/result/snapshot facts used as calculation inputs. Values remain stored only in activity_object_facts.';

create or replace function public.enforce_activity_fact_derivation_input_v1()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_result public.activity_object_facts%rowtype;
  v_input public.activity_object_facts%rowtype;
begin
  select * into v_result from public.activity_object_facts where id=new.result_fact_id;
  if not found then raise exception using errcode='23503',message='FACT_CARD_V1_DERIVATION_RESULT_FACT_NOT_FOUND'; end if;

  select * into v_input from public.activity_object_facts where id=new.input_fact_id;
  if not found then raise exception using errcode='23503',message='FACT_CARD_V1_DERIVATION_INPUT_FACT_NOT_FOUND'; end if;

  if v_result.fact_role_code not in ('result','snapshot') then
    raise exception using errcode='23514',message='FACT_CARD_V1_DERIVATION_TARGET_MUST_BE_RESULT_OR_SNAPSHOT';
  end if;

  if v_result.user_id is distinct from v_input.user_id
     or v_result.acting_as_actor_id is distinct from v_input.acting_as_actor_id then
    raise exception using errcode='42501',message='FACT_CARD_V1_DERIVATION_OWNER_MISMATCH';
  end if;

  return new;
end;
$function$;

drop trigger if exists activity_fact_derivation_inputs_v1_guard_trg on public.activity_fact_derivation_inputs_v1;
create trigger activity_fact_derivation_inputs_v1_guard_trg
before insert or update of result_fact_id,input_fact_id
on public.activity_fact_derivation_inputs_v1
for each row execute function public.enforce_activity_fact_derivation_input_v1();

create or replace function public.enforce_activity_fact_actor_alignment_v2()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_measure public.activity_event_measures%rowtype;
  v_event public.activity_events%rowtype;
  v_value_object public.value_objects%rowtype;
  v_assignment public.value_object_parameter_assignments%rowtype;
  v_is_review_fact boolean;
begin
  if new.measure_id is not null then
    select * into v_measure from public.activity_event_measures measure where measure.id=new.measure_id;
    if not found then raise exception using errcode='23503',message='P4A_FACT_MEASURE_NOT_FOUND'; end if;

    if new.activity_event_id is distinct from v_measure.activity_event_id
       or new.user_id is distinct from v_measure.user_id
       or new.performed_by_actor_id is distinct from v_measure.performed_by_actor_id
       or new.acting_as_actor_id is distinct from v_measure.acting_as_actor_id
       or new.acting_for_actor_id is distinct from v_measure.acting_for_actor_id then
      raise exception using errcode='42501',message='P4A_FACT_MEASURE_ACTOR_MISMATCH';
    end if;

    if new.parameter_definition_id is distinct from v_measure.parameter_definition_id then
      raise exception using errcode='23514',message='GSR1D_FACT_MEASURE_PARAMETER_DEFINITION_MISMATCH';
    end if;
  else
    if new.fact_role_code not in ('result','snapshot') then
      raise exception using errcode='23514',message='FACT_CARD_V1_NON_MEASURE_FACT_MUST_BE_RESULT_OR_SNAPSHOT';
    end if;

    if new.activity_event_id is not null then
      select * into v_event from public.activity_events where id=new.activity_event_id;
      if not found then raise exception using errcode='23503',message='FACT_CARD_V1_ACTIVITY_EVENT_NOT_FOUND'; end if;

      if new.user_id is distinct from v_event.user_id
         or new.performed_by_actor_id is distinct from v_event.performed_by_actor_id
         or new.acting_as_actor_id is distinct from v_event.acting_as_actor_id
         or new.acting_for_actor_id is distinct from v_event.acting_for_actor_id then
        raise exception using errcode='42501',message='FACT_CARD_V1_ACTIVITY_EVENT_ACTOR_MISMATCH';
      end if;
    end if;
  end if;

  v_is_review_fact :=
    coalesce(new.metadata->>'contract','')='ARCTOR_AI_A3_1_REVIEW_FACT_COMMIT_V1'
    and new.is_user_confirmed is true
    and new.semantic_match_method_code='user_confirmed';

  if new.value_object_id is not null then
    select * into v_value_object from public.value_objects where id=new.value_object_id;
    if not found then raise exception using errcode='23503',message='GSR1D_FACT_VALUE_OBJECT_NOT_FOUND'; end if;

    if v_value_object.ontology_node_role_code is distinct from 'leaf' then
      raise exception using errcode='23514',message='P4A_FACT_REQUIRES_ONTOLOGY_LEAF';
    end if;

    if v_value_object.scope_code='global' then
      if v_value_object.owner_user_id is not null
         or v_value_object.owner_actor_id is not null
         or v_value_object.origin_type_code is distinct from 'system_model'
         or v_value_object.status is distinct from 'active' then
        raise exception using errcode='23514',message='GSR1D_GLOBAL_FACT_REQUIRES_ACTIVE_OWNERLESS_SYSTEM_LEAF';
      end if;

      if v_is_review_fact then
        if new.parameter_definition_id is not null or new.parameter_assignment_id is not null then
          raise exception using errcode='23514',message='AI_A3_1_REVIEW_FACT_MUST_NOT_USE_LEAF_PARAMETER_ASSIGNMENT';
        end if;
      else
        if new.parameter_definition_id is null or new.parameter_assignment_id is null then
          raise exception using errcode='23514',message='GSR1D_GLOBAL_FACT_REQUIRES_SYSTEM_PARAMETER_CONTRACT';
        end if;

        select * into v_assignment from public.value_object_parameter_assignments assignment where assignment.id=new.parameter_assignment_id;
        if not found
           or v_assignment.assignment_scope_code is distinct from 'system'
           or v_assignment.status is distinct from 'active'
           or v_assignment.value_object_id is distinct from new.value_object_id
           or v_assignment.parameter_definition_id is distinct from new.parameter_definition_id
           or v_assignment.owner_user_id is not null
           or v_assignment.owner_actor_id is not null then
          raise exception using errcode='23514',message='GSR1D_GLOBAL_FACT_SYSTEM_PARAMETER_ASSIGNMENT_MISMATCH';
        end if;
      end if;

    elsif v_value_object.scope_code='actor' or v_value_object.scope_code is null then
      if v_value_object.owner_user_id is distinct from new.user_id
         or v_value_object.owner_actor_id is distinct from new.acting_as_actor_id then
        raise exception using errcode='42501',message='P4A_FACT_VALUE_OBJECT_ACTOR_MISMATCH';
      end if;

      if new.parameter_assignment_id is not null
         and not exists (
           select 1 from public.value_object_parameter_assignments assignment
           where assignment.id=new.parameter_assignment_id
             and assignment.value_object_id=new.value_object_id
             and assignment.owner_user_id=new.user_id
             and assignment.owner_actor_id=new.acting_as_actor_id
         ) then
        raise exception using errcode='23514',message='P4A_FACT_PARAMETER_ASSIGNMENT_TARGET_MISMATCH';
      end if;
    else
      raise exception using errcode='23514',message='GSR1D_FACT_VALUE_OBJECT_SCOPE_UNSUPPORTED';
    end if;
  end if;

  return new;
end;
$function$;

comment on function public.enforce_activity_fact_actor_alignment_v2() is 'Existing fact ownership/leaf/parameter guard extended by ARCTOR_FACT_CARD_V1 to permit measure-less result/snapshot facts while preserving existing protections. Marker: FACT_CARD_V1_NON_MEASURE_RESULT_OR_SNAPSHOT_ALLOWED.';

commit;
