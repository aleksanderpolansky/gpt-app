-- ARCTor.app
-- Value Object authoring + analytics foundation V1A
-- MANUAL SUPABASE APPLY
--
-- Additive / fail-closed migration.
-- Does NOT update or delete value_objects, products, services, offers,
-- certificates, activities, measures, facts or historical coefficient rows.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $preflight$
declare
  v_old_active_rules bigint := 0;
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null
     or to_regclass('public.actor_public_profiles') is null
     or to_regclass('public.activity_object_facts') is null
     or to_regclass('public.value_object_kind_registry') is null
     or to_regclass('public.activity_leaf_fact_coefficient_rules_a31') is null then
    raise exception using
      errcode='42P01',
      message='VO_ANALYTICS_V1A_REQUIRED_FOUNDATION_MISSING';
  end if;

  if to_regprocedure(
    'public.create_value_object_ontology_v1(uuid,uuid,uuid,jsonb,text,text)'
  ) is null then
    raise exception using
      errcode='42883',
      message='VO_ANALYTICS_V1A_ONTOLOGY_CREATE_RPC_MISSING';
  end if;

  if not exists (
    select 1
    from public.value_object_kind_registry k
    where k.facet_code='STATE'
      and k.object_kind_code='symptom_state'
      and k.status='active'
      and k.allowed_node_roles_json ? 'leaf'
  ) then
    raise exception using
      errcode='23514',
      message='VO_ANALYTICS_V1A_SYMPTOM_STATE_LEAF_KIND_MISSING';
  end if;

  select count(*)
  into v_old_active_rules
  from public.activity_leaf_fact_coefficient_rules_a31
  where status='active';

  if v_old_active_rules <> 0 then
    raise exception using
      errcode='23514',
      message='VO_ANALYTICS_V1A_OLD_FACT_MUTATING_COEFFICIENT_RULES_ACTIVE',
      detail='Active old coefficient rules: '||v_old_active_rules||
        ||'. They must be reviewed before the analytics-only coefficient lock can be installed.';
  end if;

  if to_regclass('public.value_object_analytics_profiles_v1') is not null
     or to_regclass('public.value_object_analytics_effect_rules_v1') is not null
     or to_regprocedure('public.block_active_fact_mutating_coefficient_rule_v1a()') is not null then
    raise exception using
      errcode='42P07',
      message='VO_ANALYTICS_V1A_ALREADY_INSTALLED_OR_PARTIAL';
  end if;
end
$preflight$;

create table public.value_object_analytics_profiles_v1 (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null references public.actors(id) on delete cascade,
  target_value_object_id uuid not null references public.value_objects(id) on delete cascade,

  accumulated_unit_code text not null default 'unit',
  calculation_mode text not null default 'effect_rules',
  source_parameter_code text not null default 'process_count',
  baseline_value numeric not null default 0,
  target_value numeric,
  critical_value numeric,
  desired_direction text not null default 'increase',
  refresh_period_days integer,
  inactivity_delta numeric not null default 0,
  trend_window_days integer not null default 30,
  tracking_started_at timestamptz not null default clock_timestamp(),
  status text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint vo_analytics_profiles_v1_owner_target_uq
    unique(owner_user_id,owner_actor_id,target_value_object_id),
  constraint vo_analytics_profiles_v1_unit_check
    check (char_length(btrim(accumulated_unit_code)) between 1 and 64),
  constraint vo_analytics_profiles_v1_mode_check
    check (calculation_mode in ('latest_value','sum_facts','baseline_plus_facts','effect_rules')),
  constraint vo_analytics_profiles_v1_parameter_check
    check (source_parameter_code ~ '^[a-z][a-z0-9_]{0,79}$'),
  constraint vo_analytics_profiles_v1_direction_check
    check (desired_direction in ('increase','decrease','maintain')),
  constraint vo_analytics_profiles_v1_refresh_check
    check (refresh_period_days is null or refresh_period_days between 1 and 3650),
  constraint vo_analytics_profiles_v1_trend_check
    check (trend_window_days between 1 and 3650),
  constraint vo_analytics_profiles_v1_status_check
    check (status in ('active','paused')),
  constraint vo_analytics_profiles_v1_metadata_check
    check (jsonb_typeof(metadata_json)='object')
);

create index vo_analytics_profiles_v1_actor_idx
  on public.value_object_analytics_profiles_v1(
    owner_user_id, owner_actor_id, updated_at desc
  );

create index vo_analytics_profiles_v1_target_idx
  on public.value_object_analytics_profiles_v1(
    target_value_object_id, status
  );

alter table public.value_object_analytics_profiles_v1 enable row level security;
revoke all on table public.value_object_analytics_profiles_v1
  from public, anon, authenticated, service_role;
