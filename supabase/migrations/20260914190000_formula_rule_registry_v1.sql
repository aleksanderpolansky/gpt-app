/*
ARCTor.app — Formula Rule Registry Foundation V1

Purpose:
- one versioned calculation-rule registry for system, user and organization scopes;
- system rules can target global system Observation Objects;
- user rules can target global Observation Objects or the user's private actor-scoped objects;
- organization scope is reserved structurally and can use system/global semantics now;
- no formula execution in this migration;
- no writes to activity facts;
- no new recalculation queue;
- no revival of legacy coefficient mutation.

Executor and curator/user UI are separate gated stages.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

do $preflight$
begin
  if to_regclass('public.activity_templates') is null
     or to_regclass('public.activity_template_impact_profiles_v1') is null
     or to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null
     or to_regclass('public.app_users') is null
     or to_regclass('public.actors') is null
     or to_regclass('public.organizations') is null then
    raise exception using
      errcode = '42P01',
      message = 'FORMULA_RULE_V1_REQUIRED_FOUNDATION_MISSING';
  end if;

  if to_regclass('public.activity_fact_calculation_rule_series_v1') is not null
     or to_regclass('public.activity_fact_calculation_rule_versions_v1') is not null
     or to_regclass('public.activity_fact_calculation_rules_published_v1') is not null then
    raise exception using
      errcode = '42P07',
      message = 'FORMULA_RULE_V1_ALREADY_INSTALLED_OR_PARTIALLY_APPLIED';
  end if;
end;
$preflight$;

create table public.activity_fact_calculation_rule_series_v1 (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null unique,

  scope_code text not null,
  owner_user_id uuid
    references public.app_users(id)
    on delete cascade,
  owner_actor_id uuid
    references public.actors(id)
    on delete cascade,
  organization_id uuid
    references public.organizations(id)
    on delete cascade,
  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  activity_template_id uuid not null
    references public.activity_templates(id)
    on delete restrict,
  impact_profile_id uuid not null
    references public.activity_template_impact_profiles_v1(id)
    on delete restrict,

  source_value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,
  source_parameter_definition_id uuid not null
    references public.value_object_parameter_definitions(id)
    on delete restrict,

  target_value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,
  target_parameter_definition_id uuid not null
    references public.value_object_parameter_definitions(id)
    on delete restrict,

  base_rule_series_id uuid
    references public.activity_fact_calculation_rule_series_v1(id)
    on delete restrict,

  resolution_mode_code text not null default 'parallel',
  status_code text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint afcrs_v1_rule_code_check
    check (rule_code ~ '^[a-z][a-z0-9_.:-]{2,239}$'),

  constraint afcrs_v1_scope_check
    check (scope_code in ('system', 'user', 'organization')),

  constraint afcrs_v1_scope_owner_shape_check
    check (
      (
        scope_code = 'system'
        and owner_user_id is null
        and owner_actor_id is null
        and organization_id is null
      )
      or
      (
        scope_code = 'user'
        and owner_user_id is not null
        and owner_actor_id is not null
        and organization_id is null
      )
      or
      (
        scope_code = 'organization'
        and owner_user_id is null
        and owner_actor_id is null
        and organization_id is not null
      )
    ),

  constraint afcrs_v1_resolution_mode_check
    check (resolution_mode_code in ('parallel', 'replace_base', 'protected')),

  constraint afcrs_v1_base_rule_shape_check
    check (
      (
        resolution_mode_code = 'replace_base'
        and base_rule_series_id is not null
      )
      or
      (
        resolution_mode_code <> 'replace_base'
        and base_rule_series_id is null
      )
    ),

  constraint afcrs_v1_no_self_base_check
    check (base_rule_series_id is null or base_rule_series_id <> id),

  constraint afcrs_v1_status_check
    check (status_code in ('active', 'inactive', 'archived')),

  constraint afcrs_v1_metadata_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create index afcrs_v1_scope_owner_idx
  on public.activity_fact_calculation_rule_series_v1(
    scope_code,
    owner_user_id,
    owner_actor_id,
    organization_id,
    status_code
  );

create index afcrs_v1_template_profile_idx
  on public.activity_fact_calculation_rule_series_v1(
    activity_template_id,
    impact_profile_id,
    status_code
  );

create index afcrs_v1_source_idx
  on public.activity_fact_calculation_rule_series_v1(
    source_value_object_id,
    source_parameter_definition_id,
    status_code
  );

create index afcrs_v1_target_idx
  on public.activity_fact_calculation_rule_series_v1(
    target_value_object_id,
    target_parameter_definition_id,
    status_code
  );

create index afcrs_v1_base_idx
  on public.activity_fact_calculation_rule_series_v1(base_rule_series_id)
  where base_rule_series_id is not null;

create table public.activity_fact_calculation_rule_versions_v1 (
  id uuid primary key default gen_random_uuid(),
  rule_series_id uuid not null
    references public.activity_fact_calculation_rule_series_v1(id)
    on delete restrict,
  version_no integer not null,

  expression_language_code text not null default 'arctor_formula_v1',
  input_contract_json jsonb not null default '[]'::jsonb,
  condition_contract_json jsonb not null default '{}'::jsonb,
  expression_contract_json jsonb not null default '{}'::jsonb,
  trigger_contract_json jsonb not null default '[]'::jsonb,

  result_fact_role_code text not null default 'result',
  result_unit_code text,
  missing_input_policy_code text not null default 'insufficient_data',

  status_code text not null default 'draft',
  supersedes_rule_version_id uuid
    references public.activity_fact_calculation_rule_versions_v1(id)
    on delete restrict,

  published_at timestamptz,
  valid_from timestamptz not null default clock_timestamp(),
  valid_to timestamptz,

  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),

  constraint afcrv_v1_series_version_unique
    unique (rule_series_id, version_no),

  constraint afcrv_v1_version_check
    check (version_no > 0),

  constraint afcrv_v1_language_check
    check (expression_language_code = 'arctor_formula_v1'),

  constraint afcrv_v1_inputs_check
    check (jsonb_typeof(input_contract_json) = 'array'),

  constraint afcrv_v1_condition_check
    check (jsonb_typeof(condition_contract_json) = 'object'),

  constraint afcrv_v1_expression_check
    check (jsonb_typeof(expression_contract_json) = 'object'),

  constraint afcrv_v1_triggers_check
    check (jsonb_typeof(trigger_contract_json) = 'array'),

  constraint afcrv_v1_result_role_check
    check (result_fact_role_code in ('result', 'snapshot')),

  constraint afcrv_v1_missing_input_policy_check
    check (missing_input_policy_code in ('insufficient_data', 'skip', 'zero')),

  constraint afcrv_v1_status_check
    check (
      status_code in (
        'draft',
        'testing',
        'published',
        'disabled',
        'superseded',
        'archived'
      )
    ),

  constraint afcrv_v1_valid_interval_check
    check (valid_to is null or valid_to >= valid_from),

  constraint afcrv_v1_metadata_check
    check (jsonb_typeof(metadata_json) = 'object')
);

create unique index afcrv_v1_one_published_per_series_uidx
  on public.activity_fact_calculation_rule_versions_v1(rule_series_id)
  where status_code = 'published';

create index afcrv_v1_series_history_idx
  on public.activity_fact_calculation_rule_versions_v1(
    rule_series_id,
    version_no desc
  );

create index afcrv_v1_status_idx
  on public.activity_fact_calculation_rule_versions_v1(
    status_code,
    valid_from
  );

create or replace function public.enforce_activity_fact_calculation_rule_series_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_template public.activity_templates%rowtype;
  v_profile public.activity_template_impact_profiles_v1%rowtype;
  v_source_object public.value_objects%rowtype;
  v_target_object public.value_objects%rowtype;
  v_source_parameter public.value_object_parameter_definitions%rowtype;
  v_target_parameter public.value_object_parameter_definitions%rowtype;
  v_base public.activity_fact_calculation_rule_series_v1%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.rule_code is distinct from old.rule_code
       or new.scope_code is distinct from old.scope_code
       or new.owner_user_id is distinct from old.owner_user_id
       or new.owner_actor_id is distinct from old.owner_actor_id
       or new.organization_id is distinct from old.organization_id
       or new.created_by_actor_id is distinct from old.created_by_actor_id
       or new.activity_template_id is distinct from old.activity_template_id
       or new.impact_profile_id is distinct from old.impact_profile_id
       or new.source_value_object_id is distinct from old.source_value_object_id
       or new.source_parameter_definition_id is distinct from old.source_parameter_definition_id
       or new.target_value_object_id is distinct from old.target_value_object_id
       or new.target_parameter_definition_id is distinct from old.target_parameter_definition_id
       or new.base_rule_series_id is distinct from old.base_rule_series_id
       or new.resolution_mode_code is distinct from old.resolution_mode_code
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_SERIES_IDENTITY_IS_IMMUTABLE';
    end if;

    if old.status_code = 'active'
       and new.status_code not in ('active', 'inactive', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_INVALID_ACTIVE_SERIES_TRANSITION';
    elsif old.status_code = 'inactive'
       and new.status_code not in ('inactive', 'active', 'archived') then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_INVALID_INACTIVE_SERIES_TRANSITION';
    elsif old.status_code = 'archived'
       and new.status_code <> 'archived' then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_ARCHIVED_SERIES_IS_TERMINAL';
    end if;
  end if;

  select * into v_template
  from public.activity_templates
  where id = new.activity_template_id;

  if not found or v_template.status <> 'active' or not v_template.is_active then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_TEMPLATE_NOT_ACTIVE';
  end if;

  select * into v_profile
  from public.activity_template_impact_profiles_v1
  where id = new.impact_profile_id;

  if not found
     or v_profile.template_id is distinct from new.activity_template_id
     or v_profile.status <> 'active'
     or v_profile.routing_contract_code <> 'parameter_registry_v2' then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_PROFILE_MUST_MATCH_TEMPLATE_AND_PARAMETER_REGISTRY_V2';
  end if;

  select * into v_source_object
  from public.value_objects
  where id = new.source_value_object_id;

  if not found
     or v_source_object.status <> 'active'
     or v_source_object.ontology_node_role_code <> 'leaf' then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_SOURCE_OBJECT_MUST_BE_ACTIVE_ONTOLOGY_LEAF';
  end if;

  select * into v_target_object
  from public.value_objects
  where id = new.target_value_object_id;

  if not found
     or v_target_object.status <> 'active'
     or v_target_object.ontology_node_role_code <> 'leaf' then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_TARGET_OBJECT_MUST_BE_ACTIVE_ONTOLOGY_LEAF';
  end if;

  select * into v_source_parameter
  from public.value_object_parameter_definitions
  where id = new.source_parameter_definition_id;

  if not found or v_source_parameter.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_SOURCE_PARAMETER_NOT_ACTIVE';
  end if;

  select * into v_target_parameter
  from public.value_object_parameter_definitions
  where id = new.target_parameter_definition_id;

  if not found or v_target_parameter.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_TARGET_PARAMETER_NOT_ACTIVE';
  end if;

  if not exists (
    select 1
    from public.value_object_parameter_assignments assignment
    where assignment.value_object_id = new.source_value_object_id
      and assignment.parameter_definition_id = new.source_parameter_definition_id
      and assignment.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_SOURCE_PARAMETER_NOT_ASSIGNED_TO_SOURCE_OBJECT';
  end if;

  if not exists (
    select 1
    from public.value_object_parameter_assignments assignment
    where assignment.value_object_id = new.target_value_object_id
      and assignment.parameter_definition_id = new.target_parameter_definition_id
      and assignment.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_TARGET_PARAMETER_NOT_ASSIGNED_TO_TARGET_OBJECT';
  end if;

  if new.scope_code = 'system' then
    if v_template.template_scope <> 'system'
       or v_source_object.scope_code <> 'global'
       or v_target_object.scope_code <> 'global'
       or v_source_parameter.scope_code <> 'system'
       or v_target_parameter.scope_code <> 'system'
       or new.base_rule_series_id is not null then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_SYSTEM_SCOPE_REFERENCE_MISMATCH';
    end if;

  elsif new.scope_code = 'user' then
    if v_template.template_scope not in ('system', 'user') then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_USER_TEMPLATE_SCOPE_INVALID';
    end if;

    if v_template.template_scope = 'user'
       and (
         v_template.owner_user_id is distinct from new.owner_user_id
         or (
           v_template.owner_actor_id is not null
           and v_template.owner_actor_id is distinct from new.owner_actor_id
         )
       ) then
      raise exception using
        errcode = '42501',
        message = 'FORMULA_RULE_V1_USER_TEMPLATE_OWNER_MISMATCH';
    end if;

    if v_source_object.scope_code = 'actor'
       and (
         v_source_object.owner_user_id is distinct from new.owner_user_id
         or v_source_object.owner_actor_id is distinct from new.owner_actor_id
       ) then
      raise exception using
        errcode = '42501',
        message = 'FORMULA_RULE_V1_USER_SOURCE_OBJECT_OWNER_MISMATCH';
    elsif v_source_object.scope_code not in ('global', 'actor') then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_USER_SOURCE_OBJECT_SCOPE_INVALID';
    end if;

    if v_target_object.scope_code = 'actor'
       and (
         v_target_object.owner_user_id is distinct from new.owner_user_id
         or v_target_object.owner_actor_id is distinct from new.owner_actor_id
       ) then
      raise exception using
        errcode = '42501',
        message = 'FORMULA_RULE_V1_USER_TARGET_OBJECT_OWNER_MISMATCH';
    elsif v_target_object.scope_code not in ('global', 'actor') then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_USER_TARGET_OBJECT_SCOPE_INVALID';
    end if;

    if v_source_parameter.scope_code = 'actor'
       and (
         v_source_parameter.owner_user_id is distinct from new.owner_user_id
         or v_source_parameter.owner_actor_id is distinct from new.owner_actor_id
       ) then
      raise exception using
        errcode = '42501',
        message = 'FORMULA_RULE_V1_USER_SOURCE_PARAMETER_OWNER_MISMATCH';
    elsif v_source_parameter.scope_code not in ('system', 'actor') then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_USER_SOURCE_PARAMETER_SCOPE_INVALID';
    end if;

    if v_target_parameter.scope_code = 'actor'
       and (
         v_target_parameter.owner_user_id is distinct from new.owner_user_id
         or v_target_parameter.owner_actor_id is distinct from new.owner_actor_id
       ) then
      raise exception using
        errcode = '42501',
        message = 'FORMULA_RULE_V1_USER_TARGET_PARAMETER_OWNER_MISMATCH';
    elsif v_target_parameter.scope_code not in ('system', 'actor') then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_USER_TARGET_PARAMETER_SCOPE_INVALID';
    end if;

  elsif new.scope_code = 'organization' then
    if v_template.template_scope not in ('system', 'organization') then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_ORG_TEMPLATE_SCOPE_INVALID';
    end if;

    if v_template.template_scope = 'organization'
       and v_template.organization_id is distinct from new.organization_id then
      raise exception using
        errcode = '42501',
        message = 'FORMULA_RULE_V1_ORG_TEMPLATE_OWNER_MISMATCH';
    end if;

    -- Organization-specific private ON authorization is a later gated layer.
    -- V1 organization rules therefore reference global ON + system parameters only.
    if v_source_object.scope_code <> 'global'
       or v_target_object.scope_code <> 'global'
       or v_source_parameter.scope_code <> 'system'
       or v_target_parameter.scope_code <> 'system' then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_ORG_PRIVATE_SEMANTICS_NOT_ENABLED_YET';
    end if;
  end if;

  if new.base_rule_series_id is not null then
    select * into v_base
    from public.activity_fact_calculation_rule_series_v1
    where id = new.base_rule_series_id;

    if not found or v_base.status_code <> 'active' then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_BASE_RULE_NOT_ACTIVE';
    end if;

    if v_base.resolution_mode_code = 'protected' then
      raise exception using
        errcode = '42501',
        message = 'FORMULA_RULE_V1_BASE_RULE_IS_PROTECTED';
    end if;

    if v_base.activity_template_id is distinct from new.activity_template_id
       or v_base.impact_profile_id is distinct from new.impact_profile_id
       or v_base.source_value_object_id is distinct from new.source_value_object_id
       or v_base.source_parameter_definition_id is distinct from new.source_parameter_definition_id
       or v_base.target_value_object_id is distinct from new.target_value_object_id
       or v_base.target_parameter_definition_id is distinct from new.target_parameter_definition_id then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_BASE_RULE_SEMANTIC_ADDRESS_MISMATCH';
    end if;

    if new.scope_code = 'organization' and v_base.scope_code <> 'system' then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_ORG_BASE_MUST_BE_SYSTEM';
    end if;

    if new.scope_code = 'user' and v_base.scope_code not in ('system', 'organization') then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_USER_BASE_SCOPE_INVALID';
    end if;
  end if;

  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

create trigger afcrs_v1_guard_trg
before insert or update
on public.activity_fact_calculation_rule_series_v1
for each row
execute function public.enforce_activity_fact_calculation_rule_series_v1();

create or replace function public.enforce_activity_fact_calculation_rule_version_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_latest public.activity_fact_calculation_rule_versions_v1%rowtype;
  v_has_latest boolean := false;
begin
  if tg_op = 'UPDATE' then
    if new.rule_series_id is distinct from old.rule_series_id
       or new.version_no is distinct from old.version_no
       or new.supersedes_rule_version_id is distinct from old.supersedes_rule_version_id
       or new.created_by_actor_id is distinct from old.created_by_actor_id
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_VERSION_IDENTITY_IS_IMMUTABLE';
    end if;

    if old.status_code in ('published', 'disabled', 'superseded', 'archived')
       and (
         new.expression_language_code is distinct from old.expression_language_code
         or new.input_contract_json is distinct from old.input_contract_json
         or new.condition_contract_json is distinct from old.condition_contract_json
         or new.expression_contract_json is distinct from old.expression_contract_json
         or new.trigger_contract_json is distinct from old.trigger_contract_json
         or new.result_fact_role_code is distinct from old.result_fact_role_code
         or new.result_unit_code is distinct from old.result_unit_code
         or new.missing_input_policy_code is distinct from old.missing_input_policy_code
         or new.metadata_json is distinct from old.metadata_json
         or new.valid_from is distinct from old.valid_from
       ) then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_PUBLISHED_VERSION_CONTENT_IS_IMMUTABLE';
    end if;

    if old.status_code = 'draft'
       and new.status_code not in ('draft', 'testing', 'published', 'archived') then
      raise exception using errcode = '23514', message = 'FORMULA_RULE_V1_INVALID_DRAFT_TRANSITION';
    elsif old.status_code = 'testing'
       and new.status_code not in ('draft', 'testing', 'published', 'archived') then
      raise exception using errcode = '23514', message = 'FORMULA_RULE_V1_INVALID_TESTING_TRANSITION';
    elsif old.status_code = 'published'
       and new.status_code not in ('published', 'disabled', 'superseded') then
      raise exception using errcode = '23514', message = 'FORMULA_RULE_V1_INVALID_PUBLISHED_TRANSITION';
    elsif old.status_code = 'disabled'
       and new.status_code not in ('disabled', 'published', 'superseded', 'archived') then
      raise exception using errcode = '23514', message = 'FORMULA_RULE_V1_INVALID_DISABLED_TRANSITION';
    elsif old.status_code in ('superseded', 'archived')
       and new.status_code is distinct from old.status_code then
      raise exception using errcode = '23514', message = 'FORMULA_RULE_V1_TERMINAL_STATUS_IS_IMMUTABLE';
    end if;

    if new.status_code in ('published', 'disabled', 'superseded')
       and new.published_at is null then
      new.published_at := clock_timestamp();
    end if;

    if new.status_code in ('superseded', 'archived') then
      new.valid_to := coalesce(new.valid_to, clock_timestamp());
    elsif new.status_code in ('draft', 'testing', 'published', 'disabled')
       and new.valid_to is not null then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_OPEN_VERSION_CANNOT_HAVE_VALID_TO';
    end if;

    if new.status_code = 'published'
       and not (new.expression_contract_json ? 'op') then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_PUBLISHED_EXPRESSION_REQUIRES_OP';
    end if;

    new.updated_at := clock_timestamp();
    return new;
  end if;

  select latest.*
  into v_latest
  from public.activity_fact_calculation_rule_versions_v1 latest
  where latest.rule_series_id = new.rule_series_id
  order by latest.version_no desc
  limit 1;

  v_has_latest := found;

  if not v_has_latest then
    if new.version_no <> 1 or new.supersedes_rule_version_id is not null then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_FIRST_VERSION_MUST_BE_ONE';
    end if;
  else
    if new.version_no <> v_latest.version_no + 1
       or new.supersedes_rule_version_id is distinct from v_latest.id then
      raise exception using
        errcode = '23514',
        message = 'FORMULA_RULE_V1_VERSION_SEQUENCE_INVALID';
    end if;
  end if;

  if new.status_code in ('superseded', 'archived') then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_NEW_VERSION_MUST_BE_OPEN';
  end if;

  if new.status_code = 'published'
     and not (new.expression_contract_json ? 'op') then
    raise exception using
      errcode = '23514',
      message = 'FORMULA_RULE_V1_PUBLISHED_EXPRESSION_REQUIRES_OP';
  end if;

  if new.status_code in ('published', 'disabled')
     and new.published_at is null then
    new.published_at := clock_timestamp();
  end if;

  new.valid_to := null;
  new.updated_at := clock_timestamp();
  return new;
end;
$function$;

create trigger afcrv_v1_guard_trg
before insert or update
on public.activity_fact_calculation_rule_versions_v1
for each row
execute function public.enforce_activity_fact_calculation_rule_version_v1();

create view public.activity_fact_calculation_rules_published_v1 as
select
  series.id as rule_series_id,
  series.rule_code,
  series.scope_code,
  series.owner_user_id,
  series.owner_actor_id,
  series.organization_id,
  series.activity_template_id,
  series.impact_profile_id,
  series.source_value_object_id,
  series.source_parameter_definition_id,
  series.target_value_object_id,
  series.target_parameter_definition_id,
  series.base_rule_series_id,
  series.resolution_mode_code,
  version.id as rule_version_id,
  version.version_no,
  version.expression_language_code,
  version.input_contract_json,
  version.condition_contract_json,
  version.expression_contract_json,
  version.trigger_contract_json,
  version.result_fact_role_code,
  version.result_unit_code,
  version.missing_input_policy_code,
  version.published_at,
  version.valid_from,
  version.metadata_json as version_metadata_json,
  series.metadata_json as series_metadata_json
from public.activity_fact_calculation_rule_series_v1 series
join public.activity_fact_calculation_rule_versions_v1 version
  on version.rule_series_id = series.id
 and version.status_code = 'published'
where series.status_code = 'active';

alter table public.activity_fact_calculation_rule_series_v1 enable row level security;
alter table public.activity_fact_calculation_rule_versions_v1 enable row level security;

create policy no_direct_public_afcrs_v1_access
  on public.activity_fact_calculation_rule_series_v1
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy no_direct_public_afcrv_v1_access
  on public.activity_fact_calculation_rule_versions_v1
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.activity_fact_calculation_rule_series_v1 from anon, authenticated;
revoke all on table public.activity_fact_calculation_rule_versions_v1 from anon, authenticated;
revoke all on table public.activity_fact_calculation_rules_published_v1 from anon, authenticated;

grant all on table public.activity_fact_calculation_rule_series_v1 to service_role;
grant all on table public.activity_fact_calculation_rule_versions_v1 to service_role;
grant select on table public.activity_fact_calculation_rules_published_v1 to service_role;

comment on table public.activity_fact_calculation_rule_series_v1 is
  'ARCTor Formula Rule Registry V1 stable identity and scope. Values remain in facts; this table stores rule identity and semantic addresses.';

comment on table public.activity_fact_calculation_rule_versions_v1 is
  'Versioned deterministic calculation contract. Arbitrary executable code is forbidden; expression_contract_json uses arctor_formula_v1 AST.';

comment on view public.activity_fact_calculation_rules_published_v1 is
  'Published executable rule projection for a later deterministic executor. This migration itself executes no formulas.';

commit;
