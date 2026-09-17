-- ============================================================
-- ARCTOR
-- CURATOR SYSTEM TYPICAL ACTIVITY MATERIALIZATION V1
--
-- Purpose:
--   Reuse canonical V2 activity-template profile authoring and
--   atomically promote the result to an ownerless SYSTEM
--   typical activity approved by Reality Curator.
--
-- Reused foundation:
--   activity_templates
--   activity_template_impact_profiles_v1
--   save_activity_template_impact_profile_v2
--   value_object_parameter_assignments
--
-- This migration DOES NOT:
--   create activity facts;
--   create result facts;
--   run formulas;
--   rewrite activity history.
-- ============================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '90s';

-- ------------------------------------------------------------
-- PRE-FLIGHT
-- ------------------------------------------------------------

do $preflight$
begin

  if to_regclass('public.activity_templates') is null then
    raise exception using
      errcode = '42P01',
      message =
        'ARCTOR_E02_ACTIVITY_TEMPLATES_TABLE_MISSING';
  end if;

  if to_regclass(
       'public.activity_template_impact_profiles_v1'
     ) is null then
    raise exception using
      errcode = '42P01',
      message =
        'ARCTOR_E02_ACTIVITY_TEMPLATE_PROFILES_TABLE_MISSING';
  end if;

  if to_regclass(
       'public.value_object_parameter_assignments'
     ) is null then
    raise exception using
      errcode = '42P01',
      message =
        'ARCTOR_E02_PARAMETER_ASSIGNMENTS_TABLE_MISSING';
  end if;

  if not exists (
    select 1
    from pg_proc proc
    join pg_namespace ns
      on ns.oid = proc.pronamespace
    where ns.nspname = 'public'
      and proc.proname =
        'save_activity_template_impact_profile_v2'
  ) then
    raise exception using
      errcode = '42883',
      message =
        'ARCTOR_E02_CANONICAL_V2_AUTHORING_RPC_MISSING';
  end if;

end
$preflight$;

-- ------------------------------------------------------------
-- SYSTEM WRAPPER
--
-- Why wrapper instead of a second profile engine:
--
-- 1. Existing V2 RPC already owns version creation.
-- 2. Existing V2 RPC already writes parameter_registry_v2.
-- 3. Existing V2 RPC is user-authoring oriented.
-- 4. This wrapper gives it curator provenance temporarily,
--    then atomically promotes the same template to system scope.
--
-- Profile owner fields remain AUTHORING PROVENANCE.
-- Template ownership becomes ownerless SYSTEM ownership.
-- ------------------------------------------------------------