grant select,insert,update,delete on table public.value_object_analytics_profiles_v1
  to service_role;
create policy vo_analytics_profiles_v1_service
  on public.value_object_analytics_profiles_v1
  for all to service_role using(true) with check(true);

create table public.value_object_analytics_effect_rules_v1 (
  id uuid primary key default gen_random_uuid(),
  client_rule_id uuid not null,
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null references public.actors(id) on delete cascade,
  target_value_object_id uuid not null references public.value_objects(id) on delete cascade,
  source_value_object_id uuid not null references public.value_objects(id) on delete restrict,
  source_parameter_code text not null,
  coefficient numeric not null,
  status text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  retired_at timestamptz,

  constraint vo_analytics_effect_rules_v1_client_uq
    unique(owner_user_id,owner_actor_id,client_rule_id),
  constraint vo_analytics_effect_rules_v1_parameter_check
    check (source_parameter_code ~ '^[a-z][a-z0-9_]{0,79}$'),
  constraint vo_analytics_effect_rules_v1_coefficient_check
    check (coefficient between -1000000000 and 1000000000),
  constraint vo_analytics_effect_rules_v1_status_check
    check (status in ('active','retired')),
  constraint vo_analytics_effect_rules_v1_metadata_check
    check (jsonb_typeof(metadata_json)='object')
);

create index vo_analytics_effect_rules_v1_target_idx
  on public.value_object_analytics_effect_rules_v1(
    owner_user_id, owner_actor_id, target_value_object_id, status, created_at
  );

create index vo_analytics_effect_rules_v1_source_idx
  on public.value_object_analytics_effect_rules_v1(
    source_value_object_id, source_parameter_code, status
  );

alter table public.value_object_analytics_effect_rules_v1 enable row level security;
revoke all on table public.value_object_analytics_effect_rules_v1
  from public, anon, authenticated, service_role;
grant select,insert,update,delete on table public.value_object_analytics_effect_rules_v1
  to service_role;
create policy vo_analytics_effect_rules_v1_service
  on public.value_object_analytics_effect_rules_v1
  for all to service_role using(true) with check(true);

comment on table public.value_object_analytics_profiles_v1 is
  'Actor analytics settings calculated over confirmed facts. Raw facts are immutable inputs.';
comment on table public.value_object_analytics_effect_rules_v1 is
  'Analytics-only coefficients. They must never change persisted measure/fact values.';

-- Strong database lock for the superseded A3.1 fact-mutating coefficient model.
-- Preflight guarantees there are no active old rules before this trigger is installed.
create function public.block_active_fact_mutating_coefficient_rule_v1a()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if new.status='active' then
    raise exception using
      errcode='23514',
      message='A3_1_FACT_MUTATING_COEFFICIENT_AUTHORING_RETIRED',
      detail='Use value_object_analytics_effect_rules_v1. Persisted numeric facts must remain raw.';
  end if;
  return new;
end;
$function$;

revoke all on function public.block_active_fact_mutating_coefficient_rule_v1a()
  from public, anon, authenticated, service_role;
grant execute on function public.block_active_fact_mutating_coefficient_rule_v1a()
  to service_role;

drop trigger if exists block_active_fact_mutating_coefficient_rule_v1a_trg
  on public.activity_leaf_fact_coefficient_rules_a31;
create trigger block_active_fact_mutating_coefficient_rule_v1a_trg
before insert or update of status
on public.activity_leaf_fact_coefficient_rules_a31
for each row
execute function public.block_active_fact_mutating_coefficient_rule_v1a();

commit;

select jsonb_pretty(jsonb_build_object(
  'status','PASS',
  'contract','ARCTOR_VO_AUTHORING_ANALYTICS_FOUNDATION_V1A',
  'profilesTable',to_regclass('public.value_object_analytics_profiles_v1') is not null,
  'effectRulesTable',to_regclass('public.value_object_analytics_effect_rules_v1') is not null,
  'factMutatingRuleLockTrigger',exists(
    select 1
    from pg_trigger t
    where t.tgrelid='public.activity_leaf_fact_coefficient_rules_a31'::regclass
      and t.tgname='block_active_fact_mutating_coefficient_rule_v1a_trg'
      and not t.tgisinternal
  ),
  'oldActiveFactMutatingRules',(
    select count(*)
    from public.activity_leaf_fact_coefficient_rules_a31
    where status='active'
  ),
  'symptomStateLeafKind',exists(
    select 1 from public.value_object_kind_registry k
    where k.facet_code='STATE'
      and k.object_kind_code='symptom_state'
      and k.status='active'
      and k.allowed_node_roles_json ? 'leaf'
  )
)) as arctor_vo_analytics_v1a_apply_result;
