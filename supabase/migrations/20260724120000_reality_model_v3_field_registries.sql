/*
ARCTor.app — Reality Model v3 / P5 field lock and registries

Scope:
- add additive canonical Value Object lifecycle/privacy fields;
- create system-governed registries for typed attributes, criteria,
  semantic relation types, target kinds and normalization policies;
- create actor-aligned typed profile attributes and outcome criteria;
- keep semantic relation rows, parameter assignments and v3 target-standard
  writes deferred to P7/P9;
- preserve existing legacy commercial columns and routes.

This migration does not create root presets, facts, analysis objects, scores,
indices or hidden AI writes.
*/

begin;

do $$
begin
  if to_regclass('public.value_objects') is null then
    raise exception using
      errcode = '42P01',
      message = 'REALITY_V3_P5_VALUE_OBJECTS_TABLE_REQUIRED';
  end if;

  if to_regclass('public.actor_public_profiles') is null then
    raise exception using
      errcode = '42P01',
      message = 'REALITY_V3_P5_ACTOR_PUBLIC_PROFILES_REQUIRED';
  end if;

  if to_regclass('public.value_object_branch_types') is null then
    raise exception using
      errcode = '42P01',
      message = 'REALITY_V3_P5_BRANCH_TYPE_REGISTRY_REQUIRED';
  end if;
end;
$$;

alter table public.value_objects
  add column if not exists valid_from timestamptz,
  add column if not exists valid_to timestamptz,
  add column if not exists privacy_level text not null default 'private',
  add column if not exists sensitivity_level text not null default 'standard',
  add column if not exists identity_attributes_json jsonb not null default '{}'::jsonb,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

comment on column public.value_objects.valid_from is
  'Reality Model v3 object existence interval. It is not an analytics window.';
comment on column public.value_objects.valid_to is
  'Reality Model v3 object existence interval. It is not an analytics window.';
comment on column public.value_objects.privacy_level is
  'Canonical object privacy level. Owner access remains governed by owner_user_id and owner_actor_id.';
comment on column public.value_objects.sensitivity_level is
  'Sensitivity classification independent from object visibility.';
comment on column public.value_objects.identity_attributes_json is
  'Stable identity attributes only. Branch-specific fields belong in value_object_profile_attributes.';
