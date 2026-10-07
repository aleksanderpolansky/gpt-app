-- ============================================================
-- ARCTor
-- PARAMETERIZED SYSTEM TYPICAL ACTIVITY AUTHORING V1
-- 2026-10-07
--
-- Adds an ownerless SYSTEM typical-activity authoring path where
-- the curator selects exact INTERMEDIATE observation objects.
-- Runtime will later resolve at most one descendant LEAF inside
-- each selected intermediate branch.
--
-- This migration DOES NOT:
--   auto-process commercial activities;
--   change activity-event/fact writers;
--   create leaf ONs;
--   create parameter assignments on intermediate ONs;
--   widen search outside curator-selected intermediate branches.
-- ============================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

do $preflight$
begin
  if to_regclass('public.activity_templates') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_PAT_ACTIVITY_TEMPLATES_MISSING';
  end if;

  if to_regclass('public.activity_template_impact_profiles_v1') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_PAT_PROFILE_TABLE_MISSING';
  end if;

  if to_regclass('public.activity_template_profile_parameters_v2') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_PAT_PROFILE_PARAMETERS_V2_MISSING';
  end if;

  if to_regclass('public.value_object_parameter_definitions') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_PAT_PARAMETER_DEFINITIONS_MISSING';
  end if;

  if to_regclass('public.value_objects') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_PAT_VALUE_OBJECTS_MISSING';
  end if;

  if to_regclass('public.platform_admins') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_PAT_PLATFORM_ADMINS_MISSING';
  end if;
end
$preflight$;