create or replace function
public.save_curator_system_typical_activity_v1(
  p_source_signal_id uuid,

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

  p_parameters jsonb,
  p_links jsonb
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
  v_version_no integer;
  v_routing_contract_code text;

  v_v2_result jsonb;

  v_existing_fingerprint text;

  v_system_slug text;
  v_temporary_user_slug text;

  v_localizations jsonb;
  v_system_metadata jsonb;
  v_profile_metadata jsonb;

  v_parameter_ids jsonb;
  v_target_ids jsonb;

  v_now timestamptz := clock_timestamp();

begin

  -- ----------------------------------------------------------
  -- BASIC ARGUMENT VALIDATION
  -- ----------------------------------------------------------

  if p_source_signal_id is null
     or p_curator_app_user_id is null
     or p_curator_actor_id is null
     or p_curator_admin_id is null then

    raise exception using
      errcode = '22023',
      message =
        'ARCTOR_E02_REQUIRED_UUID_ARGUMENT_MISSING';

  end if;

  if nullif(btrim(p_curator_role), '') is null then
    raise exception using
      errcode = '22023',
      message =
        'ARCTOR_E02_CURATOR_ROLE_REQUIRED';
  end if;

  if p_locale not in (
    'en',
    'pl',
    'ru',
    'uk',
    'de',
    'es',
    'cs'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'ARCTOR_E02_LOCALE_INVALID';
  end if;

  if nullif(btrim(p_title_en), '') is null
     or char_length(btrim(p_title_en)) > 180 then
    raise exception using
      errcode = '22023',
      message =
        'ARCTOR_E02_ENGLISH_TITLE_INVALID';
  end if;

  if nullif(btrim(p_title), '') is null
     or char_length(btrim(p_title)) > 180 then
    raise exception using
      errcode = '22023',
      message =
        'ARCTOR_E02_LOCALIZED_TITLE_INVALID';
  end if;

  if p_description is not null
     and char_length(p_description) > 4000 then
    raise exception using
      errcode = '22023',
      message =
        'ARCTOR_E02_DESCRIPTION_TOO_LONG';
  end if;

  if p_description_en is not null
     and char_length(p_description_en) > 4000 then
    raise exception using
      errcode = '22023',
      message =
        'ARCTOR_E02_ENGLISH_DESCRIPTION_TOO_LONG';
  end if;

  if p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message =
        'ARCTOR_E02_FINGERPRINT_INVALID';
  end if;

  if jsonb_typeof(p_parameters) <> 'array'
     or jsonb_array_length(p_parameters) < 1 then
    raise exception using
      errcode = '22023',
      message =
        'ARCTOR_E02_PARAMETERS_REQUIRED';
  end if;

  if jsonb_typeof(p_links) <> 'array'
     or jsonb_array_length(p_links) < 1 then
    raise exception using
      errcode = '22023',
      message =
        'ARCTOR_E02_LINKS_REQUIRED';
  end if;

  -- ----------------------------------------------------------
  -- ADMIN PROVENANCE
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.platform_admins admin_row
    where admin_row.id = p_curator_admin_id
      and admin_row.app_user_id =
        p_curator_app_user_id
      and admin_row.status = 'active'
      and admin_row.role = p_curator_role
  ) then
    raise exception using
      errcode = '42501',
      message =
        'ARCTOR_E02_ACTIVE_PLATFORM_ADMIN_REQUIRED';
  end if;

  -- ----------------------------------------------------------
  -- BUILD MACHINE-READABLE IDS FOR METADATA
  -- ----------------------------------------------------------

  select coalesce(
    jsonb_agg(
      item ->> 'parameterDefinitionId'
      order by ordinality
    ),
    '[]'::jsonb
  )
  into v_parameter_ids
  from jsonb_array_elements(p_parameters)
       with ordinality as rows(item, ordinality);

  select coalesce(
    jsonb_agg(
      item ->> 'targetValueObjectId'
      order by ordinality
    ),
    '[]'::jsonb
  )
  into v_target_ids
  from jsonb_array_elements(p_links)
       with ordinality as rows(item, ordinality);

  -- ----------------------------------------------------------
  -- LOCALIZATION ENVELOPE
  -- ----------------------------------------------------------

  if p_locale = 'en' then

    v_localizations :=
      jsonb_build_object(
        'en',
        jsonb_build_object(
          'title',
          btrim(p_title_en),

          'description',
          coalesce(
            nullif(btrim(p_description_en), ''),
            ''
          )
        )
      );

  else

    v_localizations :=
      jsonb_build_object(
        'en',
        jsonb_build_object(
          'title',
          btrim(p_title_en),

          'description',
          coalesce(
            nullif(btrim(p_description_en), ''),
            ''
          )
        ),

        p_locale,
        jsonb_build_object(
          'title',
          btrim(p_title),

          'description',
          coalesce(
            nullif(btrim(p_description), ''),
            ''
          )
        )
      );

  end if;

  -- ----------------------------------------------------------
  -- STABLE SYSTEM SLUG
  --
  -- Human semantics live in titles / localization metadata.
  -- Slug is intentionally technical and stable.
  -- ----------------------------------------------------------

  v_system_slug :=
    'curator-system-' ||
    replace(
      p_source_signal_id::text,
      '-',
      ''
    );

  -- ----------------------------------------------------------
  -- FIND PREVIOUS MATERIALIZATION FOR THIS CURATOR JOURNEY
  -- ----------------------------------------------------------

  select template.*
  into v_existing
  from public.activity_templates template
  where template.default_metadata_json @>
    jsonb_build_object(
      'curatorSystemMaterializationV1',
      jsonb_build_object(
        'sourceSignalId',
        p_source_signal_id::text
      )
    )
  order by template.updated_at desc
  limit 1
  for update;

  if found then

    v_template_id := v_existing.id;

    v_existing_fingerprint :=
      v_existing.default_metadata_json
        -> 'curatorSystemMaterializationV1'
        ->> 'fingerprint';

    -- --------------------------------------------------------
    -- IDEMPOTENT REPLAY
    -- --------------------------------------------------------

    if v_existing_fingerprint = p_fingerprint
       and v_existing.template_scope = 'system'
       and v_existing.owner_user_id is null
       and v_existing.owner_actor_id is null
       and v_existing.organization_id is null
       and v_existing.status = 'active'
       and v_existing.is_active = true then

      select
        profile.id,
        profile.version_no,
        profile.routing_contract_code
      into
        v_profile_id,
        v_version_no,
        v_routing_contract_code
      from public.activity_template_impact_profiles_v1
        profile
      where profile.template_id = v_template_id
        and profile.status = 'active'
      order by profile.version_no desc
      limit 1;

      if v_profile_id is null then
        raise exception using
          errcode = '23514',
          message =
            'ARCTOR_E02_ACTIVE_PROFILE_MISSING_ON_REPLAY';
      end if;

      if v_routing_contract_code
           is distinct from
           'parameter_registry_v2' then
        raise exception using
          errcode = '23514',
          message =
            'ARCTOR_E02_PROFILE_ROUTING_CONTRACT_INVALID';
      end if;

      return jsonb_build_object(
        'contract',
        'ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1',

        'templateId',
        v_template_id,

        'profileId',
        v_profile_id,

        'versionNo',
        v_version_no,

        'routingContractCode',
        v_routing_contract_code,

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

    -- --------------------------------------------------------
    -- REVISION
    --
    -- Existing canonical V2 authoring is owner-based.
    -- Temporarily make the SAME template editable inside this
    -- transaction. No outside transaction can observe the
    -- temporary user state.
    -- --------------------------------------------------------

    v_temporary_user_slug :=
      'curator-edit-' ||
      replace(
        v_template_id::text,
        '-',
        ''
      );

    update public.activity_templates
    set
      template_scope = 'user',
      owner_user_id = p_curator_app_user_id,
      owner_actor_id = p_curator_actor_id,
      organization_id = null,

      slug = v_temporary_user_slug,

      visibility = 'private',
      source_type = 'user_created'
    where id = v_template_id;

  else

    v_template_id := null;

  end if;

  -- ----------------------------------------------------------
  -- CANONICAL V2 AUTHORING
  --
  -- Dynamic SQL deliberately reuses production RPC rather than
  -- duplicating its profile/version/routing implementation.
  -- ----------------------------------------------------------

  execute
    'select public.save_activity_template_impact_profile_v2(
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8,
       $9,
       $10
     )'
  into v_v2_result
  using
    p_curator_app_user_id,
    p_curator_actor_id,
    v_template_id,
    btrim(p_title_en),
    nullif(btrim(p_description_en), ''),
    'general'::text,
    null::integer,
    (
      'Reality Curator system materialization. ' ||
      'Source signal: ' ||
      p_source_signal_id::text
    ),
    p_parameters,
    p_links;

  if v_v2_result is null then
    raise exception using
      errcode = 'P0001',
      message =
        'ARCTOR_E02_V2_AUTHORING_RETURNED_NULL';
  end if;

  begin

    v_template_id :=
      nullif(
        v_v2_result ->> 'templateId',
        ''
      )::uuid;

  exception
    when others then

      raise exception using
        errcode = 'P0001',
        message =
          'ARCTOR_E02_V2_TEMPLATE_ID_INVALID';

  end;

  if v_template_id is null then
    raise exception using
      errcode = 'P0001',
      message =
        'ARCTOR_E02_V2_TEMPLATE_ID_MISSING';
  end if;

  -- ----------------------------------------------------------
  -- CANONICAL SYSTEM METADATA
  -- ----------------------------------------------------------

  v_system_metadata :=
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

      'curatorSystemMaterializationV1',
      jsonb_build_object(
        'contract',
        'ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1',

        'sourceSignalId',
        p_source_signal_id::text,

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
          when lower(btrim(p_title))
                 = lower(btrim(p_title_en))
          then jsonb_build_array(
            btrim(p_title_en)
          )
          else jsonb_build_array(
            btrim(p_title_en),
            btrim(p_title)
          )
        end,

        'parameterDefinitionIds',
        v_parameter_ids,

        'targetValueObjectIds',
        v_target_ids,

        'curatorAppUserId',
        p_curator_app_user_id,

        'curatorActorId',
        p_curator_actor_id,

        'curatorAdminId',
        p_curator_admin_id,

        'curatorRole',
        p_curator_role,

        'publicationState',
        'published_by_curator_confirmation',

        'publishedAt',
        v_now
      )
    );

  -- ----------------------------------------------------------
  -- PROMOTE TEMPLATE TO OWNERLESS SYSTEM CATALOG
  -- ----------------------------------------------------------

  update public.activity_templates
  set
    owner_user_id = null,
    owner_actor_id = null,
    organization_id = null,

    slug = v_system_slug,

    -- Canonical storage remains English.
    title = btrim(p_title_en),
    short_title = btrim(p_title_en),

    description =
      nullif(
        btrim(p_description_en),
        ''
      ),

    template_group = 'general',

    template_scope = 'system',
    visibility = 'public_template',
    source_type = 'system_seed',

    status = 'active',
    is_active = true,

    default_metadata_json =
      coalesce(
        default_metadata_json,
        '{}'::jsonb
      )
      ||
      v_system_metadata,

    updated_at = v_now

  where id = v_template_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message =
        'ARCTOR_E02_SYSTEM_TEMPLATE_PROMOTION_FAILED';
  end if;

  -- ----------------------------------------------------------
  -- VERIFY ACTIVE VERSION CREATED BY CANONICAL V2 RPC
  -- ----------------------------------------------------------

  select
    profile.id,
    profile.version_no,
    profile.routing_contract_code
  into
    v_profile_id,
    v_version_no,
    v_routing_contract_code
  from public.activity_template_impact_profiles_v1
    profile
  where profile.template_id = v_template_id
    and profile.status = 'active'
  order by profile.version_no desc
  limit 1;

  if v_profile_id is null then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_E02_ACTIVE_PROFILE_NOT_CREATED';
  end if;

  if v_routing_contract_code
       is distinct from
       'parameter_registry_v2' then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_E02_PROFILE_ROUTING_CONTRACT_INVALID';
  end if;

  -- ----------------------------------------------------------
  -- PROFILE PROVENANCE
  --
  -- Profile owner_user/owner_actor remain immutable authoring
  -- provenance required by the existing V2 foundation.
  -- They are NOT the runtime ownership of the SYSTEM template.
  -- ----------------------------------------------------------

  v_profile_metadata :=
    jsonb_build_object(
      'curatorSystemMaterializationV1',
      jsonb_build_object(
        'contract',
        'ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1',

        'sourceSignalId',
        p_source_signal_id::text,

        'fingerprint',
        p_fingerprint,

        'templateScope',
        'system',

        'parameterDefinitionIds',
        v_parameter_ids,

        'targetValueObjectIds',
        v_target_ids,

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
      )
    );

  update public.activity_template_impact_profiles_v1
  set
    metadata_json =
      coalesce(
        metadata_json,
        '{}'::jsonb
      )
      ||
      v_profile_metadata,

    updated_at = v_now
  where id = v_profile_id;

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
          'arctorTypicalActivity',
          jsonb_build_object(
            'kind',
            'typical_activity',

            'scope',
            'system',

            'catalogVersion',
            'reality_model_v1'
          )
        )
  ) then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_E02_SYSTEM_TEMPLATE_FINAL_INVARIANT_FAILED';
  end if;

  return jsonb_build_object(
    'contract',
    'ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1',

    'templateId',
    v_template_id,

    'profileId',
    v_profile_id,

    'versionNo',
    v_version_no,

    'routingContractCode',
    v_routing_contract_code,

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
public.save_curator_system_typical_activity_v1(
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
  jsonb,
  jsonb
)
from public, anon, authenticated;

grant execute
on function
public.save_curator_system_typical_activity_v1(
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
  jsonb,
  jsonb
)
to service_role;

comment on function
public.save_curator_system_typical_activity_v1(
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
  jsonb,
  jsonb
) is
  'Reuses canonical activity-template V2 authoring, creates/revises a versioned parameter_registry_v2 profile, and atomically promotes the resulting template to ownerless system scope after Reality Curator confirmation.';

commit;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- POSTCHECK
-- ------------------------------------------------------------

select jsonb_pretty(
  jsonb_build_object(
    'contract',
    'ARCTOR_CURATOR_SYSTEM_TYPICAL_ACTIVITY_MATERIALIZATION_V1',

    'canonicalV2RpcPresent',
    exists (
      select 1
      from pg_proc proc
      join pg_namespace ns
        on ns.oid = proc.pronamespace
      where ns.nspname = 'public'
        and proc.proname =
          'save_activity_template_impact_profile_v2'
    ),

    'systemMaterializationRpcPresent',
    to_regprocedure(
      'public.save_curator_system_typical_activity_v1(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,jsonb,jsonb)'
    ) is not null,

    'activityTemplatesPresent',
    to_regclass(
      'public.activity_templates'
    ) is not null,

    'profileTablePresent',
    to_regclass(
      'public.activity_template_impact_profiles_v1'
    ) is not null
  )
) as arctor_e02_postcheck;