-- ARCTOR.app
-- P7.2A Target Standards V2 database foundation
-- APPLY R1
--
-- Additive rollout:
-- - preserves the empty legacy value_object_target_standards table and API;
-- - creates a separate versioned V2 target contour;
-- - does not change Activity Container, measures, facts or P7.1 preferences;
-- - P7.2B will switch the server API and leaf UI to this V2 contour.

begin;

do $preflight$
declare
  v_legacy_rows bigint;
begin
  if to_regclass('public.value_object_target_standards') is null
     or to_regclass('public.value_object_target_kinds') is null
     or to_regclass('public.value_object_normalization_policies') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.actor_public_profiles') is null then
    raise exception using
      errcode = '42P01',
      message = 'P7_2_REQUIRED_FOUNDATION_TABLE_MISSING';
  end if;

  if to_regclass('public.value_object_unit_conversions') is not null
     or to_regclass('public.value_object_target_standard_versions') is not null
     or to_regclass('public.value_object_target_standard_versions_read_v2') is not null then
    raise exception using
      errcode = '42P07',
      message = 'P7_2_V2_FOUNDATION_ALREADY_EXISTS';
  end if;

  select count(*)
  into v_legacy_rows
  from public.value_object_target_standards;

  if v_legacy_rows <> 0 then
    raise exception using
      errcode = '55000',
      message = 'P7_2_LEGACY_TARGET_ROWS_REQUIRE_REVIEW',
      detail = format('legacy_target_rows=%s', v_legacy_rows);
  end if;
end;
$preflight$;