create or replace function
public.save_curator_parameterized_system_typical_activity_v1(
  p_request_id uuid,

  p_curator_app_user_id uuid,
  p_curator_actor_id uuid,
  p_curator_admin_id uuid,
  p_curator_role text,

  p_locale text,

  p_title text,
  p_title_en text,

  p_description text,
  p_description_en text,

  p_fingerprint text,

  p_actor_applicability text,
  p_acceptance_mode text,

  p_parameters jsonb,
  p_dynamic_bindings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$

declare
  v_existing public.activity_templates%rowtype;

  v_template_id uuid;
  v_profile_id uuid;
  v_profile_version integer;

  v_existing_fingerprint text;
  v_slug text;

  v_localizations jsonb;
  v_template_metadata jsonb;
  v_profile_metadata jsonb;

  v_parameter jsonb;
  v_parameter_definition_id uuid;
  v_capture_policy text;
  v_is_required boolean;
  v_display_order integer;

  v_parameter_count integer;
  v_binding_count integer;
  v_distinct_binding_count integer;

  v_now timestamptz := clock_timestamp();

begin

  -- ----------------------------------------------------------
  -- ARGUMENTS
  -- ----------------------------------------------------------

  if p_request_id is null
     or p_curator_app_user_id is null
     or p_curator_actor_id is null
     or p_curator_admin_id is null then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_REQUIRED_UUID_ARGUMENT_MISSING';
  end if;

  if nullif(btrim(p_curator_role), '') is null then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_CURATOR_ROLE_REQUIRED';
  end if;

  if p_locale not in ('en','pl','ru','uk','de','es','cs') then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_LOCALE_INVALID';
  end if;

  if nullif(btrim(p_title), '') is null
     or char_length(btrim(p_title)) > 180 then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_TITLE_INVALID';
  end if;

  if nullif(btrim(p_title_en), '') is null
     or char_length(btrim(p_title_en)) > 180 then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_TITLE_EN_INVALID';
  end if;

  if p_description is not null
     and char_length(p_description) > 4000 then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_DESCRIPTION_TOO_LONG';
  end if;

  if p_description_en is not null
     and char_length(p_description_en) > 4000 then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_DESCRIPTION_EN_TOO_LONG';
  end if;

  if p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_FINGERPRINT_INVALID';
  end if;

  if p_actor_applicability not in ('private','commercial','both') then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_ACTOR_APPLICABILITY_INVALID';
  end if;

  if p_acceptance_mode not in (
    'user_confirmation',
    'auto_if_unambiguous'
  ) then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_ACCEPTANCE_MODE_INVALID';
  end if;

  if jsonb_typeof(p_parameters) <> 'array'
     or jsonb_array_length(p_parameters) < 1 then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_PARAMETERS_REQUIRED';
  end if;

  if jsonb_typeof(p_dynamic_bindings) <> 'array'
     or jsonb_array_length(p_dynamic_bindings) < 1 then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_DYNAMIC_BINDINGS_REQUIRED';
  end if;

  -- ----------------------------------------------------------
  -- ADMIN PROVENANCE
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.platform_admins admin_row
    where admin_row.id = p_curator_admin_id
      and admin_row.app_user_id = p_curator_app_user_id
      and admin_row.status = 'active'
      and admin_row.role = p_curator_role
  ) then
    raise exception using
      errcode = '42501',
      message = 'ARCTOR_PAT_ACTIVE_PLATFORM_ADMIN_REQUIRED';
  end if;

  -- ----------------------------------------------------------
  -- PARAMETER CONTRACT
  -- ----------------------------------------------------------

  select
    count(*)
  into v_parameter_count
  from jsonb_array_elements(p_parameters) rows(item);

  if exists (
    select 1
    from jsonb_array_elements(p_parameters) rows(item)
    where coalesce(item ->> 'parameterDefinitionId', '')
      !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_PARAMETER_ID_INVALID';
  end if;

  if (
    select count(distinct item ->> 'parameterDefinitionId')
    from jsonb_array_elements(p_parameters) rows(item)
  ) <> v_parameter_count then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_PARAMETER_DUPLICATE';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_parameters) rows(item)
    left join public.value_object_parameter_definitions definition
      on definition.id =
        (item ->> 'parameterDefinitionId')::uuid
    where definition.id is null
       or definition.scope_code <> 'system'
       or definition.status <> 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_PAT_PARAMETER_NOT_ACTIVE_SYSTEM';
  end if;

  -- ----------------------------------------------------------
  -- DYNAMIC TARGET CONTRACT
  --
  -- Each binding is one exact INTERMEDIATE ON selected by the
  -- curator for one parameter. No free-text search scope exists.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from jsonb_array_elements(p_dynamic_bindings) rows(item)
    where coalesce(item ->> 'parameterDefinitionId', '')
      !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or coalesce(item ->> 'intermediateValueObjectId', '')
      !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_DYNAMIC_BINDING_ID_INVALID';
  end if;

  select
    count(*),
    count(
      distinct
      (
        item ->> 'parameterDefinitionId'
        || '|'
        || item ->> 'intermediateValueObjectId'
      )
    )
  into
    v_binding_count,
    v_distinct_binding_count
  from jsonb_array_elements(p_dynamic_bindings) rows(item);

  if v_binding_count <> v_distinct_binding_count then
    raise exception using
      errcode = '22023',
      message = 'ARCTOR_PAT_DYNAMIC_BINDING_DUPLICATE';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_dynamic_bindings) binding(item)
    where not exists (
      select 1
      from jsonb_array_elements(p_parameters) parameter(item)
      where parameter.item ->> 'parameterDefinitionId' =
        binding.item ->> 'parameterDefinitionId'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_PAT_DYNAMIC_BINDING_PARAMETER_NOT_SELECTED';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_parameters) parameter(item)
    where not exists (
      select 1
      from jsonb_array_elements(p_dynamic_bindings) binding(item)
      where binding.item ->> 'parameterDefinitionId' =
        parameter.item ->> 'parameterDefinitionId'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_PAT_PARAMETER_DYNAMIC_BINDING_MISSING';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_dynamic_bindings) binding(item)
    left join public.value_objects target
      on target.id =
        (binding.item ->> 'intermediateValueObjectId')::uuid
    where target.id is null
       or target.scope_code <> 'global'
       or target.origin_type_code <> 'system_model'
       or target.ontology_node_role_code <> 'intermediate'
       or target.status <> 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_PAT_TARGET_NOT_ACTIVE_SYSTEM_INTERMEDIATE';
  end if;

  -- ----------------------------------------------------------
  -- LOCALIZATION
  -- ----------------------------------------------------------

  if p_locale = 'en' then
    v_localizations :=
      jsonb_build_object(
        'en',
        jsonb_build_object(
          'title', btrim(p_title_en),
          'description',
            coalesce(nullif(btrim(p_description_en), ''), '')
        )
      );
  else
    v_localizations :=
      jsonb_build_object(
        'en',
        jsonb_build_object(
          'title', btrim(p_title_en),
          'description',
            coalesce(nullif(btrim(p_description_en), ''), '')
        ),
        p_locale,
        jsonb_build_object(
          'title', btrim(p_title),
          'description',
            coalesce(nullif(btrim(p_description), ''), '')
        )
      );
  end if;

  -- ----------------------------------------------------------
  -- IDEMPOTENCY
  -- ----------------------------------------------------------

  select template.*
  into v_existing
  from public.activity_templates template
  where template.default_metadata_json @>
    jsonb_build_object(
      'parameterizedSystemAuthoringV1',
      jsonb_build_object(
        'requestId',
        p_request_id::text
      )
    )
  order by template.updated_at desc
  limit 1
  for update;

  if found then
    v_existing_fingerprint :=
      v_existing.default_metadata_json
        -> 'parameterizedSystemAuthoringV1'
        ->> 'fingerprint';

    if v_existing_fingerprint is distinct from p_fingerprint then
      raise exception using
        errcode = '23505',
        message = 'ARCTOR_PAT_REQUEST_FINGERPRINT_CONFLICT';
    end if;

    if v_existing.template_scope <> 'system'
       or v_existing.owner_user_id is not null
       or v_existing.owner_actor_id is not null
       or v_existing.organization_id is not null
       or v_existing.status <> 'active'
       or v_existing.is_active <> true then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_PAT_REPLAY_TEMPLATE_INVARIANT_FAILED';
    end if;

    select
      profile.id,
      profile.version_no
    into
      v_profile_id,
      v_profile_version
    from public.activity_template_impact_profiles_v1 profile
    where profile.template_id = v_existing.id
      and profile.status = 'active'
      and profile.routing_contract_code = 'parameter_registry_v2'
    order by profile.version_no desc
    limit 1;

    if v_profile_id is null then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_PAT_REPLAY_PROFILE_MISSING';
    end if;

    return jsonb_build_object(
      'contract',
      'ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1',
      'templateId',
      v_existing.id,
      'profileId',
      v_profile_id,
      'versionNo',
      v_profile_version,
      'routingContractCode',
      'parameter_registry_v2',
      'templateScope',
      'system',
      'fingerprint',
      p_fingerprint,
      'replayed',
      true,
      'profileVersionCreated',
      false
    );
  end if;

  -- ----------------------------------------------------------
  -- CREATE OWNERLESS SYSTEM TEMPLATE
  -- ----------------------------------------------------------

  v_template_id :=
    gen_random_uuid();

  v_slug :=
    'curator-parameterized-system-' ||
    replace(v_template_id::text, '-', '');

  v_template_metadata :=
    jsonb_build_object(
      'arctorTypicalActivity',
      jsonb_build_object(
        'kind',
        'typical_activity',
        'scope',
        'system',
        'catalogVersion',
        'reality_model_v1'
      ),
      'typicalActivityAuthoringV2',
      jsonb_build_object(
        'contract',
        'ARCTOR_TYPICAL_ACTIVITY_AUTHORING_V2',
        'actorApplicability',
        p_actor_applicability,
        'templateMode',
        'parameterized',
        'acceptanceMode',
        p_acceptance_mode
      ),
      'parameterizedSystemAuthoringV1',
      jsonb_build_object(
        'contract',
        'ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1',
        'requestId',
        p_request_id::text,
        'fingerprint',
        p_fingerprint,
        'canonicalLocale',
        'en',
        'creationLocale',
        p_locale,
        'localizations',
        v_localizations,
        'recognitionAliases',
        case
          when lower(btrim(p_title)) = lower(btrim(p_title_en))
          then jsonb_build_array(btrim(p_title_en))
          else jsonb_build_array(
            btrim(p_title_en),
            btrim(p_title)
          )
        end,
        'parameterDefinitionIds',
        (
          select coalesce(
            jsonb_agg(
              item ->> 'parameterDefinitionId'
              order by ordinality
            ),
            '[]'::jsonb
          )
          from jsonb_array_elements(p_parameters)
            with ordinality rows(item, ordinality)
        ),
        'parameterizedTargetBindingsV1',
        p_dynamic_bindings,
        'curatorAppUserId',
        p_curator_app_user_id,
        'curatorActorId',
        p_curator_actor_id,
        'curatorAdminId',
        p_curator_admin_id,
        'curatorRole',
        p_curator_role,
        'publicationState',
        'published_by_direct_admin',
        'publishedAt',
        v_now
      )
    );

  insert into public.activity_templates (
    id,
    owner_user_id,
    owner_actor_id,
    organization_id,
    slug,
    title,
    short_title,
    description,
    template_group,
    template_scope,
    visibility,
    source_type,
    status,
    default_duration_minutes,
    default_status,
    default_source_type,
    default_privacy_scope,
    show_in_quick_capture,
    show_in_onboarding,
    allow_manual_duration,
    allow_comment,
    allow_started_at_override,
    allow_ended_at_override,
    input_schema_json,
    ui_schema_json,
    default_metadata_json,
    sort_order,
    is_active,
    created_at,
    updated_at
  )
  values (
    v_template_id,
    null,
    null,
    null,
    v_slug,
    btrim(p_title_en),
    btrim(p_title_en),
    nullif(btrim(p_description_en), ''),
    'general',
    'system',
    'public_template',
    'system_seed',
    'active',
    null,
    'completed',
    'manual_chat',
    'private',
    false,
    false,
    true,
    true,
    true,
    true,
    '{}'::jsonb,
    '{}'::jsonb,
    v_template_metadata,
    100,
    true,
    v_now,
    v_now
  );

  -- ----------------------------------------------------------
  -- CREATE PROFILE
  -- No exact object links are created here by design.
  -- ----------------------------------------------------------

  v_profile_id :=
    gen_random_uuid();

  v_profile_version :=
    1;

  v_profile_metadata :=
    jsonb_build_object(
      'contract',
      'ARCTOR_PARAMETERIZED_TARGET_ROUTING_V1',
      'typicalActivityAuthoringV2',
      jsonb_build_object(
        'contract',
        'ARCTOR_TYPICAL_ACTIVITY_AUTHORING_V2',
        'actorApplicability',
        p_actor_applicability,
        'templateMode',
        'parameterized',
        'acceptanceMode',
        p_acceptance_mode
      ),
      'parameterizedTargetBindingsV1',
      p_dynamic_bindings,
      'resolutionRule',
      jsonb_build_object(
        'candidateNodeRole',
        'leaf',
        'maxSelectedLeafPerIntermediate',
        1,
        'allowSearchOutsideSelectedIntermediate',
        false,
        'noMatchAction',
        'curator_review'
      ),
      'curatorAppUserId',
      p_curator_app_user_id,
      'curatorActorId',
      p_curator_actor_id,
      'curatorAdminId',
      p_curator_admin_id,
      'curatorRole',
      p_curator_role,
      'publishedAt',
      v_now
    );

  insert into public.activity_template_impact_profiles_v1 (
    id,
    template_id,
    owner_user_id,
    owner_actor_id,
    version_no,
    status,
    notes,
    metadata_json,
    routing_contract_code,
    created_at,
    updated_at
  )
  values (
    v_profile_id,
    v_template_id,
    p_curator_app_user_id,
    p_curator_actor_id,
    v_profile_version,
    'active',
    'Parameterized system typical activity. Runtime target leaf is resolved only inside curator-selected intermediate ON branches.',
    v_profile_metadata,
    'parameter_registry_v2',
    v_now,
    v_now
  );

  -- ----------------------------------------------------------
  -- PROFILE PARAMETERS
  -- ----------------------------------------------------------

  for v_parameter in
    select value
    from jsonb_array_elements(p_parameters)
  loop
    v_parameter_definition_id :=
      (v_parameter ->> 'parameterDefinitionId')::uuid;

    v_capture_policy :=
      lower(
        btrim(
          coalesce(
            v_parameter ->> 'capturePolicyCode',
            'deterministic_or_ai'
          )
        )
      );

    if v_capture_policy not in (
      'deterministic',
      'deterministic_or_ai',
      'ai_required',
      'manual',
      'external_source'
    ) then
      raise exception using
        errcode = '22023',
        message = 'ARCTOR_PAT_CAPTURE_POLICY_INVALID';
    end if;

    v_is_required :=
      coalesce(
        (v_parameter ->> 'isRequired')::boolean,
        true
      );

    v_display_order :=
      coalesce(
        (v_parameter ->> 'displayOrder')::integer,
        100
      );

    insert into public.activity_template_profile_parameters_v2 (
      profile_id,
      parameter_definition_id,
      capture_policy_code,
      is_required,
      display_order,
      metadata_json
    )
    values (
      v_profile_id,
      v_parameter_definition_id,
      v_capture_policy,
      v_is_required,
      v_display_order,
      jsonb_build_object(
        'targetResolutionMode',
        'descendant_leaf_from_intermediate',
        'parameterizedTargetBindingsV1',
        (
          select coalesce(
            jsonb_agg(binding.item order by binding.ordinality),
            '[]'::jsonb
          )
          from jsonb_array_elements(p_dynamic_bindings)
            with ordinality binding(item, ordinality)
          where binding.item ->> 'parameterDefinitionId' =
            v_parameter_definition_id::text
        )
      )
    );
  end loop;

  -- ----------------------------------------------------------
  -- FINAL INVARIANTS
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.activity_templates template
    where template.id = v_template_id
      and template.template_scope = 'system'
      and template.owner_user_id is null
      and template.owner_actor_id is null
      and template.organization_id is null
      and template.status = 'active'
      and template.is_active = true
      and template.default_metadata_json @>
        jsonb_build_object(
          'typicalActivityAuthoringV2',
          jsonb_build_object(
            'actorApplicability',
            p_actor_applicability,
            'templateMode',
            'parameterized',
            'acceptanceMode',
            p_acceptance_mode
          )
        )
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_PAT_TEMPLATE_FINAL_INVARIANT_FAILED';
  end if;

  if (
    select count(*)
    from public.activity_template_profile_parameters_v2 parameter_row
    where parameter_row.profile_id = v_profile_id
  ) <> v_parameter_count then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_PAT_PROFILE_PARAMETER_COUNT_INVALID';
  end if;

  return jsonb_build_object(
    'contract',
    'ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1',
    'templateId',
    v_template_id,
    'profileId',
    v_profile_id,
    'versionNo',
    v_profile_version,
    'routingContractCode',
    'parameter_registry_v2',
    'templateScope',
    'system',
    'fingerprint',
    p_fingerprint,
    'replayed',
    false,
    'profileVersionCreated',
    true
  );

end
$function$;

revoke all
on function
public.save_curator_parameterized_system_typical_activity_v1(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb
)
from public, anon, authenticated;

grant execute
on function
public.save_curator_parameterized_system_typical_activity_v1(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb
)
to service_role;

comment on function
public.save_curator_parameterized_system_typical_activity_v1(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb
) is
  'Creates an ownerless SYSTEM parameterized typical activity. Curator selects exact intermediate ON branches per parameter; runtime leaf resolution is constrained to descendants of those intermediates.';

commit;

notify pgrst, 'reload schema';

select jsonb_pretty(
  jsonb_build_object(
    'contract',
    'ARCTOR_PARAMETERIZED_SYSTEM_TYPICAL_ACTIVITY_AUTHORING_V1',
    'rpcPresent',
    to_regprocedure(
      'public.save_curator_parameterized_system_typical_activity_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,jsonb,jsonb)'
    ) is not null,
    'templateTablePresent',
    to_regclass('public.activity_templates') is not null,
    'profileTablePresent',
    to_regclass('public.activity_template_impact_profiles_v1') is not null,
    'profileParametersV2Present',
    to_regclass('public.activity_template_profile_parameters_v2') is not null
  )
) as arctor_parameterized_system_typical_activity_postcheck;
