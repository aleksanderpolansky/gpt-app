/*
ARCTor.app
Calculation Model / Formula Catalog Foundation V1

Purpose:

1. Extract reusable mathematical model identity from a concrete
   consequence/application rule.

2. Preserve one canonical expression language:
   arctor_formula_v1.

3. Allow the same published formula version to be referenced by:
   - activity parameter -> Observation Object mapping;
   - consequence rules;
   - future analytics/snapshot rules.

4. Do NOT migrate or alter current Formula Rule behavior yet.

5. Do NOT execute formulas and do NOT write facts.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

do $preflight$
begin

  if to_regclass(
       'public.activity_fact_calculation_rule_versions_v1'
     ) is null then
    raise exception using
      errcode = '42P01',
      message =
        'CALCULATION_MODEL_V1_FORMULA_RULE_REGISTRY_REQUIRED';
  end if;

  if to_regclass(
       'public.activity_template_parameter_routes_v2'
     ) is null then
    raise exception using
      errcode = '42P01',
      message =
        'CALCULATION_MODEL_V1_PARAMETER_ROUTES_REQUIRED';
  end if;

  if to_regclass(
       'public.app_users'
     ) is null
     or to_regclass(
       'public.actors'
     ) is null
     or to_regclass(
       'public.organizations'
     ) is null then
    raise exception using
      errcode = '42P01',
      message =
        'CALCULATION_MODEL_V1_OWNER_FOUNDATION_REQUIRED';
  end if;

  if to_regclass(
       'public.calculation_model_series_v1'
     ) is not null
     or to_regclass(
       'public.calculation_model_versions_v1'
     ) is not null then
    raise exception using
      errcode = '42P07',
      message =
        'CALCULATION_MODEL_V1_ALREADY_INSTALLED_OR_PARTIAL';
  end if;

end
$preflight$;


create table
public.calculation_model_series_v1 (

  id uuid
    primary key
    default gen_random_uuid(),

  model_code text
    not null
    unique,

  scope_code text
    not null,

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

  title text
    not null,

  description text,

  category_code text
    not null
    default 'general',

  visibility_code text
    not null
    default 'private',

  status_code text
    not null
    default 'active',

  metadata_json jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default clock_timestamp(),

  updated_at timestamptz
    not null
    default clock_timestamp(),

  constraint cm_series_code_check
    check (
      model_code ~
        '^[a-z][a-z0-9_.:-]{2,239}$'
    ),

  constraint cm_series_scope_check
    check (
      scope_code in (
        'system',
        'user',
        'organization'
      )
    ),

  constraint cm_series_owner_shape_check
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

  constraint cm_series_visibility_check
    check (
      visibility_code in (
        'private',
        'shared',
        'public'
      )
    ),

  constraint cm_series_status_check
    check (
      status_code in (
        'active',
        'inactive',
        'archived'
      )
    ),

  constraint cm_series_title_check
    check (
      length(
        btrim(title)
      ) between 1 and 300
    ),

  constraint cm_series_category_check
    check (
      category_code ~
        '^[a-z][a-z0-9_.:-]{1,119}$'
    ),

  constraint cm_series_metadata_check
    check (
      jsonb_typeof(
        metadata_json
      ) = 'object'
    )
);


create index
cm_series_scope_owner_idx
on public.calculation_model_series_v1(
  scope_code,
  owner_user_id,
  owner_actor_id,
  organization_id,
  status_code
);


create index
cm_series_catalog_idx
on public.calculation_model_series_v1(
  category_code,
  visibility_code,
  status_code
);


create table
public.calculation_model_versions_v1 (

  id uuid
    primary key
    default gen_random_uuid(),

  model_series_id uuid
    not null
    references public.calculation_model_series_v1(id)
    on delete restrict,

  version_no integer
    not null,

  expression_language_code text
    not null
    default 'arctor_formula_v1',

  input_contract_json jsonb
    not null
    default '[]'::jsonb,

  expression_contract_json jsonb
    not null
    default '{}'::jsonb,

  output_contract_json jsonb
    not null
    default '{}'::jsonb,

  applicability_contract_json jsonb
    not null
    default '{}'::jsonb,

  evidence_contract_json jsonb
    not null
    default '{}'::jsonb,

  status_code text
    not null
    default 'draft',

  supersedes_model_version_id uuid
    references public.calculation_model_versions_v1(id)
    on delete restrict,

  published_at timestamptz,

  valid_from timestamptz
    not null
    default clock_timestamp(),

  valid_to timestamptz,

  created_by_actor_id uuid
    references public.actors(id)
    on delete set null,

  metadata_json jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default clock_timestamp(),

  updated_at timestamptz
    not null
    default clock_timestamp(),

  constraint cm_version_series_number_unique
    unique (
      model_series_id,
      version_no
    ),

  constraint cm_version_number_check
    check (
      version_no > 0
    ),

  constraint cm_version_language_check
    check (
      expression_language_code =
        'arctor_formula_v1'
    ),

  constraint cm_version_input_check
    check (
      jsonb_typeof(
        input_contract_json
      ) = 'array'
    ),

  constraint cm_version_expression_check
    check (
      jsonb_typeof(
        expression_contract_json
      ) = 'object'
    ),

  constraint cm_version_output_check
    check (
      jsonb_typeof(
        output_contract_json
      ) = 'object'
    ),

  constraint cm_version_applicability_check
    check (
      jsonb_typeof(
        applicability_contract_json
      ) = 'object'
    ),

  constraint cm_version_evidence_check
    check (
      jsonb_typeof(
        evidence_contract_json
      ) = 'object'
    ),

  constraint cm_version_status_check
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

  constraint cm_version_interval_check
    check (
      valid_to is null
      or valid_to >= valid_from
    ),

  constraint cm_version_metadata_check
    check (
      jsonb_typeof(
        metadata_json
      ) = 'object'
    )
);


create unique index
cm_version_one_published_uidx
on public.calculation_model_versions_v1(
  model_series_id
)
where status_code =
  'published';


create index
cm_version_history_idx
on public.calculation_model_versions_v1(
  model_series_id,
  version_no desc
);


create index
cm_version_status_idx
on public.calculation_model_versions_v1(
  status_code,
  valid_from
);


alter table
public.activity_fact_calculation_rule_versions_v1
add column if not exists
calculation_model_version_id uuid
references public.calculation_model_versions_v1(id)
on delete restrict;


alter table
public.activity_template_parameter_routes_v2
add column if not exists
calculation_model_version_id uuid
references public.calculation_model_versions_v1(id)
on delete restrict;


alter table
public.activity_template_parameter_routes_v2
add column if not exists
calculation_model_binding_json jsonb
not null
default '{}'::jsonb;


alter table
public.activity_template_parameter_routes_v2
add constraint
activity_template_parameter_routes_v2_cm_binding_check
check (
  jsonb_typeof(
    calculation_model_binding_json
  ) = 'object'
);


create index
afcrv_v1_calculation_model_idx
on public.activity_fact_calculation_rule_versions_v1(
  calculation_model_version_id
)
where calculation_model_version_id
  is not null;


create index
atpr_v2_calculation_model_idx
on public.activity_template_parameter_routes_v2(
  calculation_model_version_id
)
where calculation_model_version_id
  is not null;


comment on table
public.calculation_model_series_v1
is
'Reusable ARCTor calculation-model identity. Independent from a concrete activity/consequence application.';


comment on table
public.calculation_model_versions_v1
is
'Immutable/versioned reusable calculation-model body using canonical arctor_formula_v1 expression language.';


comment on column
public.activity_fact_calculation_rule_versions_v1.calculation_model_version_id
is
'Optional reference from a concrete consequence/result rule version to a reusable calculation model version.';


comment on column
public.activity_template_parameter_routes_v2.calculation_model_version_id
is
'Optional reusable calculation model used by a parameter-to-observation-object route.';


comment on column
public.activity_template_parameter_routes_v2.calculation_model_binding_json
is
'Application-specific binding of calculation-model input keys to the activity parameter, constants, facts, snapshots or other controlled sources.';


commit;


notify pgrst,
  'reload schema';


select
  jsonb_pretty(
    jsonb_build_object(

      'contract',
        'ARCTOR_CALCULATION_MODEL_CATALOG_V1',

      'seriesTablePresent',
        to_regclass(
          'public.calculation_model_series_v1'
        ) is not null,

      'versionTablePresent',
        to_regclass(
          'public.calculation_model_versions_v1'
        ) is not null,

      'formulaRuleLinkColumnPresent',
        exists (
          select 1
          from information_schema.columns
          where table_schema =
            'public'
            and table_name =
              'activity_fact_calculation_rule_versions_v1'
            and column_name =
              'calculation_model_version_id'
        ),

      'parameterRouteLinkColumnPresent',
        exists (
          select 1
          from information_schema.columns
          where table_schema =
            'public'
            and table_name =
              'activity_template_parameter_routes_v2'
            and column_name =
              'calculation_model_version_id'
        ),

      'parameterRouteBindingColumnPresent',
        exists (
          select 1
          from information_schema.columns
          where table_schema =
            'public'
            and table_name =
              'activity_template_parameter_routes_v2'
            and column_name =
              'calculation_model_binding_json'
        )
    )
  )
  as calculation_model_catalog_v1_postcheck;