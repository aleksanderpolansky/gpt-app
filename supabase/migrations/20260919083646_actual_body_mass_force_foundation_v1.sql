/*
ARCTor.app
ARCTOR_ACTUAL_BODY_MASS_FORCE_FOUNDATION_V1

Purpose
-------
1. Extend current system parameter dimension contract with generic Force.
2. Create/reuse:
   States and Needs
   -> States
   -> Anthropometric states [intermediate]
   -> Body mass [intermediate]
   -> Actual body mass [leaf].
3. Create/reuse generic system parameters:
   Mass / mass
   Force / force.
4. Assign through the EXISTING system assignment RPC:
   Mass  -> Actual body mass
   Force -> Mechanical load on the knee joint.

Important
---------
- NO mechanical_load_index.
- NO Score parameter.
- NO activity template changes.
- NO facts.
- NO formulas.
- NO Formula Executor.
- NO analytics/recommendations.
- NO new relation is created in this migration.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

-------------------------------------------------------------------------------
-- PREFLIGHT
-------------------------------------------------------------------------------

do $preflight$
declare
  v_bad_dimension_count bigint;
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_definition_versions') is null
     or to_regclass('public.value_object_kind_registry') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null
     or to_regclass('public.activity_processing_logs') is null
     or to_regclass('public.app_users') is null
     or to_regclass('public.platform_admins') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_ACTUAL_BODY_MASS_FORCE_REQUIRED_TABLES_MISSING';
  end if;

  if to_regprocedure(
    'public.save_system_value_object_parameter_assignment_set_v1(uuid,uuid[],uuid,uuid,text,text)'
  ) is null then
    raise exception using
      errcode = '42883',
      message = 'ARCTOR_ACTUAL_BODY_MASS_FORCE_ASSIGNMENT_RPC_MISSING';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.value_objects'::regclass
      and tgname = 'value_objects_definition_snapshot_p1c_trg'
      and not tgisinternal
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_ACTUAL_BODY_MASS_FORCE_DEFINITION_SNAPSHOT_TRIGGER_MISSING';
  end if;

  if not exists (
    select 1
    from public.value_object_kind_registry
    where object_kind_code = 'generic_state'
      and facet_code = 'STATE'
      and status = 'active'
      and allowed_node_roles_json @> '["intermediate"]'::jsonb
      and allowed_node_roles_json @> '["leaf"]'::jsonb
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_ACTUAL_BODY_MASS_FORCE_GENERIC_STATE_KIND_NOT_READY';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where id = '6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a'::uuid
      and canonical_key = 'system.states_and_needs.6a08d8afe9'
      and title = 'States and Needs'
      and ontology_node_role_code = 'root'
      and scope_code = 'global'
      and origin_type_code = 'system_model'
      and status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_ACTUAL_BODY_MASS_FORCE_STATES_NEEDS_ROOT_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where id = '2613b07c-36fb-537f-8cd8-058e15df28f7'::uuid
      and canonical_key = 'system.states.bf2031ffd0'
      and title = 'States'
      and parent_value_object_id =
        '6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a'::uuid
      and ontology_node_role_code = 'intermediate'
      and facet_code = 'STATE'
      and hierarchy_relation_code = 'is_a'
      and scope_code = 'global'
      and origin_type_code = 'system_model'
      and status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_ACTUAL_BODY_MASS_FORCE_STATES_PARENT_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where id = '9167369d-e4f8-5031-8ba5-eec94a29d559'::uuid
      and canonical_key =
        'system.mechanical_load_on_the_knee_joint.16e638c902'
      and title = 'Mechanical load on the knee joint'
      and ontology_node_role_code = 'leaf'
      and scope_code = 'global'
      and origin_type_code = 'system_model'
      and status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_ACTUAL_BODY_MASS_FORCE_KNEE_LOAD_TARGET_MISMATCH';
  end if;

  select count(*)
  into v_bad_dimension_count
  from public.value_object_parameter_definitions
  where dimension_code not in (
    'time',
    'distance',
    'count',
    'volume',
    'mass',
    'force',
    'energy',
    'money',
    'rate',
    'score',
    'temperature',
    'text',
    'boolean',
    'timestamp',
    'pressure',
    'ratio',
    'sound_level',
    'illuminance'
  );

  if v_bad_dimension_count <> 0 then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_UNKNOWN_EXISTING_DIMENSIONS:' ||
        v_bad_dimension_count::text;
  end if;
end
$preflight$;

-------------------------------------------------------------------------------
-- Extend the CURRENT open parameter registry.
--
-- The table already uses a check constraint for supported dimensions.
-- We preserve all dimensions supported by the current admin API and add force.
-------------------------------------------------------------------------------

alter table public.value_object_parameter_definitions
  drop constraint if exists
    value_object_parameter_definitions_dimension_check;

alter table public.value_object_parameter_definitions
  add constraint
    value_object_parameter_definitions_dimension_check
  check (
    dimension_code in (
      'time',
      'distance',
      'count',
      'volume',
      'mass',
      'force',
      'energy',
      'money',
      'rate',
      'score',
      'temperature',
      'text',
      'boolean',
      'timestamp',
      'pressure',
      'ratio',
      'sound_level',
      'illuminance'
    )
  );

-------------------------------------------------------------------------------
-- APPLY
-------------------------------------------------------------------------------

do $apply$
declare
  v_release constant text :=
    'ARCTOR_ACTUAL_BODY_MASS_FORCE_FOUNDATION_V1';

  v_creation_contract constant text :=
    'ARCTOR_REALITY_MODEL_CURATOR_ACTIVITY_TEMPLATE_BUILDER_V2_CANONICAL_ENGLISH_LOCALIZATION';

  v_root constant uuid :=
    '6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a';

  v_states constant uuid :=
    '2613b07c-36fb-537f-8cd8-058e15df28f7';

  v_anthropometric constant uuid :=
    '7a13b9c2-c10b-59ae-a621-3f99b82aba83';

  v_body_mass constant uuid :=
    'd573bb11-18b2-558c-97d6-199e9cf456b7';

  v_actual_body_mass constant uuid :=
    '3a9fd119-d915-595c-8d21-a36c3d16763b';

  v_knee_load constant uuid :=
    '9167369d-e4f8-5031-8ba5-eec94a29d559';

  v_anthropometric_key constant text :=
    'system.anthropometric_states.05b331cb8f';

  v_body_mass_key constant text :=
    'system.body_mass.10d98ab7c8';

  v_actual_body_mass_key constant text :=
    'system.actual_body_mass.61d1511f76';

  v_admin_user_id uuid;
  v_admin_id uuid;
  v_actor_id uuid;
  v_curator_role text;

  v_now timestamptz := clock_timestamp();

  v_spec record;
  v_meta jsonb;

  v_mass_definition_id uuid;
  v_force_definition_id uuid;

  v_mass_assignment jsonb;
  v_force_assignment jsonb;

  v_fact_count_before bigint;
  v_formula_series_before bigint;
  v_relation_count_before bigint;

  v_fact_count_after bigint;
  v_formula_series_after bigint;
  v_relation_count_after bigint;
begin

  ---------------------------------------------------------------------------
  -- Safety baseline
  ---------------------------------------------------------------------------

  select count(*)
  into v_fact_count_before
  from public.activity_object_facts;

  select count(*)
  into v_formula_series_before
  from public.activity_fact_calculation_rule_series_v1;

  select count(*)
  into v_relation_count_before
  from public.system_value_object_relations;

  ---------------------------------------------------------------------------
  -- Resolve real administrator provenance from an existing curator-built ON.
  ---------------------------------------------------------------------------

  select
    nullif(
      metadata_json
        #>> '{curator_system_draft_v1,curatorAppUserId}',
      ''
    )::uuid,

    nullif(
      metadata_json
        #>> '{curator_system_draft_v1,curatorAdminId}',
      ''
    )::uuid,

    nullif(
      metadata_json
        #>> '{curator_system_draft_v1,localizationRequestedByActorId}',
      ''
    )::uuid,

    nullif(
      metadata_json
        #>> '{curator_system_draft_v1,curatorRole}',
      ''
    )
  into
    v_admin_user_id,
    v_admin_id,
    v_actor_id,
    v_curator_role
  from public.value_objects
  where id = v_knee_load;

  if v_admin_user_id is null
     or v_admin_id is null
     or v_actor_id is null
     or v_curator_role is null then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_CURATOR_PROVENANCE_MISSING';
  end if;

  if not exists (
    select 1
    from public.app_users u
    where u.id = v_admin_user_id
  ) then
    raise exception using
      errcode = '42501',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_CURATOR_USER_INVALID';
  end if;

  if not exists (
    select 1
    from public.platform_admins pa
    where pa.id = v_admin_id
      and pa.app_user_id = v_admin_user_id
      and pa.status = 'active'
      and pa.role in ('owner', 'admin')
  ) then
    raise exception using
      errcode = '42501',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_ACTIVE_ADMIN_REQUIRED';
  end if;

  ---------------------------------------------------------------------------
  -- Full curator-equivalent System ON path.
  --
  -- Existing correct parents are reused.
  -- Missing nodes are created from top to bottom.
  ---------------------------------------------------------------------------

  for v_spec in
    select *
    from (
      values

      (
        v_anthropometric,
        v_anthropometric_key,
        'intermediate',
        v_states,
        'is_a',
        'Anthropometric states',
        'Measurable states describing body dimensions, mass, and other anthropometric characteristics of a person. This node is a structural category; numeric values are stored only in facts of leaf observation objects.',
        'Антропометрические состояния',
        'Измеряемые состояния, характеризующие размеры, массу и другие антропометрические характеристики тела человека. Узел служит структурной категорией; числовые значения хранятся только в фактах листовых объектов наблюдения.',
        '5A73A7737A0F4ADC4C879C32B6C2F04FA1BAF50A0739F7F5F36CF2E12FD6A1A4',
        '625cbd5e-714c-5d9c-b23c-66b38e4a05c8'::uuid,
        'Создан системный промежуточный узел для точного размещения антропометрических состояний человека. Числовые значения в этот узел не записываются.',
        'Created as a system intermediate node for precise placement of human anthropometric states. Numeric values are not written to this node.'
      ),

      (
        v_body_mass,
        v_body_mass_key,
        'intermediate',
        v_anthropometric,
        'is_a',
        'Body mass',
        'A structural category for states concerning a person''s body mass. The specific meaning of a value—actual, desired, critical, or another body-mass state—is defined by a child leaf observation object.',
        'Масса тела',
        'Структурная категория состояний, относящихся к массе тела человека. Конкретный смысл значения — фактическая, желаемая, критическая или иная масса — задаётся дочерним листовым объектом наблюдения.',
        '74EB20B44FA6F2D09636CE44A60CFB5E668D8C6C482C1E89CC46C48F819CB88B',
        '7e4fe3ca-fbc8-57ba-9a10-d5d7f323f694'::uuid,
        'Создан промежуточный ОН «Масса тела», чтобы фактическая, желаемая, критическая и другие семантически разные массы могли быть отдельными листовыми ОН.',
        'Created as the intermediate Body mass ON so actual, desired, critical, and other semantically distinct body-mass states can be separate leaf ONs.'
      ),

      (
        v_actual_body_mass,
        v_actual_body_mass_key,
        'leaf',
        v_body_mass,
        'is_a',
        'Actual body mass',
        'The actually observed body mass of a person at the time of measurement. The numeric value is stored in a fact with the Mass parameter and a mass unit; historical values remain facts of this same observation object.',
        'Фактическая масса тела',
        'Фактически наблюдаемая масса тела человека на момент измерения. Числовое значение хранится в факте с параметром «Масса» и единицей массы; исторические значения остаются фактами этого же объекта наблюдения.',
        '9B65E75F60E8AD674F4CE2E8EC4E797B8B6BB6EDFB1DE8D4A818AAFF77CFA0C7',
        'a63b9445-1ec2-5ca4-b2dd-bbba970f52c6'::uuid,
        'Создан точный листовой ОН для фактически измеренной массы тела. Семантика «фактическая» хранится в ОН, а числовое значение — только в факте.',
        'Created as the precise leaf ON for actually measured body mass. The actual-state semantics are stored in the ON, while the numeric value is stored only in the fact.'
      )

    ) as object_spec(
      object_id,
      canonical_key,
      node_role,
      parent_id,
      hierarchy_relation,
      title_en,
      description_en,
      title_ru,
      description_ru,
      request_hash,
      audit_id,
      comment_ru,
      comment_en
    )
  loop

    -------------------------------------------------------------------------
    -- Reuse-first / conflict guard.
    -------------------------------------------------------------------------

    if exists (
      select 1
      from public.value_objects vo
      where vo.canonical_key = v_spec.canonical_key
        and vo.id <> v_spec.object_id
    ) then
      raise exception using
        errcode = '23505',
        message =
          'ARCTOR_ACTUAL_BODY_MASS_FORCE_CANONICAL_CONFLICT:' ||
          v_spec.canonical_key;
    end if;

    if exists (
      select 1
      from public.value_objects vo
      where lower(vo.title) = lower(v_spec.title_en)
        and vo.scope_code = 'global'
        and vo.origin_type_code = 'system_model'
        and vo.id <> v_spec.object_id
    ) then
      raise exception using
        errcode = '23505',
        message =
          'ARCTOR_ACTUAL_BODY_MASS_FORCE_TITLE_CONFLICT:' ||
          v_spec.title_en;
    end if;

    -------------------------------------------------------------------------
    -- Manual-curator-equivalent metadata.
    -------------------------------------------------------------------------

    v_meta :=
      jsonb_build_object(

        'localizedContent',
          jsonb_build_object(
            'schemaVersion', 2,
            'detectedSourceLocale', 'en',
            'sourceLocaleHint', 'en',
            'sourceRevision',
              case v_spec.object_id
                when v_anthropometric then '3b048ee3a58e56029afa8114df18aca9b5c7daf858cd32cbe5279feb0c4f1f2e'
                when v_body_mass then '4e910cbdad1852f2fac1d2a0e57c329f8660b5f42e7c885914bfbff4a8ba78ed'
                when v_actual_body_mass then '0838881afa82346fcdfc0278731c19e5ad9f1ad2553a1bfb2952c395687daf98'
                else lower(v_spec.request_hash)
              end,
            'fieldCodes', jsonb_build_array('title', 'description'),

            'original',
              jsonb_build_object(
                'title', v_spec.title_en,
                'description', v_spec.description_en
              ),

            'variants',
              jsonb_build_object(
                'en',
                  jsonb_build_object(
                    'title', v_spec.title_en,
                    'description', v_spec.description_en
                  ),

                'ru',
                  jsonb_build_object(
                    'title', v_spec.title_ru,
                    'description', v_spec.description_ru
                  ),

                'pl',
                  jsonb_build_object(
                    'title', null,
                    'description', null
                  ),

                'uk',
                  jsonb_build_object(
                    'title', null,
                    'description', null
                  ),

                'de',
                  jsonb_build_object(
                    'title', null,
                    'description', null
                  ),

                'es',
                  jsonb_build_object(
                    'title', null,
                    'description', null
                  ),

                'cs',
                  jsonb_build_object(
                    'title', null,
                    'description', null
                  )
              ),

            'humanLocales',
              jsonb_build_array('en', 'ru'),

            'lastEditedLocale',
              'ru',

            'generatedAt',
              v_now::text,

            'provider',
              'human',

            'model',
              null,

            'responseId',
              null,

            'usage',
              jsonb_build_object(
                'inputTokens', 0,
                'cachedInputTokens', 0,
                'outputTokens', 0,
                'totalTokens', 0
              )
          ),

        'contentLocalizationRuntime',
          'ARCTOR_CONTENT_LOCALIZATION_V1',

        'systemValueObjectLocalizationRuntime',
          'ARCTOR_SYSTEM_VALUE_OBJECT_CANONICAL_ENGLISH_LOCALIZATION_V1',

        'curator_system_draft_v1',
          jsonb_build_object(
            'contract', v_creation_contract,
            'requestHash', v_spec.request_hash,
            'rawSignalId', null,

            'curatorAppUserId',
              v_admin_user_id,

            'curatorAdminId',
              v_admin_id,

            'curatorRole',
              v_curator_role,

            'createdAt',
              v_now::text,

            'publicationState',
              'published_by_curator_confirmation',

            'publishedAt',
              v_now::text,

            'canonicalKeyMode',
              'server_generated_v1',

            'canonicalLocale',
              'en',

            'creationLocale',
              'ru',

            'localizationState',
              'pending',

            'localizationLocales',
              jsonb_build_array('en', 'ru'),

            'localizationMissingLocales',
              jsonb_build_array(
                'pl',
                'uk',
                'de',
                'es',
                'cs'
              ),

            'localizationAttemptCount',
              0,

            'localizationQueuedAt',
              v_now::text,

            'localizationLastAttemptAt',
              null,

            'localizationNextAttemptAt',
              v_now::text,

            'localizationLastError',
              null,

            'localizationCompletedAt',
              null,

            'localizationRequestedByUserId',
              v_admin_user_id,

            'localizationRequestedByActorId',
              v_actor_id,

            'nodeRole',
              v_spec.node_role,

            'localizations',
              jsonb_build_object(
                'en',
                  jsonb_build_object(
                    'title', v_spec.title_en,
                    'description', v_spec.description_en
                  ),

                'ru',
                  jsonb_build_object(
                    'title', v_spec.title_ru,
                    'description', v_spec.description_ru
                  )
              )
          ),

        'systemMigrationV1',
          jsonb_build_object(
            'release', v_release,
            'approvedByAdminUserId', v_admin_user_id,
            'createdAt', v_now::text,
            'creationCommentRu', v_spec.comment_ru,
            'creationCommentEn', v_spec.comment_en
          )
      );

    -------------------------------------------------------------------------
    -- Create only if missing.
    -------------------------------------------------------------------------

    if not exists (
      select 1
      from public.value_objects
      where id = v_spec.object_id
    ) then

      insert into public.value_objects (
        id,
        owner_actor_id,
        value_type,
        title,
        description,
        organization_id,
        commercial_usage,
        parent_value_object_id,
        actor_id,
        app_user_id,
        owner_user_id,
        visibility,
        source,
        usage_scope,
        created_by_actor_id,
        object_kind,
        node_role_code,
        branch_type_code,
        root_value_object_id,
        instance_of_value_object_id,
        privacy_level,
        sensitivity_level,
        status,
        canonical_key,
        facet_code,
        object_kind_code,
        ontology_node_role_code,
        hierarchy_relation_code,
        scope_code,
        visibility_code,
        privacy_class_code,
        definition_version,
        origin_type_code,
        metadata_json,
        identity_attributes_json
      )
      values (
        v_spec.object_id,
        null,
        'other',
        v_spec.title_en,
        v_spec.description_en,
        null,
        'none',
        v_spec.parent_id,
        null,
        null,
        null,
        'public',
        'manual',
        'private',
        null,
        'other',
        'structural',
        'ontology_v1',
        v_root,
        null,
        'public',
        'standard',
        'active',
        v_spec.canonical_key,
        'STATE',
        'generic_state',
        v_spec.node_role,
        v_spec.hierarchy_relation,
        'global',
        'public',
        'public_ontology',
        1,
        'system_model',
        v_meta,
        '{}'::jsonb
      );
    end if;

    -------------------------------------------------------------------------
    -- Equivalent creation evidence.
    -------------------------------------------------------------------------

    insert into public.activity_processing_logs (
      id,
      user_id,
      processor_name,
      processor_version,
      processing_stage,
      processing_status,
      severity,
      message,
      input_json,
      output_json,
      error_json,
      metadata_json,
      started_at,
      finished_at,
      duration_ms
    )
    values (
      v_spec.audit_id,
      v_admin_user_id,
      'system_ontology_migration',
      '1',
      'validate',
      'completed',
      'notice',
      'System observation object created: ' || v_spec.title_en,
      '{}'::jsonb,
      jsonb_build_object(
        'valueObjectId',
        v_spec.object_id
      ),
      '{}'::jsonb,
      jsonb_build_object(
        'contract', v_release,
        'eventCode', 'system_observation_object_created',
        'provenance', 'controlled_system_migration',

        'curatorAppUserId',
          v_admin_user_id,

        'curatorAdminId',
          v_admin_id,

        'curatorRole',
          v_curator_role,

        'createdNodeRole',
          v_spec.node_role,

        'createdValueObjectId',
          v_spec.object_id,

        'createdCanonicalKey',
          v_spec.canonical_key,

        'createdLocalizedTitle',
          v_spec.title_ru,

        'createdEnglishTitle',
          v_spec.title_en,

        'createdLocalizedDescription',
          v_spec.description_ru,

        'createdEnglishDescription',
          v_spec.description_en,

        'parentValueObjectId',
          v_spec.parent_id,

        'hierarchyRelationCode',
          v_spec.hierarchy_relation,

        'curatorComment',
          v_spec.comment_ru
      ),
      v_now,
      v_now,
      0
    )
    on conflict (id) do nothing;

  end loop;

  ---------------------------------------------------------------------------
  -- Strong object postchecks.
  ---------------------------------------------------------------------------

  if not exists (
    select 1
    from public.value_objects
    where id = v_anthropometric
      and canonical_key = v_anthropometric_key
      and title = 'Anthropometric states'
      and parent_value_object_id = v_states
      and root_value_object_id = v_root
      and ontology_node_role_code = 'intermediate'
      and hierarchy_relation_code = 'is_a'
      and facet_code = 'STATE'
      and object_kind_code = 'generic_state'
      and scope_code = 'global'
      and origin_type_code = 'system_model'
      and status = 'active'
      and definition_version = 1
      and metadata_json
        #>> '{curator_system_draft_v1,localizations,ru,title}'
          = 'Антропометрические состояния'
      and metadata_json
        #>> '{curator_system_draft_v1,localizations,en,title}'
          = 'Anthropometric states'
  ) then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_ANTHROPOMETRIC_POSTCHECK_FAILED';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where id = v_body_mass
      and canonical_key = v_body_mass_key
      and title = 'Body mass'
      and parent_value_object_id = v_anthropometric
      and root_value_object_id = v_root
      and ontology_node_role_code = 'intermediate'
      and hierarchy_relation_code = 'is_a'
      and facet_code = 'STATE'
      and object_kind_code = 'generic_state'
      and scope_code = 'global'
      and origin_type_code = 'system_model'
      and status = 'active'
      and definition_version = 1
      and metadata_json
        #>> '{curator_system_draft_v1,localizations,ru,title}'
          = 'Масса тела'
      and metadata_json
        #>> '{curator_system_draft_v1,localizations,en,title}'
          = 'Body mass'
  ) then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_BODY_MASS_POSTCHECK_FAILED';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where id = v_actual_body_mass
      and canonical_key = v_actual_body_mass_key
      and title = 'Actual body mass'
      and parent_value_object_id = v_body_mass
      and root_value_object_id = v_root
      and ontology_node_role_code = 'leaf'
      and hierarchy_relation_code = 'is_a'
      and facet_code = 'STATE'
      and object_kind_code = 'generic_state'
      and scope_code = 'global'
      and origin_type_code = 'system_model'
      and status = 'active'
      and definition_version = 1
      and metadata_json
        #>> '{curator_system_draft_v1,localizations,ru,title}'
          = 'Фактическая масса тела'
      and metadata_json
        #>> '{curator_system_draft_v1,localizations,en,title}'
          = 'Actual body mass'
  ) then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_ACTUAL_BODY_MASS_POSTCHECK_FAILED';
  end if;

  if (
    select count(*)
    from public.value_object_definition_versions
    where value_object_id in (
      v_anthropometric,
      v_body_mass,
      v_actual_body_mass
    )
      and version = 1
  ) <> 3 then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_DEFINITION_SNAPSHOT_POSTCHECK_FAILED';
  end if;

  ---------------------------------------------------------------------------
  -- Generic parameter Mass.
  --
  -- Meaning is generic; Actual-body semantics remain in the leaf ON.
  ---------------------------------------------------------------------------

  if exists (
    select 1
    from public.value_object_parameter_definitions
    where parameter_code = 'mass'
      and (
        scope_code <> 'system'
        or status <> 'active'
        or title <> 'Масса'
        or description <>
          'Масса объекта, вещества или тела; предмет измерения определяется связанным листовым объектом наблюдения.'
        or dimension_code <> 'mass'
        or value_type_code <> 'numeric'
        or canonical_unit_code <> 'kilogram'
        or allowed_unit_codes <> '["gram","kilogram"]'::jsonb
        or aggregation_method_code <> 'latest'
        or default_window_code <> 'event'
        or allow_negative <> false
      )
  ) then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_MASS_PARAMETER_CONFLICT';
  end if;

  if not exists (
    select 1
    from public.value_object_parameter_definitions
    where parameter_code = 'mass'
  ) then
    insert into public.value_object_parameter_definitions (
      scope_code,
      parameter_code,
      owner_user_id,
      owner_actor_id,
      created_by_actor_id,
      title,
      description,
      dimension_code,
      value_type_code,
      canonical_unit_code,
      allowed_unit_codes,
      aggregation_method_code,
      default_window_code,
      allow_negative,
      validation_json,
      source_version,
      status,
      metadata_json
    )
    values (
      'system',
      'mass',
      null,
      null,
      null,
      'Масса',
      'Масса объекта, вещества или тела; предмет измерения определяется связанным листовым объектом наблюдения.',
      'mass',
      'numeric',
      'kilogram',
      '["gram","kilogram"]'::jsonb,
      'latest',
      'event',
      false,
      '{}'::jsonb,
      'admin-parameter-catalog-v1',
      'active',
      jsonb_build_object(
        'authoring_surface',
          'admin-activity-parameter-definitions-v1',

        'created_by_app_user_id',
          v_admin_user_id,

        'systemMigrationV1',
          jsonb_build_object(
            'release', v_release,
            'createdAt', v_now::text,
            'semanticRule',
              'linked_leaf_observation_object_defines_measured_subject'
          )
      )
    );
  end if;

  select id
  into v_mass_definition_id
  from public.value_object_parameter_definitions
  where scope_code = 'system'
    and parameter_code = 'mass'
    and status = 'active';

  if v_mass_definition_id is null then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_MASS_PARAMETER_MISSING';
  end if;

  ---------------------------------------------------------------------------
  -- Generic parameter Force.
  ---------------------------------------------------------------------------

  if exists (
    select 1
    from public.value_object_parameter_definitions
    where parameter_code = 'force'
      and (
        scope_code <> 'system'
        or status <> 'active'
        or title <> 'Сила'
        or description <>
          'Механическая сила; объект воздействия и точный смысл измерения определяются связанным листовым объектом наблюдения.'
        or dimension_code <> 'force'
        or value_type_code <> 'numeric'
        or canonical_unit_code <> 'newton'
        or allowed_unit_codes <> '["newton"]'::jsonb
        or aggregation_method_code <> 'none'
        or default_window_code <> 'event'
        or allow_negative <> false
      )
  ) then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_FORCE_PARAMETER_CONFLICT';
  end if;

  if not exists (
    select 1
    from public.value_object_parameter_definitions
    where parameter_code = 'force'
  ) then
    insert into public.value_object_parameter_definitions (
      scope_code,
      parameter_code,
      owner_user_id,
      owner_actor_id,
      created_by_actor_id,
      title,
      description,
      dimension_code,
      value_type_code,
      canonical_unit_code,
      allowed_unit_codes,
      aggregation_method_code,
      default_window_code,
      allow_negative,
      validation_json,
      source_version,
      status,
      metadata_json
    )
    values (
      'system',
      'force',
      null,
      null,
      null,
      'Сила',
      'Механическая сила; объект воздействия и точный смысл измерения определяются связанным листовым объектом наблюдения.',
      'force',
      'numeric',
      'newton',
      '["newton"]'::jsonb,
      'none',
      'event',
      false,
      '{}'::jsonb,
      'admin-parameter-catalog-v1',
      'active',
      jsonb_build_object(
        'authoring_surface',
          'admin-activity-parameter-definitions-v1',

        'created_by_app_user_id',
          v_admin_user_id,

        'systemMigrationV1',
          jsonb_build_object(
            'release', v_release,
            'createdAt', v_now::text,
            'semanticRule',
              'linked_leaf_observation_object_defines_force_context'
          )
      )
    );
  end if;

  select id
  into v_force_definition_id
  from public.value_object_parameter_definitions
  where scope_code = 'system'
    and parameter_code = 'force'
    and status = 'active';

  if v_force_definition_id is null then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_FORCE_PARAMETER_MISSING';
  end if;

  ---------------------------------------------------------------------------
  -- Assign through the EXISTING curator materializer.
  ---------------------------------------------------------------------------

  select public.save_system_value_object_parameter_assignment_set_v1(
    v_mass_definition_id,
    array[v_actual_body_mass],
    v_admin_user_id,
    v_admin_id,
    v_curator_role,
    'ARCTOR_ACTUAL_BODY_MASS_FORCE_V1:MASS_TO_ACTUAL_BODY_MASS'
  )
  into v_mass_assignment;

  select public.save_system_value_object_parameter_assignment_set_v1(
    v_force_definition_id,
    array[v_knee_load],
    v_admin_user_id,
    v_admin_id,
    v_curator_role,
    'ARCTOR_ACTUAL_BODY_MASS_FORCE_V1:FORCE_TO_KNEE_MECHANICAL_LOAD'
  )
  into v_force_assignment;

  ---------------------------------------------------------------------------
  -- Assignment postchecks.
  ---------------------------------------------------------------------------

  if not exists (
    select 1
    from public.value_object_parameter_assignments
    where value_object_id = v_actual_body_mass
      and parameter_definition_id = v_mass_definition_id
      and status = 'active'
      and scope_code = 'system'
      and assignment_scope_code = 'system'
      and owner_user_id is null
      and owner_actor_id is null
  ) then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_MASS_ASSIGNMENT_FAILED';
  end if;

  if not exists (
    select 1
    from public.value_object_parameter_assignments
    where value_object_id = v_knee_load
      and parameter_definition_id = v_force_definition_id
      and status = 'active'
      and scope_code = 'system'
      and assignment_scope_code = 'system'
      and owner_user_id is null
      and owner_actor_id is null
  ) then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_FORCE_ASSIGNMENT_FAILED';
  end if;

  ---------------------------------------------------------------------------
  -- Explicitly guard against revival of the rejected score/index model.
  ---------------------------------------------------------------------------

  if exists (
    select 1
    from public.value_object_parameter_definitions
    where parameter_code = 'mechanical_load_index'
      and status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_REJECTED_MECHANICAL_LOAD_INDEX_ACTIVE';
  end if;

  ---------------------------------------------------------------------------
  -- This APPLY must not touch facts, formula series or semantic relations.
  ---------------------------------------------------------------------------

  select count(*)
  into v_fact_count_after
  from public.activity_object_facts;

  select count(*)
  into v_formula_series_after
  from public.activity_fact_calculation_rule_series_v1;

  select count(*)
  into v_relation_count_after
  from public.system_value_object_relations;

  if v_fact_count_after <> v_fact_count_before then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_UNEXPECTED_FACT_WRITE';
  end if;

  if v_formula_series_after <> v_formula_series_before then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_UNEXPECTED_FORMULA_WRITE';
  end if;

  if v_relation_count_after <> v_relation_count_before then
    raise exception using
      errcode = '23514',
      message =
        'ARCTOR_ACTUAL_BODY_MASS_FORCE_UNEXPECTED_RELATION_WRITE';
  end if;

end
$apply$;

commit;

-------------------------------------------------------------------------------
-- FINAL RESULT
-------------------------------------------------------------------------------

select
  case
    when
      (
        select count(*)
        from public.value_objects
        where id in (
          '7a13b9c2-c10b-59ae-a621-3f99b82aba83'::uuid,
          'd573bb11-18b2-558c-97d6-199e9cf456b7'::uuid,
          '3a9fd119-d915-595c-8d21-a36c3d16763b'::uuid
        )
          and status = 'active'
      ) = 3

      and (
        select count(*)
        from public.value_object_definition_versions
        where value_object_id in (
          '7a13b9c2-c10b-59ae-a621-3f99b82aba83'::uuid,
          'd573bb11-18b2-558c-97d6-199e9cf456b7'::uuid,
          '3a9fd119-d915-595c-8d21-a36c3d16763b'::uuid
        )
          and version = 1
      ) = 3

      and (
        select count(*)
        from public.value_object_parameter_definitions
        where scope_code = 'system'
          and parameter_code in ('mass', 'force')
          and status = 'active'
      ) = 2

      and exists (
        select 1
        from public.value_object_parameter_assignments a
        join public.value_object_parameter_definitions p
          on p.id = a.parameter_definition_id
        where a.value_object_id =
          '3a9fd119-d915-595c-8d21-a36c3d16763b'::uuid
          and p.parameter_code = 'mass'
          and a.status = 'active'
          and a.scope_code = 'system'
          and a.assignment_scope_code = 'system'
      )

      and exists (
        select 1
        from public.value_object_parameter_assignments a
        join public.value_object_parameter_definitions p
          on p.id = a.parameter_definition_id
        where a.value_object_id =
          '9167369d-e4f8-5031-8ba5-eec94a29d559'::uuid
          and p.parameter_code = 'force'
          and a.status = 'active'
          and a.scope_code = 'system'
          and a.assignment_scope_code = 'system'
      )

    then 'PASS'
    else 'FAIL'
  end as result,

  (
    select ontology_node_role_code
    from public.value_objects
    where id =
      '7a13b9c2-c10b-59ae-a621-3f99b82aba83'::uuid
  ) as anthropometric_states_role,

  (
    select ontology_node_role_code
    from public.value_objects
    where id =
      'd573bb11-18b2-558c-97d6-199e9cf456b7'::uuid
  ) as body_mass_role,

  (
    select ontology_node_role_code
    from public.value_objects
    where id =
      '3a9fd119-d915-595c-8d21-a36c3d16763b'::uuid
  ) as actual_body_mass_role,

  (
    select count(*)
    from public.value_object_parameter_definitions
    where scope_code = 'system'
      and parameter_code in ('mass', 'force')
      and status = 'active'
  ) as expected_parameters,

  (
    select count(*)
    from public.value_object_parameter_assignments a
    join public.value_object_parameter_definitions p
      on p.id = a.parameter_definition_id
    where a.status = 'active'
      and (
        (
          a.value_object_id =
            '3a9fd119-d915-595c-8d21-a36c3d16763b'::uuid
          and p.parameter_code = 'mass'
        )
        or
        (
          a.value_object_id =
            '9167369d-e4f8-5031-8ba5-eec94a29d559'::uuid
          and p.parameter_code = 'force'
        )
      )
  ) as expected_assignments;