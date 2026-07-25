-- ARCTOR.app
-- P7.1 parameter definitions / leaf assignments / fact precision foundation
-- APPLY R1
--
-- This migration is additive:
-- - it does not modify the existing value_object_target_standards table;
-- - it does not modify activity facts or measures;
-- - P7.2 will connect target standards to parameter assignments.
--
-- Source registry:
-- src/types/reality-core/parameter-registry-v1.ts
-- SHA256: 3266AE173F73F5009C6FD41A7941FE242D5132C0F30EF7EF4949E3AD4EC149CA

begin;

do $preflight$
begin
  if to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null
     or to_regclass('public.actor_public_profiles') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_branch_types') is null then
    raise exception using
      errcode = '42P01',
      message = 'P7_1_REQUIRED_REALITY_ACTOR_TABLES_MISSING';
  end if;

  if to_regclass('public.value_object_parameter_definitions') is not null
     or to_regclass('public.value_object_parameter_assignments') is not null
     or to_regclass('public.fact_capture_precision_policies') is not null
     or to_regclass('public.fact_capture_precision_preferences') is not null then
    raise exception using
      errcode = '42P07',
      message = 'P7_1_FOUNDATION_TABLE_ALREADY_EXISTS';
  end if;
end;
$preflight$;

create table public.value_object_parameter_definitions (
  id uuid primary key default gen_random_uuid(),
  parameter_series_id uuid not null default gen_random_uuid(),
  version integer not null default 1,

  scope_code text not null,
  parameter_code text not null,

  owner_user_id uuid
    references public.app_users(id)
    on delete cascade,
  owner_actor_id uuid
    references public.actors(id)
    on delete cascade,
  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  title text not null,
  description text,

  dimension_code text not null,
  value_type_code text not null,
  canonical_unit_code text not null,
  allowed_unit_codes jsonb not null default '[]'::jsonb,
  aggregation_method_code text not null,
  default_window_code text not null,
  allow_negative boolean not null default false,
  validation_json jsonb not null default '{}'::jsonb,

  source_version text,
  status text not null default 'active',
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint value_object_parameter_definitions_series_version_key
    unique (parameter_series_id, version),

  constraint value_object_parameter_definitions_scope_check
    check (scope_code in ('system', 'actor')),

  constraint value_object_parameter_definitions_owner_shape_check
    check (
      (
        scope_code = 'system'
        and owner_user_id is null
        and owner_actor_id is null
      )
      or
      (
        scope_code = 'actor'
        and owner_user_id is not null
        and owner_actor_id is not null
      )
    ),

  constraint value_object_parameter_definitions_code_check
    check (parameter_code ~ '^[a-z][a-z0-9_]{1,79}$'),

  constraint value_object_parameter_definitions_version_check
    check (version > 0),

  constraint value_object_parameter_definitions_title_length_check
    check (char_length(title) between 1 and 200),

  constraint value_object_parameter_definitions_description_length_check
    check (description is null or char_length(description) <= 4000),

  constraint value_object_parameter_definitions_dimension_check
    check (
      dimension_code in (
        'time', 'distance', 'count', 'volume', 'mass', 'energy', 'money',
        'rate', 'score', 'temperature', 'text', 'boolean', 'timestamp'
      )
    ),

  constraint value_object_parameter_definitions_value_type_check
    check (value_type_code in ('numeric', 'text', 'boolean', 'timestamp')),

  constraint value_object_parameter_definitions_canonical_unit_check
    check (canonical_unit_code ~ '^[a-z][a-z0-9_]{0,79}$'),

  constraint value_object_parameter_definitions_units_json_check
    check (jsonb_typeof(allowed_unit_codes) = 'array'),

  constraint value_object_parameter_definitions_aggregation_check
    check (
      aggregation_method_code in (
        'sum', 'average', 'minimum', 'maximum', 'latest',
        'count', 'duration', 'rate', 'none'
      )
    ),

  constraint value_object_parameter_definitions_window_check
    check (
      default_window_code in (
        'event', 'hour', 'day', 'week', 'month',
        'rolling_7_days', 'rolling_30_days'
      )
    ),

  constraint value_object_parameter_definitions_validation_json_check
    check (jsonb_typeof(validation_json) = 'object'),

  constraint value_object_parameter_definitions_status_check
    check (status in ('active', 'retired')),

  constraint value_object_parameter_definitions_valid_interval_check
    check (valid_to is null or valid_to >= valid_from),

  constraint value_object_parameter_definitions_metadata_json_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create unique index value_object_parameter_definitions_system_active_code_uidx
  on public.value_object_parameter_definitions(parameter_code)
  where scope_code = 'system' and status = 'active';

create unique index value_object_parameter_definitions_actor_active_code_uidx
  on public.value_object_parameter_definitions(owner_actor_id, parameter_code)
  where scope_code = 'actor' and status = 'active';

create index value_object_parameter_definitions_owner_idx
  on public.value_object_parameter_definitions(owner_user_id, owner_actor_id)
  where scope_code = 'actor';

create index value_object_parameter_definitions_status_idx
  on public.value_object_parameter_definitions(status);

create table public.value_object_parameter_assignments (
  id uuid primary key default gen_random_uuid(),

  value_object_id uuid not null
    references public.value_objects(id)
    on delete cascade,

  parameter_definition_id uuid not null
    references public.value_object_parameter_definitions(id)
    on delete restrict,

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  status text not null default 'active',
  display_order integer not null default 1000,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  idempotency_key text,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint value_object_parameter_assignments_status_check
    check (status in ('active', 'inactive', 'retired')),

  constraint value_object_parameter_assignments_display_order_check
    check (display_order > 0),

  constraint value_object_parameter_assignments_valid_interval_check
    check (valid_to is null or valid_to >= valid_from),

  constraint value_object_parameter_assignments_metadata_json_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create unique index value_object_parameter_assignments_active_uidx
  on public.value_object_parameter_assignments(
    value_object_id,
    parameter_definition_id
  )
  where status = 'active';

create unique index value_object_parameter_assignments_idempotency_uidx
  on public.value_object_parameter_assignments(
    owner_user_id,
    owner_actor_id,
    idempotency_key
  )
  where idempotency_key is not null;

create index value_object_parameter_assignments_leaf_idx
  on public.value_object_parameter_assignments(value_object_id, status);

create index value_object_parameter_assignments_parameter_idx
  on public.value_object_parameter_assignments(parameter_definition_id, status);

create table public.fact_capture_precision_policies (
  precision_policy_code text primary key,
  version integer not null default 1,

  allows_estimate boolean not null,
  measurement_required boolean not null,
  explicit_confirmation_required boolean not null,
  uncertainty_range_required boolean not null,
  default_relative_error_percent numeric,
  default_confidence_floor numeric not null,
  accepted_for_analytics_by_default boolean not null,

  title_key text not null,
  description_key text not null,
  display_order integer not null,
  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fact_capture_precision_policies_code_check
    check (
      precision_policy_code in (
        'strict_measurement',
        'bounded_estimate',
        'reasonable_estimate',
        'fast_coarse_estimate'
      )
    ),

  constraint fact_capture_precision_policies_version_check
    check (version > 0),

  constraint fact_capture_precision_policies_error_check
    check (
      default_relative_error_percent is null
      or (
        default_relative_error_percent >= 0
        and default_relative_error_percent <= 100
      )
    ),

  constraint fact_capture_precision_policies_confidence_check
    check (
      default_confidence_floor >= 0
      and default_confidence_floor <= 1
    ),

  constraint fact_capture_precision_policies_display_order_check
    check (display_order > 0),

  constraint fact_capture_precision_policies_status_check
    check (status in ('active', 'inactive'))
);

create table public.fact_capture_precision_preferences (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  scope_code text not null,
  branch_type_code text
    references public.value_object_branch_types(branch_type_code)
    on delete restrict,
  value_object_id uuid
    references public.value_objects(id)
    on delete cascade,
  parameter_definition_id uuid
    references public.value_object_parameter_definitions(id)
    on delete restrict,
  parameter_assignment_id uuid
    references public.value_object_parameter_assignments(id)
    on delete cascade,

  precision_policy_code text not null
    references public.fact_capture_precision_policies(precision_policy_code)
    on delete restrict,

  relative_error_percent_override numeric,
  confidence_floor_override numeric,
  explicit_confirmation_required_override boolean,
  uncertainty_range_required_override boolean,

  preference_version integer not null default 1,
  status text not null default 'active',
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  idempotency_key text,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fact_capture_precision_preferences_scope_check
    check (
      scope_code in (
        'actor_default',
        'branch_type',
        'value_object',
        'parameter_definition',
        'parameter_assignment'
      )
    ),

  constraint fact_capture_precision_preferences_scope_shape_check
    check (
      (
        scope_code = 'actor_default'
        and branch_type_code is null
        and value_object_id is null
        and parameter_definition_id is null
        and parameter_assignment_id is null
      )
      or
      (
        scope_code = 'branch_type'
        and branch_type_code is not null
        and value_object_id is null
        and parameter_definition_id is null
        and parameter_assignment_id is null
      )
      or
      (
        scope_code = 'value_object'
        and branch_type_code is null
        and value_object_id is not null
        and parameter_definition_id is null
        and parameter_assignment_id is null
      )
      or
      (
        scope_code = 'parameter_definition'
        and branch_type_code is null
        and value_object_id is null
        and parameter_definition_id is not null
        and parameter_assignment_id is null
      )
      or
      (
        scope_code = 'parameter_assignment'
        and branch_type_code is null
        and value_object_id is null
        and parameter_definition_id is null
        and parameter_assignment_id is not null
      )
    ),

  constraint fact_capture_precision_preferences_error_check
    check (
      relative_error_percent_override is null
      or (
        relative_error_percent_override >= 0
        and relative_error_percent_override <= 100
      )
    ),

  constraint fact_capture_precision_preferences_confidence_check
    check (
      confidence_floor_override is null
      or (
        confidence_floor_override >= 0
        and confidence_floor_override <= 1
      )
    ),

  constraint fact_capture_precision_preferences_version_check
    check (preference_version > 0),

  constraint fact_capture_precision_preferences_status_check
    check (status in ('active', 'retired')),

  constraint fact_capture_precision_preferences_valid_interval_check
    check (valid_to is null or valid_to >= valid_from),

  constraint fact_capture_precision_preferences_metadata_json_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create unique index fact_capture_precision_preferences_actor_default_uidx
  on public.fact_capture_precision_preferences(owner_actor_id)
  where scope_code = 'actor_default' and status = 'active';

create unique index fact_capture_precision_preferences_branch_uidx
  on public.fact_capture_precision_preferences(owner_actor_id, branch_type_code)
  where scope_code = 'branch_type' and status = 'active';

create unique index fact_capture_precision_preferences_value_object_uidx
  on public.fact_capture_precision_preferences(owner_actor_id, value_object_id)
  where scope_code = 'value_object' and status = 'active';

create unique index fact_capture_precision_preferences_definition_uidx
  on public.fact_capture_precision_preferences(
    owner_actor_id,
    parameter_definition_id
  )
  where scope_code = 'parameter_definition' and status = 'active';

create unique index fact_capture_precision_preferences_assignment_uidx
  on public.fact_capture_precision_preferences(
    owner_actor_id,
    parameter_assignment_id
  )
  where scope_code = 'parameter_assignment' and status = 'active';

create unique index fact_capture_precision_preferences_idempotency_uidx
  on public.fact_capture_precision_preferences(
    owner_user_id,
    owner_actor_id,
    idempotency_key
  )
  where idempotency_key is not null;

create or replace function public.enforce_value_object_parameter_definition_v3()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_has_assignment boolean;
begin
  if exists (
    select 1
    from jsonb_array_elements(new.allowed_unit_codes) unit_value
    where jsonb_typeof(unit_value) <> 'string'
  ) then
    raise exception using
      errcode = '23514',
      message = 'P7_PARAMETER_ALLOWED_UNITS_MUST_BE_STRINGS';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements_text(new.allowed_unit_codes) unit_code
    where unit_code = new.canonical_unit_code
  ) then
    raise exception using
      errcode = '23514',
      message = 'P7_PARAMETER_CANONICAL_UNIT_MUST_BE_ALLOWED';
  end if;

  if new.scope_code = 'actor' then
    if not exists (
      select 1
      from public.actor_public_profiles profile
      join public.actors actor
        on actor.id = profile.actor_id
       and actor.status = 'active'
      where profile.owner_user_id = new.owner_user_id
        and profile.actor_id = new.owner_actor_id
    ) then
      raise exception using
        errcode = '42501',
        message = 'P7_PARAMETER_ACTOR_NOT_OWNED_BY_USER';
    end if;

    if new.created_by_actor_id is not null
       and not exists (
         select 1
         from public.actor_public_profiles profile
         where profile.owner_user_id = new.owner_user_id
           and profile.actor_id = new.created_by_actor_id
       ) then
      raise exception using
        errcode = '42501',
        message = 'P7_PARAMETER_CREATOR_ACTOR_NOT_OWNED_BY_USER';
    end if;
  elsif new.created_by_actor_id is not null then
    raise exception using
      errcode = '23514',
      message = 'P7_SYSTEM_PARAMETER_CREATOR_MUST_BE_NULL';
  end if;

  if tg_op = 'UPDATE' then
    select exists (
      select 1
      from public.value_object_parameter_assignments assignment
      where assignment.parameter_definition_id = old.id
    )
    into v_has_assignment;

    if v_has_assignment and (
      new.parameter_code is distinct from old.parameter_code
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.dimension_code is distinct from old.dimension_code
      or new.value_type_code is distinct from old.value_type_code
      or new.canonical_unit_code is distinct from old.canonical_unit_code
      or new.allowed_unit_codes is distinct from old.allowed_unit_codes
      or new.aggregation_method_code is distinct from old.aggregation_method_code
      or new.default_window_code is distinct from old.default_window_code
      or new.allow_negative is distinct from old.allow_negative
      or new.validation_json is distinct from old.validation_json
      or new.scope_code is distinct from old.scope_code
      or new.owner_user_id is distinct from old.owner_user_id
      or new.owner_actor_id is distinct from old.owner_actor_id
      or new.parameter_series_id is distinct from old.parameter_series_id
      or new.version is distinct from old.version
    ) then
      raise exception using
        errcode = '23514',
        message = 'P7_USED_PARAMETER_SEMANTIC_REWRITE_FORBIDDEN';
    end if;
  end if;

  return new;
end;
$function$;

create trigger value_object_parameter_definitions_guard_v3_trg
before insert or update
on public.value_object_parameter_definitions
for each row
execute function public.enforce_value_object_parameter_definition_v3();

create or replace function public.enforce_value_object_parameter_assignment_v3()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_value_object public.value_objects%rowtype;
  v_definition public.value_object_parameter_definitions%rowtype;
begin
  select *
  into v_value_object
  from public.value_objects
  where id = new.value_object_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'P7_PARAMETER_ASSIGNMENT_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_value_object.node_role_code is distinct from 'activity_leaf'
     or v_value_object.object_kind is distinct from 'activity_pattern' then
    raise exception using
      errcode = '23514',
      message = 'P7_PARAMETER_ASSIGNMENT_REQUIRES_ACTIVITY_LEAF';
  end if;

  if v_value_object.owner_user_id is distinct from new.owner_user_id
     or v_value_object.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P7_PARAMETER_ASSIGNMENT_VALUE_OBJECT_OWNER_MISMATCH';
  end if;

  select *
  into v_definition
  from public.value_object_parameter_definitions
  where id = new.parameter_definition_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'P7_PARAMETER_ASSIGNMENT_DEFINITION_NOT_FOUND';
  end if;

  if v_definition.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'P7_PARAMETER_ASSIGNMENT_DEFINITION_NOT_ACTIVE';
  end if;

  if v_definition.scope_code = 'actor'
     and (
       v_definition.owner_user_id is distinct from new.owner_user_id
       or v_definition.owner_actor_id is distinct from new.owner_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'P7_PARAMETER_ASSIGNMENT_DEFINITION_OWNER_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = new.owner_user_id
      and profile.actor_id = new.owner_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'P7_PARAMETER_ASSIGNMENT_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if new.created_by_actor_id is not null
     and not exists (
       select 1
       from public.actor_public_profiles profile
       where profile.owner_user_id = new.owner_user_id
         and profile.actor_id = new.created_by_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'P7_PARAMETER_ASSIGNMENT_CREATOR_NOT_OWNED_BY_USER';
  end if;

  return new;
end;
$function$;

create trigger value_object_parameter_assignments_guard_v3_trg
before insert or update
on public.value_object_parameter_assignments
for each row
execute function public.enforce_value_object_parameter_assignment_v3();

create or replace function public.enforce_fact_capture_precision_preference_v3()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_definition public.value_object_parameter_definitions%rowtype;
  v_assignment public.value_object_parameter_assignments%rowtype;
begin
  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = new.owner_user_id
      and profile.actor_id = new.owner_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'P7_PRECISION_PREFERENCE_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if new.created_by_actor_id is not null
     and not exists (
       select 1
       from public.actor_public_profiles profile
       where profile.owner_user_id = new.owner_user_id
         and profile.actor_id = new.created_by_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'P7_PRECISION_PREFERENCE_CREATOR_NOT_OWNED_BY_USER';
  end if;

  if new.scope_code = 'value_object' then
    if not exists (
      select 1
      from public.value_objects value_object
      where value_object.id = new.value_object_id
        and value_object.owner_user_id = new.owner_user_id
        and value_object.owner_actor_id = new.owner_actor_id
    ) then
      raise exception using
        errcode = '42501',
        message = 'P7_PRECISION_PREFERENCE_VALUE_OBJECT_OWNER_MISMATCH';
    end if;
  elsif new.scope_code = 'parameter_definition' then
    select *
    into v_definition
    from public.value_object_parameter_definitions
    where id = new.parameter_definition_id;

    if not found
       or (
         v_definition.scope_code = 'actor'
         and (
           v_definition.owner_user_id is distinct from new.owner_user_id
           or v_definition.owner_actor_id is distinct from new.owner_actor_id
         )
       ) then
      raise exception using
        errcode = '42501',
        message = 'P7_PRECISION_PREFERENCE_DEFINITION_NOT_ACCESSIBLE';
    end if;
  elsif new.scope_code = 'parameter_assignment' then
    select *
    into v_assignment
    from public.value_object_parameter_assignments
    where id = new.parameter_assignment_id;

    if not found
       or v_assignment.owner_user_id is distinct from new.owner_user_id
       or v_assignment.owner_actor_id is distinct from new.owner_actor_id then
      raise exception using
        errcode = '42501',
        message = 'P7_PRECISION_PREFERENCE_ASSIGNMENT_OWNER_MISMATCH';
    end if;
  end if;

  return new;
end;
$function$;

create trigger fact_capture_precision_preferences_guard_v3_trg
before insert or update
on public.fact_capture_precision_preferences
for each row
execute function public.enforce_fact_capture_precision_preference_v3();

do $updated_at$
begin
  if to_regprocedure('public.set_reality_model_v3_updated_at()') is null then
    raise exception using
      errcode = '42883',
      message = 'P7_1_UPDATED_AT_FUNCTION_REQUIRED';
  end if;
end;
$updated_at$;

create trigger value_object_parameter_definitions_updated_at_v3_trg
before update on public.value_object_parameter_definitions
for each row execute function public.set_reality_model_v3_updated_at();

create trigger value_object_parameter_assignments_updated_at_v3_trg
before update on public.value_object_parameter_assignments
for each row execute function public.set_reality_model_v3_updated_at();

create trigger fact_capture_precision_policies_updated_at_v3_trg
before update on public.fact_capture_precision_policies
for each row execute function public.set_reality_model_v3_updated_at();

create trigger fact_capture_precision_preferences_updated_at_v3_trg
before update on public.fact_capture_precision_preferences
for each row execute function public.set_reality_model_v3_updated_at();

insert into public.fact_capture_precision_policies (
  precision_policy_code,
  version,
  allows_estimate,
  measurement_required,
  explicit_confirmation_required,
  uncertainty_range_required,
  default_relative_error_percent,
  default_confidence_floor,
  accepted_for_analytics_by_default,
  title_key,
  description_key,
  display_order,
  status
)
values
  (
    'strict_measurement', 1,
    false, true, true, false,
    0, 1, false,
    'factPrecision.strict.title',
    'factPrecision.strict.description',
    10, 'active'
  ),
  (
    'bounded_estimate', 1,
    true, false, false, true,
    20, 0.70, true,
    'factPrecision.bounded.title',
    'factPrecision.bounded.description',
    20, 'active'
  ),
  (
    'reasonable_estimate', 1,
    true, false, false, false,
    25, 0.65, true,
    'factPrecision.reasonable.title',
    'factPrecision.reasonable.description',
    30, 'active'
  ),
  (
    'fast_coarse_estimate', 1,
    true, false, false, false,
    50, 0.40, true,
    'factPrecision.coarse.title',
    'factPrecision.coarse.description',
    40, 'active'
  );

with seed (
  parameter_code,
  title,
  description,
  dimension_code,
  value_type_code,
  canonical_unit_code,
  allowed_unit_codes_text,
  aggregation_method_code,
  default_window_code,
  allow_negative
) as (
  values
    ('duration', 'Продолжительность', 'Продолжительность активности или её части.', 'time', 'numeric', 'minute', '["second", "minute", "hour"]', 'sum', 'event', false),
    ('distance', 'Расстояние', 'Пройденное, пробежанное или перемещённое расстояние.', 'distance', 'numeric', 'meter', '["meter", "kilometer"]', 'sum', 'event', false),
    ('step_count', 'Количество шагов', 'Шаги за событие или период.', 'count', 'numeric', 'step', '["step"]', 'sum', 'day', false),
    ('observation_count', 'Количество наблюдений', 'Универсальное количество, когда специализированный parameter_code ещё не определён.', 'count', 'numeric', 'count', '["count"]', 'sum', 'event', false),
    ('repetition_count', 'Количество повторений', 'Повторения упражнения.', 'count', 'numeric', 'repetition', '["repetition"]', 'sum', 'event', false),
    ('set_count', 'Количество подходов', 'Подходы упражнения.', 'count', 'numeric', 'set', '["set"]', 'sum', 'event', false),
    ('liquid_volume', 'Объём жидкости', 'Выпитый, использованный или переданный объём жидкости.', 'volume', 'numeric', 'liter', '["milliliter", "liter"]', 'sum', 'day', false),
    ('body_mass', 'Масса тела', 'Измеренная масса тела на момент наблюдения.', 'mass', 'numeric', 'kilogram', '["gram", "kilogram"]', 'latest', 'day', false),
    ('object_mass', 'Масса объекта', 'Масса товара, груза, упражнения или иного объекта.', 'mass', 'numeric', 'kilogram', '["gram", "kilogram"]', 'latest', 'event', false),
    ('energy_amount', 'Количество энергии', 'Нейтральное количество энергии, когда intake/expenditure/balance ещё не установлены.', 'energy', 'numeric', 'kcal', '["kcal", "kilojoule"]', 'sum', 'event', false),
    ('energy_intake', 'Полученная энергия', 'Энергия, полученная с пищей и напитками.', 'energy', 'numeric', 'kcal', '["kcal", "kilojoule"]', 'sum', 'day', false),
    ('energy_expenditure', 'Потраченная энергия', 'Расчётный или измеренный расход энергии.', 'energy', 'numeric', 'kcal', '["kcal", "kilojoule"]', 'sum', 'day', false),
    ('energy_balance', 'Энергетический баланс', 'Производный параметр: intake - expenditure. Отрицательное значение допустимо.', 'energy', 'numeric', 'kcal', '["kcal", "kilojoule"]', 'sum', 'day', true),
    ('monetary_amount_pln', 'Денежная сумма PLN', 'Платёж, доход, возврат или стоимость в PLN. Знак зависит от способа записи.', 'money', 'numeric', 'pln', '["pln"]', 'sum', 'event', true),
    ('monetary_amount_eur', 'Денежная сумма EUR', 'Платёж, доход, возврат или стоимость в EUR. Знак зависит от способа записи.', 'money', 'numeric', 'eur', '["eur"]', 'sum', 'event', true),
    ('monetary_amount_usd', 'Денежная сумма USD', 'Платёж, доход, возврат или стоимость в USD. Знак зависит от способа записи.', 'money', 'numeric', 'usd', '["usd"]', 'sum', 'event', true),
    ('heart_rate', 'Частота сердечных сокращений', 'Средний, минимальный или максимальный пульс должен различаться отдельным context field или parameter code расширения.', 'rate', 'numeric', 'beat_per_minute', '["beat_per_minute"]', 'average', 'event', false),
    ('pain_intensity', 'Интенсивность боли', 'Субъективная интенсивность боли от 0 до 10.', 'score', 'numeric', 'score_0_10', '["score_0_10"]', 'latest', 'event', false),
    ('state_score', 'Оценка состояния', 'Общая субъективная оценка, пока специализированного parameter_code нет.', 'score', 'numeric', 'score_0_10', '["score_0_10"]', 'latest', 'event', false),
    ('speed', 'Скорость', 'Средняя скорость движения.', 'rate', 'numeric', 'kilometer_per_hour', '["kilometer_per_hour"]', 'average', 'event', false),
    ('temperature', 'Температура', 'Температура тела, среды или объекта; контекст задаётся связью с ЦО/ОН.', 'temperature', 'numeric', 'celsius', '["celsius"]', 'latest', 'event', true),
    ('observed_text', 'Текстовое наблюдение', 'Нейтральное текстовое наблюдение, которое ещё не нормализовано в специальный параметр.', 'text', 'text', 'text', '["text"]', 'none', 'event', false),
    ('boolean_state', 'Логическое состояние', 'Да/нет, выполнено/не выполнено, присутствует/отсутствует.', 'boolean', 'boolean', 'boolean', '["boolean"]', 'latest', 'event', false),
    ('observed_at', 'Момент наблюдения', 'Временная отметка как значение параметра, когда она является наблюдаемым содержанием.', 'timestamp', 'timestamp', 'timestamp', '["timestamp"]', 'latest', 'event', false)
)
insert into public.value_object_parameter_definitions (
  scope_code,
  parameter_code,
  title,
  description,
  dimension_code,
  value_type_code,
  canonical_unit_code,
  allowed_unit_codes,
  aggregation_method_code,
  default_window_code,
  allow_negative,
  source_version,
  status,
  metadata_json
)
select
  'system',
  seed.parameter_code,
  seed.title,
  seed.description,
  seed.dimension_code,
  seed.value_type_code,
  seed.canonical_unit_code,
  seed.allowed_unit_codes_text::jsonb,
  seed.aggregation_method_code,
  seed.default_window_code,
  seed.allow_negative,
  'parameter-registry-v1',
  'active',
  jsonb_build_object(
    'sourceFile', 'src/types/reality-core/parameter-registry-v1.ts',
    'sourceSha256', '3266AE173F73F5009C6FD41A7941FE242D5132C0F30EF7EF4949E3AD4EC149CA'
  )
from seed;

alter table public.value_object_parameter_definitions enable row level security;
alter table public.value_object_parameter_assignments enable row level security;
alter table public.fact_capture_precision_policies enable row level security;
alter table public.fact_capture_precision_preferences enable row level security;

revoke all on public.value_object_parameter_definitions from anon, authenticated;
revoke all on public.value_object_parameter_assignments from anon, authenticated;
revoke all on public.fact_capture_precision_policies from anon, authenticated;
revoke all on public.fact_capture_precision_preferences from anon, authenticated;

grant select on public.value_object_parameter_definitions to anon, authenticated;
grant select on public.fact_capture_precision_policies to anon, authenticated;

create policy value_object_parameter_definitions_system_read_v3
on public.value_object_parameter_definitions
for select
to anon, authenticated
using (scope_code = 'system' and status = 'active');

create policy fact_capture_precision_policies_read_v3
on public.fact_capture_precision_policies
for select
to anon, authenticated
using (status = 'active');

create policy value_object_parameter_assignments_no_direct_access_v3
on public.value_object_parameter_assignments
for all
to anon, authenticated
using (false)
with check (false);

create policy fact_capture_precision_preferences_no_direct_access_v3
on public.fact_capture_precision_preferences
for all
to anon, authenticated
using (false)
with check (false);

grant select, insert, update, delete
  on public.value_object_parameter_definitions
  to service_role;
grant select, insert, update, delete
  on public.value_object_parameter_assignments
  to service_role;
grant select, insert, update, delete
  on public.fact_capture_precision_policies
  to service_role;
grant select, insert, update, delete
  on public.fact_capture_precision_preferences
  to service_role;

revoke execute on function public.enforce_value_object_parameter_definition_v3()
  from public, anon, authenticated;
revoke execute on function public.enforce_value_object_parameter_assignment_v3()
  from public, anon, authenticated;
revoke execute on function public.enforce_fact_capture_precision_preference_v3()
  from public, anon, authenticated;

grant execute on function public.enforce_value_object_parameter_definition_v3()
  to service_role;
grant execute on function public.enforce_value_object_parameter_assignment_v3()
  to service_role;
grant execute on function public.enforce_fact_capture_precision_preference_v3()
  to service_role;

comment on table public.value_object_parameter_definitions is
  'P7 open parameter registry: system definitions plus actor-owned custom definitions. Used definitions cannot be semantically rewritten.';

comment on table public.value_object_parameter_assignments is
  'P7 assignments of registered parameters to actor-owned activity_leaf Value Objects.';

comment on table public.fact_capture_precision_policies is
  'System registry of user-selectable fact approximation and confirmation policies.';

comment on table public.fact_capture_precision_preferences is
  'Actor-owned precision preferences with precedence scopes: actor, branch, object, parameter definition, assignment.';

commit;