create table public.value_object_unit_conversions (
  dimension_code text not null,
  from_unit_code text not null,
  to_unit_code text not null,
  multiplier numeric not null,
  offset_value numeric not null default 0,
  conversion_version text not null,
  source_version text not null,
  status text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint value_object_unit_conversions_pkey
    primary key (
      dimension_code,
      from_unit_code,
      to_unit_code,
      conversion_version
    ),

  constraint value_object_unit_conversions_dimension_check
    check (
      dimension_code in (
        'time', 'distance', 'count', 'volume', 'mass', 'energy', 'money',
        'rate', 'score', 'temperature'
      )
    ),

  constraint value_object_unit_conversions_code_check
    check (
      from_unit_code ~ '^[a-z][a-z0-9_]{0,79}$'
      and to_unit_code ~ '^[a-z][a-z0-9_]{0,79}$'
    ),

  constraint value_object_unit_conversions_multiplier_check
    check (multiplier > 0),

  constraint value_object_unit_conversions_status_check
    check (status in ('active', 'inactive')),

  constraint value_object_unit_conversions_metadata_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create index value_object_unit_conversions_lookup_idx
  on public.value_object_unit_conversions(
    dimension_code,
    from_unit_code,
    to_unit_code,
    status
  );

insert into public.value_object_unit_conversions (
  dimension_code,
  from_unit_code,
  to_unit_code,
  multiplier,
  offset_value,
  conversion_version,
  source_version,
  status
)
values
  ('time', 'second', 'minute', 0.0166666666666666666666666667, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('time', 'minute', 'minute', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('time', 'hour', 'minute', 60, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),

  ('distance', 'meter', 'meter', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('distance', 'kilometer', 'meter', 1000, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),

  ('volume', 'milliliter', 'liter', 0.001, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('volume', 'liter', 'liter', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),

  ('mass', 'gram', 'kilogram', 0.001, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('mass', 'kilogram', 'kilogram', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),

  ('energy', 'kcal', 'kcal', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('energy', 'kilojoule', 'kcal', 0.2390057361376673040152963671, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),

  ('rate', 'beat_per_minute', 'beat_per_minute', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('rate', 'kilometer_per_hour', 'kilometer_per_hour', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),

  ('count', 'repetition', 'repetition', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('count', 'set', 'set', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('count', 'step', 'step', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('count', 'count', 'count', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),

  ('score', 'score_0_10', 'score_0_10', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),

  ('money', 'pln', 'pln', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('money', 'eur', 'eur', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),
  ('money', 'usd', 'usd', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active'),

  ('temperature', 'celsius', 'celsius', 1, 0, 'linear-unit-v1', 'parameter-registry-v1', 'active');

create table public.value_object_target_standard_versions (
  id uuid primary key default gen_random_uuid(),
  target_series_id uuid not null default gen_random_uuid(),
  version integer not null default 1,

  parameter_assignment_id uuid not null
    references public.value_object_parameter_assignments(id)
    on delete restrict,

  owner_user_id uuid not null
    references public.app_users(id)
    on delete cascade,

  owner_actor_id uuid not null
    references public.actors(id)
    on delete cascade,

  created_by_actor_id uuid not null
    references public.actors(id)
    on delete restrict,

  target_kind_code text not null
    references public.value_object_target_kinds(target_kind_code)
    on update restrict
    on delete restrict,

  normalization_policy_code text
    references public.value_object_normalization_policies(
      normalization_policy_code
    )
    on update restrict
    on delete restrict,

  original_value_numeric numeric,
  original_min_numeric numeric,
  original_max_numeric numeric,
  original_value_boolean boolean,
  original_value_text text,
  original_unit_code text,

  canonical_value_numeric numeric,
  canonical_min_numeric numeric,
  canonical_max_numeric numeric,
  canonical_value_boolean boolean,
  canonical_value_text text,
  canonical_unit_code text,

  period_count numeric,
  period_unit_code text,
  period_days_numeric numeric,

  daily_equivalent_numeric numeric,
  daily_equivalent_unit_code text,
  normalization_state_code text not null default 'not_applicable',
  normalization_formula_version text,

  priority_code text not null default 'normal',
  source_type_code text not null default 'user_defined',
  status_code text not null default 'active',

  supersedes_target_version_id uuid
    references public.value_object_target_standard_versions(id)
    on delete restrict,

  label text,
  description text,
  safety_note text,

  idempotency_key text,
  request_hash text,
  metadata_json jsonb not null default '{}'::jsonb,

  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint value_object_target_standard_versions_series_version_key
    unique (target_series_id, version),

  constraint value_object_target_standard_versions_version_check
    check (version > 0),

  constraint value_object_target_standard_versions_period_count_check
    check (period_count is null or period_count > 0),

  constraint value_object_target_standard_versions_period_unit_check
    check (
      period_unit_code is null
      or period_unit_code in (
        'day',
        'week',
        'month',
        'quarter',
        'year',
        'rolling_7_days',
        'rolling_30_days'
      )
    ),

  constraint value_object_target_standard_versions_period_pair_check
    check (
      (period_count is null and period_unit_code is null)
      or
      (period_count is not null and period_unit_code is not null)
    ),

  constraint value_object_target_standard_versions_period_days_check
    check (period_days_numeric is null or period_days_numeric > 0),

  constraint value_object_target_standard_versions_normalization_state_check
    check (
      normalization_state_code in (
        'derived',
        'not_applicable',
        'formula_required'
      )
    ),

  constraint value_object_target_standard_versions_priority_check
    check (priority_code in ('low', 'normal', 'high', 'critical')),

  constraint value_object_target_standard_versions_source_check
    check (
      source_type_code in (
        'user_defined',
        'system_default',
        'professional_guideline',
        'manual',
        'imported'
      )
    ),

  constraint value_object_target_standard_versions_status_check
    check (
      status_code in (
        'draft',
        'active',
        'superseded',
        'archived'
      )
    ),

  constraint value_object_target_standard_versions_valid_interval_check
    check (valid_to is null or valid_to >= valid_from),

  constraint value_object_target_standard_versions_label_check
    check (label is null or char_length(label) <= 200),

  constraint value_object_target_standard_versions_description_check
    check (description is null or char_length(description) <= 4000),

  constraint value_object_target_standard_versions_safety_note_check
    check (safety_note is null or char_length(safety_note) <= 500),

  constraint value_object_target_standard_versions_idempotency_pair_check
    check (
      (idempotency_key is null and request_hash is null)
      or
      (idempotency_key is not null and request_hash is not null)
    ),

  constraint value_object_target_standard_versions_metadata_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create unique index value_object_target_standard_versions_active_series_uidx
  on public.value_object_target_standard_versions(target_series_id)
  where status_code = 'active';

create unique index value_object_target_standard_versions_idempotency_uidx
  on public.value_object_target_standard_versions(
    owner_user_id,
    owner_actor_id,
    idempotency_key
  )
  where idempotency_key is not null;

create index value_object_target_standard_versions_assignment_idx
  on public.value_object_target_standard_versions(
    parameter_assignment_id,
    status_code
  );

create index value_object_target_standard_versions_owner_idx
  on public.value_object_target_standard_versions(
    owner_user_id,
    owner_actor_id,
    status_code
  );

create index value_object_target_standard_versions_series_idx
  on public.value_object_target_standard_versions(
    target_series_id,
    version desc
  );

create or replace function public.value_object_target_period_days_v1(
  p_period_count numeric,
  p_period_unit_code text
)
returns numeric
language plpgsql
immutable
strict
as $function$
begin
  if p_period_count <= 0 then
    raise exception using
      errcode = '23514',
      message = 'P7_2_TARGET_PERIOD_COUNT_MUST_BE_POSITIVE';
  end if;

  return case p_period_unit_code
    when 'day' then p_period_count
    when 'week' then p_period_count * 7
    when 'month' then p_period_count * 30.436875
    when 'quarter' then p_period_count * 91.310625
    when 'year' then p_period_count * 365.2425
    when 'rolling_7_days' then
      case
        when p_period_count = 1 then 7
        else null
      end
    when 'rolling_30_days' then
      case
        when p_period_count = 1 then 30
        else null
      end
    else null
  end;
end;
$function$;

create or replace function public.convert_value_object_unit_v1(
  p_dimension_code text,
  p_value numeric,
  p_from_unit_code text,
  p_to_unit_code text
)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_multiplier numeric;
  v_offset numeric;
begin
  if p_value is null then
    return null;
  end if;

  if p_from_unit_code = p_to_unit_code then
    return p_value;
  end if;

  select
    conversion.multiplier,
    conversion.offset_value
  into
    v_multiplier,
    v_offset
  from public.value_object_unit_conversions conversion
  where conversion.dimension_code = p_dimension_code
    and conversion.from_unit_code = p_from_unit_code
    and conversion.to_unit_code = p_to_unit_code
    and conversion.conversion_version = 'linear-unit-v1'
    and conversion.status = 'active';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'P7_2_UNIT_CONVERSION_NOT_REGISTERED',
      detail = format(
        'dimension=%s from=%s to=%s',
        p_dimension_code,
        p_from_unit_code,
        p_to_unit_code
      );
  end if;

  return (p_value * v_multiplier) + v_offset;
end;
$function$;

create or replace function public.enforce_value_object_target_standard_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_assignment public.value_object_parameter_assignments%rowtype;
  v_definition public.value_object_parameter_definitions%rowtype;
  v_value_object public.value_objects%rowtype;
  v_target_kind public.value_object_target_kinds%rowtype;
  v_policy public.value_object_normalization_policies%rowtype;

  v_latest public.value_object_target_standard_versions%rowtype;
  v_has_latest boolean := false;

  v_allowed_unit boolean;
  v_period_policy text;
  v_numeric_shape text;
begin
  if tg_op = 'UPDATE' then
    if (
      new.target_series_id is distinct from old.target_series_id
      or new.version is distinct from old.version
      or new.parameter_assignment_id is distinct from old.parameter_assignment_id
      or new.owner_user_id is distinct from old.owner_user_id
      or new.owner_actor_id is distinct from old.owner_actor_id
      or new.created_by_actor_id is distinct from old.created_by_actor_id
      or new.target_kind_code is distinct from old.target_kind_code
      or new.normalization_policy_code is distinct from old.normalization_policy_code
      or new.original_value_numeric is distinct from old.original_value_numeric
      or new.original_min_numeric is distinct from old.original_min_numeric
      or new.original_max_numeric is distinct from old.original_max_numeric
      or new.original_value_boolean is distinct from old.original_value_boolean
      or new.original_value_text is distinct from old.original_value_text
      or new.original_unit_code is distinct from old.original_unit_code
      or new.canonical_value_numeric is distinct from old.canonical_value_numeric
      or new.canonical_min_numeric is distinct from old.canonical_min_numeric
      or new.canonical_max_numeric is distinct from old.canonical_max_numeric
      or new.canonical_value_boolean is distinct from old.canonical_value_boolean
      or new.canonical_value_text is distinct from old.canonical_value_text
      or new.canonical_unit_code is distinct from old.canonical_unit_code
      or new.period_count is distinct from old.period_count
      or new.period_unit_code is distinct from old.period_unit_code
      or new.period_days_numeric is distinct from old.period_days_numeric
      or new.daily_equivalent_numeric is distinct from old.daily_equivalent_numeric
      or new.daily_equivalent_unit_code is distinct from old.daily_equivalent_unit_code
      or new.normalization_state_code is distinct from old.normalization_state_code
      or new.normalization_formula_version is distinct from old.normalization_formula_version
      or new.priority_code is distinct from old.priority_code
      or new.source_type_code is distinct from old.source_type_code
      or new.supersedes_target_version_id is distinct from old.supersedes_target_version_id
      or new.label is distinct from old.label
      or new.description is distinct from old.description
      or new.safety_note is distinct from old.safety_note
      or new.idempotency_key is distinct from old.idempotency_key
      or new.request_hash is distinct from old.request_hash
      or new.metadata_json is distinct from old.metadata_json
      or new.valid_from is distinct from old.valid_from
      or new.created_at is distinct from old.created_at
    ) then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_VERSION_IS_IMMUTABLE';
    end if;

    if old.status_code = 'draft'
       and new.status_code not in ('draft', 'active', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'P7_2_INVALID_DRAFT_STATUS_TRANSITION';
    elsif old.status_code = 'active'
       and new.status_code not in ('active', 'superseded', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'P7_2_INVALID_ACTIVE_STATUS_TRANSITION';
    elsif old.status_code in ('superseded', 'archived')
       and new.status_code is distinct from old.status_code then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TERMINAL_TARGET_STATUS_IS_IMMUTABLE';
    end if;

    if new.status_code in ('superseded', 'archived')
       and new.valid_to is null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TERMINAL_TARGET_REQUIRES_VALID_TO';
    end if;

    if new.status_code in ('draft', 'active')
       and new.valid_to is not null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_OPEN_TARGET_CANNOT_HAVE_VALID_TO';
    end if;

    return new;
  end if;

  select *
  into v_assignment
  from public.value_object_parameter_assignments assignment
  where assignment.id = new.parameter_assignment_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'P7_2_PARAMETER_ASSIGNMENT_NOT_FOUND';
  end if;

  if v_assignment.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'P7_2_PARAMETER_ASSIGNMENT_NOT_ACTIVE';
  end if;

  if v_assignment.owner_user_id is distinct from new.owner_user_id
     or v_assignment.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P7_2_TARGET_ASSIGNMENT_OWNER_MISMATCH';
  end if;

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id = v_assignment.value_object_id;

  if not found
     or v_value_object.node_role_code is distinct from 'activity_leaf'
     or v_value_object.object_kind is distinct from 'activity_pattern' then
    raise exception using
      errcode = '23514',
      message = 'P7_2_TARGET_REQUIRES_ACTIVITY_LEAF';
  end if;

  if v_value_object.owner_user_id is distinct from new.owner_user_id
     or v_value_object.owner_actor_id is distinct from new.owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'P7_2_TARGET_LEAF_OWNER_MISMATCH';
  end if;

  select *
  into v_definition
  from public.value_object_parameter_definitions definition
  where definition.id = v_assignment.parameter_definition_id;

  if not found or v_definition.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'P7_2_PARAMETER_DEFINITION_NOT_ACTIVE';
  end if;

  if v_definition.scope_code = 'actor'
     and (
       v_definition.owner_user_id is distinct from new.owner_user_id
       or v_definition.owner_actor_id is distinct from new.owner_actor_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'P7_2_TARGET_PARAMETER_OWNER_MISMATCH';
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
      message = 'P7_2_TARGET_ACTOR_NOT_OWNED_BY_USER';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    where profile.owner_user_id = new.owner_user_id
      and profile.actor_id = new.created_by_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'P7_2_TARGET_CREATOR_NOT_OWNED_BY_USER';
  end if;

  select *
  into v_target_kind
  from public.value_object_target_kinds target_kind
  where target_kind.target_kind_code = new.target_kind_code
    and target_kind.status = 'active';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'P7_2_TARGET_KIND_NOT_ACTIVE';
  end if;

  if new.normalization_policy_code is null then
    new.normalization_policy_code :=
      v_target_kind.default_normalization_policy_code;
  end if;

  select *
  into v_policy
  from public.value_object_normalization_policies policy
  where policy.normalization_policy_code = new.normalization_policy_code
    and policy.status = 'active';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'P7_2_NORMALIZATION_POLICY_NOT_ACTIVE';
  end if;

  if new.normalization_policy_code
       is distinct from v_target_kind.default_normalization_policy_code
     and new.normalization_policy_code <> 'custom_formula' then
    raise exception using
      errcode = '23514',
      message = 'P7_2_NORMALIZATION_POLICY_NOT_ALLOWED_FOR_KIND';
  end if;

  v_period_policy := v_target_kind.period_policy_code;
  v_numeric_shape := v_target_kind.numeric_shape_code;

  if v_period_policy = 'required'
     and (new.period_count is null or new.period_unit_code is null) then
    raise exception using
      errcode = '23514',
      message = 'P7_2_TARGET_PERIOD_REQUIRED';
  elsif v_period_policy = 'forbidden'
     and (new.period_count is not null or new.period_unit_code is not null) then
    raise exception using
      errcode = '23514',
      message = 'P7_2_TARGET_PERIOD_FORBIDDEN';
  end if;

  if new.period_unit_code in ('rolling_7_days', 'rolling_30_days')
     and new.period_count is distinct from 1 then
    raise exception using
      errcode = '23514',
      message = 'P7_2_ROLLING_PERIOD_COUNT_MUST_EQUAL_ONE';
  end if;

  if new.period_count is not null then
    new.period_days_numeric :=
      public.value_object_target_period_days_v1(
        new.period_count,
        new.period_unit_code
      );

    if new.period_days_numeric is null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_PERIOD_NOT_SUPPORTED';
    end if;
  else
    new.period_days_numeric := null;
  end if;

  if v_numeric_shape = 'single' then
    if v_definition.value_type_code <> 'numeric'
       or new.original_value_numeric is null
       or num_nonnulls(
         new.original_min_numeric,
         new.original_max_numeric,
         new.original_value_boolean,
         new.original_value_text
       ) <> 0
       or new.original_unit_code is null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_SINGLE_NUMERIC_TARGET_SHAPE_INVALID';
    end if;
  elsif v_numeric_shape = 'range' then
    if v_definition.value_type_code <> 'numeric'
       or new.original_min_numeric is null
       or new.original_max_numeric is null
       or new.original_min_numeric > new.original_max_numeric
       or num_nonnulls(
         new.original_value_numeric,
         new.original_value_boolean,
         new.original_value_text
       ) <> 0
       or new.original_unit_code is null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_RANGE_TARGET_SHAPE_INVALID';
    end if;
  elsif v_numeric_shape = 'boolean' then
    if v_definition.value_type_code <> 'boolean'
       or new.original_value_boolean is null
       or num_nonnulls(
         new.original_value_numeric,
         new.original_min_numeric,
         new.original_max_numeric,
         new.original_value_text,
         new.original_unit_code
       ) <> 0 then
      raise exception using
        errcode = '23514',
        message = 'P7_2_BOOLEAN_TARGET_SHAPE_INVALID';
    end if;
  elsif v_numeric_shape = 'text' then
    if v_definition.value_type_code <> 'text'
       or nullif(btrim(new.original_value_text), '') is null
       or num_nonnulls(
         new.original_value_numeric,
         new.original_min_numeric,
         new.original_max_numeric,
         new.original_value_boolean,
         new.original_unit_code
       ) <> 0 then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TEXT_TARGET_SHAPE_INVALID';
    end if;
  end if;

  if v_definition.value_type_code = 'numeric' then
    select exists (
      select 1
      from jsonb_array_elements_text(
        v_definition.allowed_unit_codes
      ) allowed_unit(unit_code)
      where allowed_unit.unit_code = new.original_unit_code
    )
    into v_allowed_unit;

    if not v_allowed_unit then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_UNIT_NOT_ALLOWED_FOR_PARAMETER';
    end if;

    if not v_definition.allow_negative
       and (
         coalesce(new.original_value_numeric < 0, false)
         or coalesce(new.original_min_numeric < 0, false)
         or coalesce(new.original_max_numeric < 0, false)
       ) then
      raise exception using
        errcode = '23514',
        message = 'P7_2_NEGATIVE_TARGET_NOT_ALLOWED';
    end if;

    new.canonical_value_numeric :=
      public.convert_value_object_unit_v1(
        v_definition.dimension_code,
        new.original_value_numeric,
        new.original_unit_code,
        v_definition.canonical_unit_code
      );

    new.canonical_min_numeric :=
      public.convert_value_object_unit_v1(
        v_definition.dimension_code,
        new.original_min_numeric,
        new.original_unit_code,
        v_definition.canonical_unit_code
      );

    new.canonical_max_numeric :=
      public.convert_value_object_unit_v1(
        v_definition.dimension_code,
        new.original_max_numeric,
        new.original_unit_code,
        v_definition.canonical_unit_code
      );

    new.canonical_unit_code := v_definition.canonical_unit_code;
    new.canonical_value_boolean := null;
    new.canonical_value_text := null;
  elsif v_definition.value_type_code = 'boolean' then
    new.canonical_value_boolean := new.original_value_boolean;
    new.canonical_value_text := null;
    new.canonical_value_numeric := null;
    new.canonical_min_numeric := null;
    new.canonical_max_numeric := null;
    new.canonical_unit_code := v_definition.canonical_unit_code;
  elsif v_definition.value_type_code = 'text' then
    new.canonical_value_text := btrim(new.original_value_text);
    new.canonical_value_boolean := null;
    new.canonical_value_numeric := null;
    new.canonical_min_numeric := null;
    new.canonical_max_numeric := null;
    new.canonical_unit_code := v_definition.canonical_unit_code;
  else
    raise exception using
      errcode = '23514',
      message = 'P7_2_TIMESTAMP_TARGETS_NOT_SUPPORTED';
  end if;

  if new.normalization_policy_code in ('linear_rate', 'cadence_rate') then
    if new.canonical_value_numeric is null
       or new.period_days_numeric is null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_DAILY_NORMALIZATION_REQUIRES_NUMERIC_PERIOD_TARGET';
    end if;

    new.daily_equivalent_numeric :=
      new.canonical_value_numeric / new.period_days_numeric;
    new.daily_equivalent_unit_code := new.canonical_unit_code;
    new.normalization_state_code := 'derived';
    new.normalization_formula_version :=
      coalesce(v_policy.formula_version, 'daily-rate-v1');
  elsif new.normalization_policy_code = 'custom_formula' then
    new.daily_equivalent_numeric := null;
    new.daily_equivalent_unit_code := null;
    new.normalization_state_code := 'formula_required';
    new.normalization_formula_version := null;
  else
    new.daily_equivalent_numeric := null;
    new.daily_equivalent_unit_code := null;
    new.normalization_state_code := 'not_applicable';
    new.normalization_formula_version := v_policy.formula_version;
  end if;

  select latest.*
  into v_latest
  from public.value_object_target_standard_versions latest
  where latest.target_series_id = new.target_series_id
  order by latest.version desc
  limit 1;

  v_has_latest := found;

  if not v_has_latest then
    if new.version <> 1
       or new.supersedes_target_version_id is not null then
      raise exception using
        errcode = '23514',
        message = 'P7_2_FIRST_TARGET_VERSION_MUST_BE_VERSION_ONE';
    end if;
  else
    if new.parameter_assignment_id
         is distinct from v_latest.parameter_assignment_id
       or new.target_kind_code
         is distinct from v_latest.target_kind_code
       or new.owner_user_id
         is distinct from v_latest.owner_user_id
       or new.owner_actor_id
         is distinct from v_latest.owner_actor_id then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_SERIES_IDENTITY_CHANGE_FORBIDDEN';
    end if;

    if new.version <> v_latest.version + 1
       or new.supersedes_target_version_id
         is distinct from v_latest.id then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_VERSION_SEQUENCE_INVALID';
    end if;
  end if;

  if new.status_code in ('superseded', 'archived') then
    raise exception using
      errcode = '23514',
      message = 'P7_2_NEW_TARGET_VERSION_MUST_BE_OPEN';
  end if;

  new.valid_to := null;

  return new;
end;
$function$;

create trigger value_object_target_standard_versions_guard_v2_trg
before insert or update
on public.value_object_target_standard_versions
for each row
execute function public.enforce_value_object_target_standard_v2();

create or replace function public.save_value_object_target_standard_v2(
  p_owner_user_id uuid,
  p_owner_actor_id uuid,
  p_created_by_actor_id uuid,
  p_mode text,
  p_payload jsonb,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_existing public.value_object_target_standard_versions%rowtype;
  v_previous public.value_object_target_standard_versions%rowtype;
  v_inserted public.value_object_target_standard_versions%rowtype;

  v_series_id uuid;
  v_assignment_id uuid;
  v_target_kind_code text;
  v_normalization_policy_code text;
  v_version integer;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'P7_2_TARGET_PAYLOAD_MUST_BE_OBJECT';
  end if;

  if p_mode not in ('create_series', 'new_version', 'archive') then
    raise exception using
      errcode = '22023',
      message = 'P7_2_TARGET_MODE_INVALID';
  end if;

  if p_mode in ('create_series', 'new_version')
     and (
       nullif(btrim(p_idempotency_key), '') is null
       or nullif(btrim(p_request_hash), '') is null
     ) then
    raise exception using
      errcode = '22023',
      message = 'P7_2_TARGET_IDEMPOTENCY_REQUIRED';
  end if;

  if p_idempotency_key is not null then
    select *
    into v_existing
    from public.value_object_target_standard_versions target
    where target.owner_user_id = p_owner_user_id
      and target.owner_actor_id = p_owner_actor_id
      and target.idempotency_key = p_idempotency_key;

    if found then
      if v_existing.request_hash is distinct from p_request_hash then
        raise exception using
          errcode = '23505',
          message = 'P7_2_TARGET_IDEMPOTENCY_PAYLOAD_MISMATCH';
      end if;

      return jsonb_build_object(
        'idempotentReplay', true,
        'target', to_jsonb(v_existing)
      );
    end if;
  end if;

  if p_mode = 'archive' then
    v_series_id := nullif(p_payload ->> 'targetSeriesId', '')::uuid;

    if v_series_id is null then
      raise exception using
        errcode = '22023',
        message = 'P7_2_TARGET_SERIES_ID_REQUIRED';
    end if;

    select *
    into v_previous
    from public.value_object_target_standard_versions target
    where target.target_series_id = v_series_id
      and target.owner_user_id = p_owner_user_id
      and target.owner_actor_id = p_owner_actor_id
      and target.status_code = 'active'
    for update;

    if not found then
      select *
      into v_previous
      from public.value_object_target_standard_versions target
      where target.target_series_id = v_series_id
        and target.owner_user_id = p_owner_user_id
        and target.owner_actor_id = p_owner_actor_id
        and target.status_code = 'archived'
      order by target.version desc
      limit 1;

      if found then
        return jsonb_build_object(
          'idempotentReplay', true,
          'target', to_jsonb(v_previous)
        );
      end if;

      raise exception using
        errcode = 'P0002',
        message = 'P7_2_ACTIVE_TARGET_SERIES_NOT_FOUND';
    end if;

    update public.value_object_target_standard_versions
    set
      status_code = 'archived',
      valid_to = now(),
      updated_at = now()
    where id = v_previous.id
    returning * into v_previous;

    return jsonb_build_object(
      'idempotentReplay', false,
      'target', to_jsonb(v_previous)
    );
  end if;

  v_assignment_id :=
    nullif(p_payload ->> 'parameterAssignmentId', '')::uuid;
  v_target_kind_code :=
    nullif(btrim(p_payload ->> 'targetKindCode'), '');
  v_normalization_policy_code :=
    nullif(btrim(p_payload ->> 'normalizationPolicyCode'), '');

  if v_assignment_id is null or v_target_kind_code is null then
    raise exception using
      errcode = '22023',
      message = 'P7_2_TARGET_ASSIGNMENT_AND_KIND_REQUIRED';
  end if;

  if p_mode = 'create_series' then
    v_series_id := coalesce(
      nullif(p_payload ->> 'targetSeriesId', '')::uuid,
      gen_random_uuid()
    );
    v_version := 1;
  else
    v_series_id := nullif(p_payload ->> 'targetSeriesId', '')::uuid;

    if v_series_id is null then
      raise exception using
        errcode = '22023',
        message = 'P7_2_TARGET_SERIES_ID_REQUIRED';
    end if;

    select *
    into v_previous
    from public.value_object_target_standard_versions target
    where target.target_series_id = v_series_id
      and target.owner_user_id = p_owner_user_id
      and target.owner_actor_id = p_owner_actor_id
      and target.status_code = 'active'
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'P7_2_ACTIVE_TARGET_VERSION_NOT_FOUND';
    end if;

    if v_previous.parameter_assignment_id is distinct from v_assignment_id
       or v_previous.target_kind_code is distinct from v_target_kind_code then
      raise exception using
        errcode = '23514',
        message = 'P7_2_TARGET_SERIES_IDENTITY_CHANGE_FORBIDDEN';
    end if;

    update public.value_object_target_standard_versions
    set
      status_code = 'superseded',
      valid_to = now(),
      updated_at = now()
    where id = v_previous.id;

    v_version := v_previous.version + 1;
  end if;

  insert into public.value_object_target_standard_versions (
    target_series_id,
    version,
    parameter_assignment_id,
    owner_user_id,
    owner_actor_id,
    created_by_actor_id,
    target_kind_code,
    normalization_policy_code,

    original_value_numeric,
    original_min_numeric,
    original_max_numeric,
    original_value_boolean,
    original_value_text,
    original_unit_code,

    period_count,
    period_unit_code,

    priority_code,
    source_type_code,
    status_code,
    supersedes_target_version_id,

    label,
    description,
    safety_note,

    idempotency_key,
    request_hash,
    metadata_json
  )
  values (
    v_series_id,
    v_version,
    v_assignment_id,
    p_owner_user_id,
    p_owner_actor_id,
    p_created_by_actor_id,
    v_target_kind_code,
    v_normalization_policy_code,

    nullif(p_payload ->> 'originalValueNumeric', '')::numeric,
    nullif(p_payload ->> 'originalMinNumeric', '')::numeric,
    nullif(p_payload ->> 'originalMaxNumeric', '')::numeric,
    case
      when p_payload ? 'originalValueBoolean'
        then (p_payload ->> 'originalValueBoolean')::boolean
      else null
    end,
    nullif(p_payload ->> 'originalValueText', ''),
    nullif(btrim(p_payload ->> 'originalUnitCode'), ''),

    nullif(p_payload ->> 'periodCount', '')::numeric,
    nullif(btrim(p_payload ->> 'periodUnitCode'), ''),

    coalesce(nullif(p_payload ->> 'priorityCode', ''), 'normal'),
    coalesce(nullif(p_payload ->> 'sourceTypeCode', ''), 'user_defined'),
    coalesce(nullif(p_payload ->> 'statusCode', ''), 'active'),
    case
      when p_mode = 'new_version' then v_previous.id
      else null
    end,

    nullif(p_payload ->> 'label', ''),
    nullif(p_payload ->> 'description', ''),
    nullif(p_payload ->> 'safetyNote', ''),

    p_idempotency_key,
    p_request_hash,
    coalesce(p_payload -> 'metadata', '{}'::jsonb)
  )
  returning * into v_inserted;

  return jsonb_build_object(
    'idempotentReplay', false,
    'target', to_jsonb(v_inserted)
  );
end;
$function$;

create view public.value_object_target_standard_versions_read_v2
with (security_invoker = false)
as
select
  target.id,
  target.target_series_id,
  target.version,
  target.status_code,

  target.parameter_assignment_id,
  assignment.value_object_id,
  assignment.parameter_definition_id,

  definition.parameter_code,
  definition.title as parameter_title,
  definition.dimension_code,
  definition.value_type_code,
  definition.canonical_unit_code as parameter_canonical_unit_code,

  value_object.title as value_object_title,
  value_object.root_value_object_id,
  value_object.parent_value_object_id,
  value_object.branch_type_code,

  target.target_kind_code,
  target.normalization_policy_code,

  target.original_value_numeric,
  target.original_min_numeric,
  target.original_max_numeric,
  target.original_value_boolean,
  target.original_value_text,
  target.original_unit_code,

  target.canonical_value_numeric,
  target.canonical_min_numeric,
  target.canonical_max_numeric,
  target.canonical_value_boolean,
  target.canonical_value_text,
  target.canonical_unit_code,

  target.period_count,
  target.period_unit_code,
  target.period_days_numeric,

  target.daily_equivalent_numeric,
  target.daily_equivalent_unit_code,
  target.normalization_state_code,
  target.normalization_formula_version,

  target.priority_code,
  target.source_type_code,
  target.label,
  target.description,
  target.safety_note,

  target.owner_user_id,
  target.owner_actor_id,
  target.created_by_actor_id,

  target.supersedes_target_version_id,
  target.valid_from,
  target.valid_to,
  target.created_at,
  target.updated_at,
  target.metadata_json
from public.value_object_target_standard_versions target
join public.value_object_parameter_assignments assignment
  on assignment.id = target.parameter_assignment_id
join public.value_object_parameter_definitions definition
  on definition.id = assignment.parameter_definition_id
join public.value_objects value_object
  on value_object.id = assignment.value_object_id;

do $updated_at$
begin
  if to_regprocedure('public.set_reality_model_v3_updated_at()') is null then
    raise exception using
      errcode = '42883',
      message = 'P7_2_UPDATED_AT_FUNCTION_REQUIRED';
  end if;
end;
$updated_at$;

create trigger value_object_unit_conversions_updated_at_v2_trg
before update on public.value_object_unit_conversions
for each row execute function public.set_reality_model_v3_updated_at();

create trigger value_object_target_standard_versions_updated_at_v2_trg
before update on public.value_object_target_standard_versions
for each row execute function public.set_reality_model_v3_updated_at();

alter table public.value_object_unit_conversions enable row level security;
alter table public.value_object_target_standard_versions enable row level security;

revoke all on public.value_object_unit_conversions
  from public, anon, authenticated;
revoke all on public.value_object_target_standard_versions
  from public, anon, authenticated;
revoke all on public.value_object_target_standard_versions_read_v2
  from public, anon, authenticated;

grant select, insert, update, delete
  on public.value_object_unit_conversions
  to service_role;

grant select, insert, update, delete
  on public.value_object_target_standard_versions
  to service_role;

grant select
  on public.value_object_target_standard_versions_read_v2
  to service_role;

revoke execute
  on function public.value_object_target_period_days_v1(numeric, text)
  from public, anon, authenticated;

revoke execute
  on function public.convert_value_object_unit_v1(
    text,
    numeric,
    text,
    text
  )
  from public, anon, authenticated;

revoke execute
  on function public.enforce_value_object_target_standard_v2()
  from public, anon, authenticated;

revoke execute
  on function public.save_value_object_target_standard_v2(
    uuid,
    uuid,
    uuid,
    text,
    jsonb,
    text,
    text
  )
  from public, anon, authenticated;

grant execute
  on function public.value_object_target_period_days_v1(numeric, text)
  to service_role;

grant execute
  on function public.convert_value_object_unit_v1(
    text,
    numeric,
    text,
    text
  )
  to service_role;

grant execute
  on function public.enforce_value_object_target_standard_v2()
  to service_role;

grant execute
  on function public.save_value_object_target_standard_v2(
    uuid,
    uuid,
    uuid,
    text,
    jsonb,
    text,
    text
  )
  to service_role;

comment on table public.value_object_target_standard_versions is
  'P7.2 versioned target standards linked to actor-owned activity_leaf parameter assignments. Original target values and periods remain authoritative; daily values are derived analytical fields.';

comment on table public.value_object_unit_conversions is
  'Reviewed linear unit conversions used by P7 targets and reusable by later fact normalization. No currency FX conversion is performed.';

comment on view public.value_object_target_standard_versions_read_v2 is
  'Server-only P7.2 read model joining target versions to their exact parameter assignment, definition and leaf.';

commit;