comment on column public.value_objects.metadata_json is
  'Non-canonical supplemental metadata. Canonical fields must not be hidden here.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_valid_interval_v3_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_valid_interval_v3_check
      check (valid_to is null or valid_from is null or valid_to >= valid_from);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_privacy_level_v3_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_privacy_level_v3_check
      check (privacy_level in ('private', 'shared', 'public'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_sensitivity_level_v3_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_sensitivity_level_v3_check
      check (sensitivity_level in ('standard', 'sensitive', 'restricted'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_identity_attributes_json_v3_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_identity_attributes_json_v3_check
      check (jsonb_typeof(identity_attributes_json) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.value_objects'::regclass
      and conname = 'value_objects_metadata_json_v3_check'
  ) then
    alter table public.value_objects
      add constraint value_objects_metadata_json_v3_check
      check (jsonb_typeof(metadata_json) = 'object');
  end if;
end;
$$;

create index if not exists idx_value_objects_owner_actor_root_v3
  on public.value_objects(owner_user_id, owner_actor_id, root_value_object_id)
  where root_value_object_id is not null;

create index if not exists idx_value_objects_owner_actor_parent_v3
  on public.value_objects(owner_user_id, owner_actor_id, parent_value_object_id)
  where parent_value_object_id is not null;

create or replace function public.set_reality_model_v3_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

revoke execute on function public.set_reality_model_v3_updated_at()
  from public, anon, authenticated;
grant execute on function public.set_reality_model_v3_updated_at()
  to service_role;

create table if not exists public.value_object_attribute_registry (
  attribute_code text primary key,
  title_key text not null,
  description_key text not null,
  value_type_code text not null,
  applicable_branch_type_codes jsonb not null default '[]'::jsonb,
  applicable_node_role_codes jsonb not null default '[]'::jsonb,
  applicable_object_kinds jsonb not null default '[]'::jsonb,
  validation_json jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  display_order integer not null default 1000,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint value_object_attribute_registry_code_v3_check
    check (attribute_code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint value_object_attribute_registry_value_type_v3_check
    check (value_type_code in ('numeric', 'text', 'boolean', 'date', 'datetime', 'json')),
  constraint value_object_attribute_registry_applicable_branches_v3_check
    check (jsonb_typeof(applicable_branch_type_codes) = 'array'),
  constraint value_object_attribute_registry_applicable_roles_v3_check
    check (jsonb_typeof(applicable_node_role_codes) = 'array'),
  constraint value_object_attribute_registry_applicable_kinds_v3_check
    check (jsonb_typeof(applicable_object_kinds) = 'array'),
  constraint value_object_attribute_registry_validation_v3_check
    check (jsonb_typeof(validation_json) = 'object'),
  constraint value_object_attribute_registry_version_v3_check
    check (version > 0),
  constraint value_object_attribute_registry_display_order_v3_check
    check (display_order > 0),
  constraint value_object_attribute_registry_status_v3_check
    check (status in ('active', 'inactive'))
);

comment on table public.value_object_attribute_registry is
  'System-governed registry of allowed typed Value Object attributes. Arbitrary field codes are forbidden.';

create table if not exists public.value_object_criterion_types (
  criterion_type_code text primary key,
  title_key text not null,
  description_key text not null,
  display_order integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint value_object_criterion_types_code_v3_check
    check (criterion_type_code in ('success', 'failure')),
  constraint value_object_criterion_types_display_order_v3_check
    check (display_order > 0),
  constraint value_object_criterion_types_status_v3_check
    check (status in ('active', 'inactive')),
  constraint value_object_criterion_types_display_order_v3_key
    unique (display_order)
);

insert into public.value_object_criterion_types (
  criterion_type_code,
  title_key,
  description_key,
  display_order,
  status
)
values
  ('success', 'valueObject.criterion.success.title', 'valueObject.criterion.success.description', 10, 'active'),
  ('failure', 'valueObject.criterion.failure.title', 'valueObject.criterion.failure.description', 20, 'active')
on conflict (criterion_type_code) do update
set
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  display_order = excluded.display_order,
  status = excluded.status,
  updated_at = now();

create table if not exists public.value_object_criterion_comparators (
  comparator_code text primary key,
  value_domain_code text not null,
  title_key text not null,
  description_key text not null,
  display_order integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint value_object_criterion_comparators_code_v3_check
    check (comparator_code in ('lt', 'lte', 'eq', 'gte', 'gt', 'between', 'is_true', 'is_false')),
  constraint value_object_criterion_comparators_domain_v3_check
    check (value_domain_code in ('numeric', 'boolean')),
  constraint value_object_criterion_comparators_display_order_v3_check
    check (display_order > 0),
  constraint value_object_criterion_comparators_status_v3_check
    check (status in ('active', 'inactive')),
  constraint value_object_criterion_comparators_display_order_v3_key
    unique (display_order)
);

insert into public.value_object_criterion_comparators (
  comparator_code,
  value_domain_code,
  title_key,
  description_key,
  display_order,
  status
)
values
  ('lt', 'numeric', 'valueObject.comparator.lt.title', 'valueObject.comparator.lt.description', 10, 'active'),
  ('lte', 'numeric', 'valueObject.comparator.lte.title', 'valueObject.comparator.lte.description', 20, 'active'),
  ('eq', 'numeric', 'valueObject.comparator.eq.title', 'valueObject.comparator.eq.description', 30, 'active'),
  ('gte', 'numeric', 'valueObject.comparator.gte.title', 'valueObject.comparator.gte.description', 40, 'active'),
  ('gt', 'numeric', 'valueObject.comparator.gt.title', 'valueObject.comparator.gt.description', 50, 'active'),
  ('between', 'numeric', 'valueObject.comparator.between.title', 'valueObject.comparator.between.description', 60, 'active'),
  ('is_true', 'boolean', 'valueObject.comparator.isTrue.title', 'valueObject.comparator.isTrue.description', 70, 'active'),
  ('is_false', 'boolean', 'valueObject.comparator.isFalse.title', 'valueObject.comparator.isFalse.description', 80, 'active')
on conflict (comparator_code) do update
set
  value_domain_code = excluded.value_domain_code,
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  display_order = excluded.display_order,
  status = excluded.status,
  updated_at = now();

create table if not exists public.value_object_relation_types (
  relation_type_code text primary key,
  directionality_code text not null,
  from_scope_code text not null default 'ordinary',
  to_scope_code text not null default 'ordinary',
  title_key text not null,
  description_key text not null,
  display_order integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint value_object_relation_types_code_v3_check
    check (relation_type_code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint value_object_relation_types_direction_v3_check
    check (directionality_code in ('directed', 'symmetric')),
  constraint value_object_relation_types_from_scope_v3_check
    check (from_scope_code in ('ordinary', 'analysis', 'both')),
  constraint value_object_relation_types_to_scope_v3_check
    check (to_scope_code in ('ordinary', 'analysis', 'both')),
  constraint value_object_relation_types_display_order_v3_check
    check (display_order > 0),
  constraint value_object_relation_types_status_v3_check
    check (status in ('active', 'inactive', 'future')),
  constraint value_object_relation_types_display_order_v3_key
    unique (display_order)
);

insert into public.value_object_relation_types (
  relation_type_code,
  directionality_code,
  from_scope_code,
  to_scope_code,
  title_key,
  description_key,
  display_order,
  status
)
values
  ('supports', 'directed', 'ordinary', 'ordinary', 'valueObject.relation.supports.title', 'valueObject.relation.supports.description', 10, 'active'),
  ('depends_on', 'directed', 'ordinary', 'ordinary', 'valueObject.relation.dependsOn.title', 'valueObject.relation.dependsOn.description', 20, 'active'),
  ('prerequisite_for', 'directed', 'ordinary', 'ordinary', 'valueObject.relation.prerequisiteFor.title', 'valueObject.relation.prerequisiteFor.description', 30, 'active'),
  ('conflicts_with', 'symmetric', 'ordinary', 'ordinary', 'valueObject.relation.conflictsWith.title', 'valueObject.relation.conflictsWith.description', 40, 'active'),
  ('associated_with', 'symmetric', 'ordinary', 'ordinary', 'valueObject.relation.associatedWith.title', 'valueObject.relation.associatedWith.description', 50, 'active'),
  ('influenced_by', 'directed', 'ordinary', 'ordinary', 'valueObject.relation.influencedBy.title', 'valueObject.relation.influencedBy.description', 60, 'active'),
  ('threatens', 'directed', 'analysis', 'ordinary', 'valueObject.relation.threatens.title', 'valueObject.relation.threatens.description', 70, 'future'),
  ('opportunity_for', 'directed', 'analysis', 'ordinary', 'valueObject.relation.opportunityFor.title', 'valueObject.relation.opportunityFor.description', 80, 'future'),
  ('indicated_by', 'directed', 'both', 'both', 'valueObject.relation.indicatedBy.title', 'valueObject.relation.indicatedBy.description', 90, 'future')
on conflict (relation_type_code) do update
set
  directionality_code = excluded.directionality_code,
  from_scope_code = excluded.from_scope_code,
  to_scope_code = excluded.to_scope_code,
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  display_order = excluded.display_order,
  status = excluded.status,
  updated_at = now();

create table if not exists public.value_object_target_kinds (
  target_kind_code text primary key,
  numeric_shape_code text not null,
  period_policy_code text not null,
  default_normalization_policy_code text not null,
  title_key text not null,
  description_key text not null,
  display_order integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint value_object_target_kinds_code_v3_check
    check (target_kind_code in (
      'amount_per_period',
      'count_per_period',
      'point_value',
      'range',
      'threshold_min',
      'threshold_max',
      'boolean_condition',
      'qualitative_criterion'
    )),
  constraint value_object_target_kinds_numeric_shape_v3_check
    check (numeric_shape_code in ('single', 'range', 'boolean', 'text')),
  constraint value_object_target_kinds_period_policy_v3_check
    check (period_policy_code in ('required', 'optional', 'forbidden')),
  constraint value_object_target_kinds_normalization_v3_check
    check (default_normalization_policy_code in (
      'linear_rate',
      'cadence_rate',
      'no_daily_division',
      'custom_formula'
    )),
  constraint value_object_target_kinds_display_order_v3_check
    check (display_order > 0),
  constraint value_object_target_kinds_status_v3_check
    check (status in ('active', 'inactive')),
  constraint value_object_target_kinds_display_order_v3_key
    unique (display_order)
);

insert into public.value_object_target_kinds (
  target_kind_code,
  numeric_shape_code,
  period_policy_code,
  default_normalization_policy_code,
  title_key,
  description_key,
  display_order,
  status
)
values
  ('amount_per_period', 'single', 'required', 'linear_rate', 'valueObject.targetKind.amountPerPeriod.title', 'valueObject.targetKind.amountPerPeriod.description', 10, 'active'),
  ('count_per_period', 'single', 'required', 'cadence_rate', 'valueObject.targetKind.countPerPeriod.title', 'valueObject.targetKind.countPerPeriod.description', 20, 'active'),
  ('point_value', 'single', 'forbidden', 'no_daily_division', 'valueObject.targetKind.pointValue.title', 'valueObject.targetKind.pointValue.description', 30, 'active'),
  ('range', 'range', 'optional', 'no_daily_division', 'valueObject.targetKind.range.title', 'valueObject.targetKind.range.description', 40, 'active'),
  ('threshold_min', 'single', 'optional', 'no_daily_division', 'valueObject.targetKind.thresholdMin.title', 'valueObject.targetKind.thresholdMin.description', 50, 'active'),
  ('threshold_max', 'single', 'optional', 'no_daily_division', 'valueObject.targetKind.thresholdMax.title', 'valueObject.targetKind.thresholdMax.description', 60, 'active'),
  ('boolean_condition', 'boolean', 'forbidden', 'no_daily_division', 'valueObject.targetKind.booleanCondition.title', 'valueObject.targetKind.booleanCondition.description', 70, 'active'),
  ('qualitative_criterion', 'text', 'forbidden', 'no_daily_division', 'valueObject.targetKind.qualitativeCriterion.title', 'valueObject.targetKind.qualitativeCriterion.description', 80, 'active')
on conflict (target_kind_code) do update
set
  numeric_shape_code = excluded.numeric_shape_code,
  period_policy_code = excluded.period_policy_code,
  default_normalization_policy_code = excluded.default_normalization_policy_code,
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  display_order = excluded.display_order,
  status = excluded.status,
  updated_at = now();

create table if not exists public.value_object_normalization_policies (
  normalization_policy_code text primary key,
  requires_period boolean not null,
  formula_version text,
  title_key text not null,
  description_key text not null,
  display_order integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint value_object_normalization_policies_code_v3_check
    check (normalization_policy_code in (
      'linear_rate',
      'cadence_rate',
      'no_daily_division',
      'custom_formula'
    )),
  constraint value_object_normalization_policies_display_order_v3_check
    check (display_order > 0),
  constraint value_object_normalization_policies_status_v3_check
    check (status in ('active', 'inactive')),
  constraint value_object_normalization_policies_display_order_v3_key
    unique (display_order)
);

insert into public.value_object_normalization_policies (
  normalization_policy_code,
  requires_period,
  formula_version,
  title_key,
  description_key,
  display_order,
  status
)
values
  ('linear_rate', true, 'daily-rate-v1', 'valueObject.normalization.linearRate.title', 'valueObject.normalization.linearRate.description', 10, 'active'),
  ('cadence_rate', true, 'daily-rate-v1', 'valueObject.normalization.cadenceRate.title', 'valueObject.normalization.cadenceRate.description', 20, 'active'),
  ('no_daily_division', false, null, 'valueObject.normalization.noDailyDivision.title', 'valueObject.normalization.noDailyDivision.description', 30, 'active'),
  ('custom_formula', false, null, 'valueObject.normalization.customFormula.title', 'valueObject.normalization.customFormula.description', 40, 'active')
on conflict (normalization_policy_code) do update
set
  requires_period = excluded.requires_period,
  formula_version = excluded.formula_version,
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  display_order = excluded.display_order,
  status = excluded.status,
  updated_at = now();

create table if not exists public.value_object_profile_attributes (
  id uuid primary key default gen_random_uuid(),
  value_object_id uuid not null references public.value_objects(id) on delete cascade,
  attribute_code text not null references public.value_object_attribute_registry(attribute_code) on update restrict on delete restrict,
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null references public.actors(id) on delete cascade,
  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  value_numeric numeric,
  value_text text,
  value_boolean boolean,
  value_date date,
  value_datetime timestamptz,
  value_json jsonb,
  source_type text not null default 'user_defined',
  status text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint value_object_profile_attributes_single_value_v3_check
    check (num_nonnulls(value_numeric, value_text, value_boolean, value_date, value_datetime, value_json) = 1),
  constraint value_object_profile_attributes_json_v3_check
    check (value_json is null or jsonb_typeof(value_json) in ('object', 'array')),
  constraint value_object_profile_attributes_source_v3_check
    check (source_type in ('user_defined', 'system_default', 'imported', 'ai_candidate')),
  constraint value_object_profile_attributes_status_v3_check
    check (status in ('draft', 'active', 'retired')),
  constraint value_object_profile_attributes_metadata_v3_check
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint value_object_profile_attributes_value_object_attribute_v3_key
    unique (value_object_id, attribute_code)
);

comment on table public.value_object_profile_attributes is
  'Typed branch-dependent Value Object attributes. These rows are not activity measures or facts.';

create table if not exists public.value_object_outcome_criteria (
  id uuid primary key default gen_random_uuid(),
  value_object_id uuid not null references public.value_objects(id) on delete cascade,
  owner_user_id uuid not null references public.app_users(id) on delete cascade,
  owner_actor_id uuid not null references public.actors(id) on delete cascade,
  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  criterion_type_code text not null references public.value_object_criterion_types(criterion_type_code) on update restrict on delete restrict,
  value_kind_code text not null,
  title text not null,
  description text,
  parameter_code text,
  comparator_code text references public.value_object_criterion_comparators(comparator_code) on update restrict on delete restrict,
  target_value_numeric numeric,
  target_min_numeric numeric,
  target_max_numeric numeric,
  target_value_text text,
  target_value_boolean boolean,
  canonical_unit text,
  status text not null default 'draft',
  source_type text not null default 'user_defined',
  valid_from timestamptz,
  valid_to timestamptz,
  evidence_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint value_object_outcome_criteria_kind_v3_check
    check (value_kind_code in ('qualitative', 'parameter_threshold', 'boolean_condition')),
  constraint value_object_outcome_criteria_title_v3_check
    check (char_length(btrim(title)) between 1 and 200),
  constraint value_object_outcome_criteria_description_v3_check
    check (description is null or char_length(description) <= 4000),
  constraint value_object_outcome_criteria_status_v3_check
    check (status in ('draft', 'active', 'retired')),
  constraint value_object_outcome_criteria_source_v3_check
    check (source_type in ('user_defined', 'ai_candidate', 'imported')),
  constraint value_object_outcome_criteria_valid_interval_v3_check
    check (valid_to is null or valid_from is null or valid_to >= valid_from),
  constraint value_object_outcome_criteria_evidence_v3_check
    check (jsonb_typeof(evidence_json) = 'object'),
  constraint value_object_outcome_criteria_metadata_v3_check
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint value_object_outcome_criteria_shape_v3_check
    check (
      (
        value_kind_code = 'qualitative'
        and target_value_text is not null
        and parameter_code is null
        and comparator_code is null
        and target_value_numeric is null
        and target_min_numeric is null
        and target_max_numeric is null
        and target_value_boolean is null
        and canonical_unit is null
      )
      or
      (
        value_kind_code = 'parameter_threshold'
        and parameter_code is not null
        and comparator_code in ('lt', 'lte', 'eq', 'gte', 'gt', 'between')
        and target_value_text is null
        and target_value_boolean is null
        and (
          (
            comparator_code = 'between'
            and target_value_numeric is null
            and target_min_numeric is not null
            and target_max_numeric is not null
            and target_min_numeric <= target_max_numeric
          )
          or
          (
            comparator_code <> 'between'
            and target_value_numeric is not null
            and target_min_numeric is null
            and target_max_numeric is null
          )
        )
      )
      or
      (
        value_kind_code = 'boolean_condition'
        and parameter_code is not null
        and (
          (comparator_code = 'is_true' and target_value_boolean is true)
          or
          (comparator_code = 'is_false' and target_value_boolean is false)
        )
        and target_value_numeric is null
        and target_min_numeric is null
        and target_max_numeric is null
        and target_value_text is null
        and canonical_unit is null
      )
    )
);

comment on table public.value_object_outcome_criteria is
  'Draft/confirmed success or failure criteria. A criterion is not an automatically proven fact or diagnosis.';

create or replace function public.enforce_value_object_profile_attribute_contract_v3()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_attribute public.value_object_attribute_registry%rowtype;
  v_value_object public.value_objects%rowtype;
begin
  select *
  into v_attribute
  from public.value_object_attribute_registry attribute
  where attribute.attribute_code = new.attribute_code
    and attribute.status = 'active';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'REALITY_V3_P5_ATTRIBUTE_CODE_NOT_ACTIVE';
  end if;

  select *
  into v_value_object
  from public.value_objects value_object
  where value_object.id = new.value_object_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'REALITY_V3_P5_VALUE_OBJECT_NOT_FOUND';
  end if;

  if v_value_object.object_kind is null
     or v_value_object.node_role_code is null
     or v_value_object.branch_type_code is null then
    raise exception using
      errcode = '23514',
      message = 'REALITY_V3_P5_ATTRIBUTE_REQUIRES_COMPLETE_TREE_OBJECT';
  end if;

  if jsonb_array_length(v_attribute.applicable_branch_type_codes) > 0
     and not (v_attribute.applicable_branch_type_codes ? v_value_object.branch_type_code) then
    raise exception using
      errcode = '23514',
      message = 'REALITY_V3_P5_ATTRIBUTE_BRANCH_NOT_APPLICABLE';
  end if;

  if jsonb_array_length(v_attribute.applicable_node_role_codes) > 0
     and not (v_attribute.applicable_node_role_codes ? v_value_object.node_role_code) then
    raise exception using
      errcode = '23514',
      message = 'REALITY_V3_P5_ATTRIBUTE_NODE_ROLE_NOT_APPLICABLE';
  end if;

  if jsonb_array_length(v_attribute.applicable_object_kinds) > 0
     and not (v_attribute.applicable_object_kinds ? v_value_object.object_kind) then
    raise exception using
      errcode = '23514',
      message = 'REALITY_V3_P5_ATTRIBUTE_OBJECT_KIND_NOT_APPLICABLE';
  end if;

  if (
    (v_attribute.value_type_code = 'numeric' and new.value_numeric is null)
    or (v_attribute.value_type_code = 'text' and new.value_text is null)
    or (v_attribute.value_type_code = 'boolean' and new.value_boolean is null)
    or (v_attribute.value_type_code = 'date' and new.value_date is null)
    or (v_attribute.value_type_code = 'datetime' and new.value_datetime is null)
    or (v_attribute.value_type_code = 'json' and new.value_json is null)
  ) then
    raise exception using
      errcode = '23514',
      message = 'REALITY_V3_P5_ATTRIBUTE_VALUE_TYPE_MISMATCH';
  end if;

  return new;
end;
$function$;

revoke execute on function public.enforce_value_object_profile_attribute_contract_v3()
  from public, anon, authenticated;
grant execute on function public.enforce_value_object_profile_attribute_contract_v3()
  to service_role;

create or replace function public.enforce_value_object_child_owner_alignment_v3()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_owner_user_id uuid;
  v_owner_actor_id uuid;
begin
  select value_object.owner_user_id, value_object.owner_actor_id
  into v_owner_user_id, v_owner_actor_id
  from public.value_objects value_object
  where value_object.id = new.value_object_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'REALITY_V3_P5_VALUE_OBJECT_NOT_FOUND';
  end if;

  if new.owner_user_id is distinct from v_owner_user_id
     or new.owner_actor_id is distinct from v_owner_actor_id then
    raise exception using
      errcode = '42501',
      message = 'REALITY_V3_P5_CHILD_OWNER_PAIR_MISMATCH';
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
      message = 'REALITY_V3_P5_OWNER_ACTOR_NOT_ACTIVE_FOR_USER';
  end if;

  if not exists (
    select 1
    from public.actor_public_profiles profile
    join public.actors actor
      on actor.id = profile.actor_id
     and actor.status = 'active'
    where profile.owner_user_id = new.owner_user_id
      and profile.actor_id = new.created_by_actor_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'REALITY_V3_P5_CREATOR_ACTOR_NOT_ACTIVE_FOR_USER';
  end if;

  return new;
end;
$function$;

revoke execute on function public.enforce_value_object_child_owner_alignment_v3()
  from public, anon, authenticated;
grant execute on function public.enforce_value_object_child_owner_alignment_v3()
  to service_role;

drop trigger if exists value_object_profile_attributes_contract_v3_trg
  on public.value_object_profile_attributes;
create trigger value_object_profile_attributes_contract_v3_trg
before insert or update of
  value_object_id,
  attribute_code,
  value_numeric,
  value_text,
  value_boolean,
  value_date,
  value_datetime,
  value_json
on public.value_object_profile_attributes
for each row
execute function public.enforce_value_object_profile_attribute_contract_v3();

drop trigger if exists value_object_profile_attributes_owner_v3_trg
  on public.value_object_profile_attributes;
create trigger value_object_profile_attributes_owner_v3_trg
before insert or update of value_object_id, owner_user_id, owner_actor_id, created_by_actor_id
on public.value_object_profile_attributes
for each row
execute function public.enforce_value_object_child_owner_alignment_v3();

drop trigger if exists value_object_outcome_criteria_owner_v3_trg
  on public.value_object_outcome_criteria;
create trigger value_object_outcome_criteria_owner_v3_trg
before insert or update of value_object_id, owner_user_id, owner_actor_id, created_by_actor_id
on public.value_object_outcome_criteria
for each row
execute function public.enforce_value_object_child_owner_alignment_v3();

drop trigger if exists value_object_attribute_registry_updated_at_v3_trg
  on public.value_object_attribute_registry;
create trigger value_object_attribute_registry_updated_at_v3_trg
before update on public.value_object_attribute_registry
for each row execute function public.set_reality_model_v3_updated_at();

drop trigger if exists value_object_criterion_types_updated_at_v3_trg
  on public.value_object_criterion_types;
create trigger value_object_criterion_types_updated_at_v3_trg
before update on public.value_object_criterion_types
for each row execute function public.set_reality_model_v3_updated_at();

drop trigger if exists value_object_criterion_comparators_updated_at_v3_trg
  on public.value_object_criterion_comparators;
create trigger value_object_criterion_comparators_updated_at_v3_trg
before update on public.value_object_criterion_comparators
for each row execute function public.set_reality_model_v3_updated_at();

drop trigger if exists value_object_relation_types_updated_at_v3_trg
  on public.value_object_relation_types;
create trigger value_object_relation_types_updated_at_v3_trg
before update on public.value_object_relation_types
for each row execute function public.set_reality_model_v3_updated_at();

drop trigger if exists value_object_target_kinds_updated_at_v3_trg
  on public.value_object_target_kinds;
create trigger value_object_target_kinds_updated_at_v3_trg
before update on public.value_object_target_kinds
for each row execute function public.set_reality_model_v3_updated_at();

drop trigger if exists value_object_normalization_policies_updated_at_v3_trg
  on public.value_object_normalization_policies;
create trigger value_object_normalization_policies_updated_at_v3_trg
before update on public.value_object_normalization_policies
for each row execute function public.set_reality_model_v3_updated_at();

drop trigger if exists value_object_profile_attributes_updated_at_v3_trg
  on public.value_object_profile_attributes;
create trigger value_object_profile_attributes_updated_at_v3_trg
before update on public.value_object_profile_attributes
for each row execute function public.set_reality_model_v3_updated_at();

drop trigger if exists value_object_outcome_criteria_updated_at_v3_trg
  on public.value_object_outcome_criteria;
create trigger value_object_outcome_criteria_updated_at_v3_trg
before update on public.value_object_outcome_criteria
for each row execute function public.set_reality_model_v3_updated_at();

create index if not exists idx_value_object_profile_attributes_owner_v3
  on public.value_object_profile_attributes(owner_user_id, owner_actor_id, value_object_id);
create index if not exists idx_value_object_profile_attributes_status_v3
  on public.value_object_profile_attributes(value_object_id, status);
create index if not exists idx_value_object_outcome_criteria_owner_v3
  on public.value_object_outcome_criteria(owner_user_id, owner_actor_id, value_object_id);
create index if not exists idx_value_object_outcome_criteria_type_status_v3
  on public.value_object_outcome_criteria(value_object_id, criterion_type_code, status);

alter table public.value_object_attribute_registry enable row level security;
alter table public.value_object_criterion_types enable row level security;
alter table public.value_object_criterion_comparators enable row level security;
alter table public.value_object_relation_types enable row level security;
alter table public.value_object_target_kinds enable row level security;
alter table public.value_object_normalization_policies enable row level security;
alter table public.value_object_profile_attributes enable row level security;
alter table public.value_object_outcome_criteria enable row level security;

drop policy if exists value_object_attribute_registry_read_all_v3 on public.value_object_attribute_registry;
create policy value_object_attribute_registry_read_all_v3
  on public.value_object_attribute_registry for select to anon, authenticated using (true);

drop policy if exists value_object_criterion_types_read_all_v3 on public.value_object_criterion_types;
create policy value_object_criterion_types_read_all_v3
  on public.value_object_criterion_types for select to anon, authenticated using (true);

drop policy if exists value_object_criterion_comparators_read_all_v3 on public.value_object_criterion_comparators;
create policy value_object_criterion_comparators_read_all_v3
  on public.value_object_criterion_comparators for select to anon, authenticated using (true);

drop policy if exists value_object_relation_types_read_all_v3 on public.value_object_relation_types;
create policy value_object_relation_types_read_all_v3
  on public.value_object_relation_types for select to anon, authenticated using (true);

drop policy if exists value_object_target_kinds_read_all_v3 on public.value_object_target_kinds;
create policy value_object_target_kinds_read_all_v3
  on public.value_object_target_kinds for select to anon, authenticated using (true);

drop policy if exists value_object_normalization_policies_read_all_v3 on public.value_object_normalization_policies;
create policy value_object_normalization_policies_read_all_v3
  on public.value_object_normalization_policies for select to anon, authenticated using (true);

drop policy if exists value_object_profile_attributes_no_direct_client_v3 on public.value_object_profile_attributes;
create policy value_object_profile_attributes_no_direct_client_v3
  on public.value_object_profile_attributes for all to anon, authenticated
  using (false) with check (false);

drop policy if exists value_object_outcome_criteria_no_direct_client_v3 on public.value_object_outcome_criteria;
create policy value_object_outcome_criteria_no_direct_client_v3
  on public.value_object_outcome_criteria for all to anon, authenticated
  using (false) with check (false);

revoke insert, update, delete, truncate, references, trigger
  on public.value_object_attribute_registry,
     public.value_object_criterion_types,
     public.value_object_criterion_comparators,
     public.value_object_relation_types,
     public.value_object_target_kinds,
     public.value_object_normalization_policies
  from anon, authenticated;

grant select
  on public.value_object_attribute_registry,
     public.value_object_criterion_types,
     public.value_object_criterion_comparators,
     public.value_object_relation_types,
     public.value_object_target_kinds,
     public.value_object_normalization_policies
  to anon, authenticated;

revoke all
  on public.value_object_profile_attributes,
     public.value_object_outcome_criteria
  from anon, authenticated;

grant all
  on public.value_object_attribute_registry,
     public.value_object_criterion_types,
     public.value_object_criterion_comparators,
     public.value_object_relation_types,
     public.value_object_target_kinds,
     public.value_object_normalization_policies,
     public.value_object_profile_attributes,
     public.value_object_outcome_criteria
  to service_role;

commit;
