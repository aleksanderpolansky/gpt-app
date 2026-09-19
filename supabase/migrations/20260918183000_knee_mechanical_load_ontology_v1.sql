-- ARCTOR_KNEE_MECHANICAL_LOAD_ONTOLOGY_V1_0_2
-- Relation registry hotfix based on production inventory 2026-09-18.
-- Save in repo as:
-- supabase/migrations/20260918183000_knee_mechanical_load_ontology_v1.sql
--
-- IMPORTANT:
-- Apply through Supabase SQL Editor / equivalent administrative SQL channel.
-- Do NOT use db push: ARCTor migration-history bootstrap is intentionally not normalized.
--
-- This migration:
-- 1) reuses States and Needs > States;
-- 2) creates Loads [intermediate];
-- 3) creates Mechanical load [leaf];
-- 4) safely promotes Knee joint leaf -> intermediate;
-- 5) changes Knee joint structural parent relation is_a -> part_of;
-- 6) creates Mechanical load on the knee joint [leaf, aspect_of];
-- 7) retires the obsolete Knee joint related_to One-storey stair ascent link;
-- 8) registers classified_as;
-- 9) creates:
--      Mechanical load on the knee joint classified_as Mechanical load
--      One-storey stair ascent influences Mechanical load on the knee joint
-- 10) writes curator-compatible RU+EN localization fields, ontology snapshots,
--     migration provenance and administrator audit records.
--
-- It does NOT create mechanical_load_index, parameters, formulas or facts.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '180s';

do $migration$
declare
  v_release constant text :=
    'ARCTOR_KNEE_MECHANICAL_LOAD_ONTOLOGY_V1';

  v_creation_contract constant text :=
    'ARCTOR_REALITY_MODEL_CURATOR_ACTIVITY_TEMPLATE_BUILDER_V2_CANONICAL_ENGLISH_LOCALIZATION';

  v_systems_root constant uuid :=
    '1f86ed22-e220-562a-b2a4-341abf5c5780';
  v_states_needs_root constant uuid :=
    '6ba4ecf1-8a05-5eaa-b280-4eb7aff2a42a';
  v_states constant uuid :=
    '2613b07c-36fb-537f-8cd8-058e15df28f7';
  v_lower_limb_joints constant uuid :=
    '26a4fdd3-85bf-52be-91a9-84746db351bb';
  v_knee constant uuid :=
    '585e2177-e036-5a5a-a6d4-26ae3c14349e';
  v_one_storey constant uuid :=
    'dd9f05a6-112d-5237-80c7-38d012da8a75';

  v_old_relation constant uuid :=
    '34f117bf-c391-4bda-9996-123ee23f01ce';

  v_loads constant uuid :=
    'da692011-357b-502f-b44f-d916d695d017';
  v_mechanical_load constant uuid :=
    'c525f501-f714-5ee7-a489-9c4b408d2478';
  v_knee_load constant uuid :=
    '9167369d-e4f8-5031-8ba5-eec94a29d559';

  v_classified_relation constant uuid :=
    '1bb2afd0-e257-551c-9916-1cefbfaf3e8a';
  v_influence_relation constant uuid :=
    'a8d2ff0e-cb7b-5a84-a328-58fde2aeefbc';

  v_loads_key constant text :=
    'system.loads.632708fafd';
  v_mechanical_load_key constant text :=
    'system.mechanical_load.b84609501e';
  v_knee_load_key constant text :=
    'system.mechanical_load_on_the_knee_joint.16e638c902';

  v_now timestamptz := clock_timestamp();

  v_knee_row public.value_objects%rowtype;
  v_old_relation_row public.system_value_object_relations%rowtype;

  v_admin_user_id uuid;
  v_admin_id uuid;
  v_actor_id uuid;
  v_curator_role text;

  v_count bigint;
  v_knee_version_before integer;
  v_knee_version_after integer;

  v_knee_meta jsonb;

  v_loads_meta jsonb;
  v_mechanical_load_meta jsonb;
  v_knee_load_meta jsonb;
begin
  ---------------------------------------------------------------------------
  -- PRECHECK: required tables / triggers / current objects
  ---------------------------------------------------------------------------

  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_definition_versions') is null
     or to_regclass('public.value_object_parameter_assignments') is null
     or to_regclass('public.activity_object_facts') is null
     or to_regclass('public.value_object_relation_types') is null
     or to_regclass('public.system_value_object_relations') is null
     or to_regclass('public.activity_processing_logs') is null
     or to_regclass('public.platform_admins') is null
     or to_regclass('public.app_users') is null then
    raise exception using
      errcode = '42P01',
      message = 'ARCTOR_KNEE_LOAD_REQUIRED_TABLE_MISSING';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.value_objects'::regclass
      and tgname = 'value_objects_ontology_p1c_enforce_trg'
      and not tgisinternal
  ) then
    raise exception using
      errcode = '42704',
      message = 'ARCTOR_KNEE_LOAD_P1C_GUARD_TRIGGER_MISSING';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.value_objects'::regclass
      and tgname = 'value_objects_definition_snapshot_p1c_trg'
      and not tgisinternal
  ) then
    raise exception using
      errcode = '42704',
      message = 'ARCTOR_KNEE_LOAD_DEFINITION_SNAPSHOT_TRIGGER_MISSING';
  end if;

  select *
  into v_knee_row
  from public.value_objects
  where id = v_knee
  for update;

  if not found
     or v_knee_row.canonical_key <> 'system.knee_joint.3405704154'
     or v_knee_row.scope_code <> 'global'
     or v_knee_row.origin_type_code <> 'system_model'
     or v_knee_row.status <> 'active'
     or v_knee_row.parent_value_object_id is distinct from v_lower_limb_joints
     or v_knee_row.root_value_object_id is distinct from v_systems_root
     or v_knee_row.facet_code <> 'ENTITY'
     or v_knee_row.node_role_code <> 'structural'
     or v_knee_row.branch_type_code <> 'ontology_v1'
     or v_knee_row.ontology_node_role_code not in ('leaf','intermediate') then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_KNEE_BASELINE_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where id = v_states
      and canonical_key = 'system.states.bf2031ffd0'
      and scope_code = 'global'
      and origin_type_code = 'system_model'
      and status = 'active'
      and ontology_node_role_code = 'intermediate'
      and root_value_object_id = v_states_needs_root
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_STATES_BASELINE_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where id = v_lower_limb_joints
      and canonical_key = 'system.lower_limb_joints.f9937f332e'
      and scope_code = 'global'
      and origin_type_code = 'system_model'
      and status = 'active'
      and ontology_node_role_code = 'intermediate'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_LOWER_LIMB_JOINTS_BASELINE_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where id = v_one_storey
      and canonical_key = 'system.one_storey_stair_ascent.063898607f'
      and scope_code = 'global'
      and origin_type_code = 'system_model'
      and status = 'active'
      and ontology_node_role_code = 'leaf'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_ONE_STOREY_BASELINE_MISMATCH';
  end if;

  ---------------------------------------------------------------------------
  -- PRECHECK: Knee joint can be promoted safely
  ---------------------------------------------------------------------------

  select count(*)
  into v_count
  from public.activity_object_facts
  where value_object_id = v_knee;

  if v_count <> 0 then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_KNEE_HAS_DIRECT_FACTS';
  end if;

  select count(*)
  into v_count
  from public.value_object_parameter_assignments
  where value_object_id = v_knee;

  if v_count <> 0 then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_KNEE_HAS_PARAMETER_ASSIGNMENTS';
  end if;

  select count(*)
  into v_count
  from public.value_objects
  where parent_value_object_id = v_knee
    and id <> v_knee_load;

  if v_count <> 0 then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_KNEE_HAS_UNEXPECTED_CHILDREN';
  end if;

  select *
  into v_old_relation_row
  from public.system_value_object_relations
  where id = v_old_relation;

  if found then
    if v_old_relation_row.relation_type_code <> 'related_to'
       or v_old_relation_row.source_value_object_id is distinct from v_knee
       or v_old_relation_row.target_value_object_id is distinct from v_one_storey
       or v_old_relation_row.status not in ('active','inactive') then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_KNEE_LOAD_OLD_RELATION_MISMATCH';
    end if;
  elsif v_knee_row.ontology_node_role_code = 'leaf' then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_EXPECTED_OLD_RELATION_MISSING';
  end if;

  ---------------------------------------------------------------------------
  -- PRECHECK: deterministic identity / duplicate protection
  ---------------------------------------------------------------------------

  if exists (
    select 1
    from public.value_objects
    where canonical_key = v_loads_key
      and id <> v_loads
  ) then
    raise exception using
      errcode = '23505',
      message = 'ARCTOR_KNEE_LOAD_LOADS_CANONICAL_COLLISION';
  end if;

  if exists (
    select 1
    from public.value_objects
    where canonical_key = v_mechanical_load_key
      and id <> v_mechanical_load
  ) then
    raise exception using
      errcode = '23505',
      message = 'ARCTOR_KNEE_LOAD_MECHANICAL_LOAD_CANONICAL_COLLISION';
  end if;

  if exists (
    select 1
    from public.value_objects
    where canonical_key = v_knee_load_key
      and id <> v_knee_load
  ) then
    raise exception using
      errcode = '23505',
      message = 'ARCTOR_KNEE_LOAD_CONTEXT_LEAF_CANONICAL_COLLISION';
  end if;

  ---------------------------------------------------------------------------
  -- Resolve the real curator/admin provenance from the already-created Knee
  -- object. No personal IDs are hard-coded into this migration.
  ---------------------------------------------------------------------------

  begin
    v_admin_user_id :=
      nullif(
        v_knee_row.metadata_json
          #>> '{curator_system_draft_v1,curatorAppUserId}',
        ''
      )::uuid;

    v_admin_id :=
      nullif(
        v_knee_row.metadata_json
          #>> '{curator_system_draft_v1,curatorAdminId}',
        ''
      )::uuid;

    v_actor_id :=
      nullif(
        v_knee_row.metadata_json
          #>> '{curator_system_draft_v1,localizationRequestedByActorId}',
        ''
      )::uuid;

    v_curator_role :=
      nullif(
        v_knee_row.metadata_json
          #>> '{curator_system_draft_v1,curatorRole}',
        ''
      );
  exception
    when invalid_text_representation then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_KNEE_LOAD_CURATOR_PROVENANCE_INVALID';
  end;

  if v_admin_user_id is null
     or v_admin_id is null
     or v_actor_id is null
     or v_curator_role is null then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_CURATOR_PROVENANCE_MISSING';
  end if;

  if not exists (
    select 1
    from public.app_users u
    where u.id = v_admin_user_id
  ) or not exists (
    select 1
    from public.platform_admins pa
    where pa.id = v_admin_id
      and pa.app_user_id = v_admin_user_id
      and pa.status = 'active'
      and pa.role in ('owner','admin')
  ) then
    raise exception using
      errcode = '42501',
      message = 'ARCTOR_KNEE_LOAD_ACTIVE_ADMIN_PROVENANCE_REQUIRED';
  end if;

  ---------------------------------------------------------------------------
  -- Build curator-compatible metadata for the three new System ONs.
  -- Visible manual fields are present in both Russian and English:
  -- title, definition, role, parent and parent relation.
  ---------------------------------------------------------------------------

  v_loads_meta :=
    jsonb_build_object(
      'localizedContent',
      jsonb_build_object(
        'schemaVersion', 2,
        'detectedSourceLocale', 'en',
        'sourceLocaleHint', 'en',
        'sourceRevision',
          'a648db25975d0c6a5f696e2cf5011206b26e30e134a0a533b08d4d3eeb6c3a72',
        'fieldCodes', jsonb_build_array('title','description'),
        'original',
          jsonb_build_object(
            'title', 'Loads',
            'description',
              'States and conditions representing loads applied to objects, structures or systems.'
          ),
        'variants',
          jsonb_build_object(
            'en',
              jsonb_build_object(
                'title', 'Loads',
                'description',
                  'States and conditions representing loads applied to objects, structures or systems.'
              ),
            'ru',
              jsonb_build_object(
                'title', 'Нагрузки',
                'description',
                  'Состояния и условия, описывающие нагрузки, действующие на объекты, структуры или системы.'
              ),
            'pl', jsonb_build_object('title', null, 'description', null),
            'uk', jsonb_build_object('title', null, 'description', null),
            'de', jsonb_build_object('title', null, 'description', null),
            'es', jsonb_build_object('title', null, 'description', null),
            'cs', jsonb_build_object('title', null, 'description', null)
          ),
        'humanLocales', jsonb_build_array('en','ru'),
        'lastEditedLocale', 'ru',
        'generatedAt', v_now::text,
        'provider', 'human',
        'model', null,
        'responseId', null,
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
        'ARCTOR_SYSTEM_VALUE_OBJECT_CANONICAL_ENGLISH_LOCALIZATION_V2_QUEUE',
      'curator_system_draft_v1',
        jsonb_build_object(
          'contract', v_creation_contract,
          'requestHash',
            '93DD8CEBF423FAF7AAC75DBBC2D4068CC587ED277D8C7E30D193D58226A5E8F8',
          'rawSignalId', null,
          'curatorAppUserId', v_admin_user_id,
          'curatorAdminId', v_admin_id,
          'curatorRole', v_curator_role,
          'createdAt', v_now::text,
          'publicationState', 'published_by_curator_confirmation',
          'publishedAt', v_now::text,
          'canonicalKeyMode', 'server_generated_v1',
          'canonicalLocale', 'en',
          'creationLocale', 'ru',
          'localizationState', 'pending',
          'localizationLocales', jsonb_build_array('en','ru'),
          'localizationMissingLocales',
            jsonb_build_array('pl','uk','de','es','cs'),
          'localizationAttemptCount', 0,
          'localizationQueuedAt', v_now::text,
          'localizationLastAttemptAt', null,
          'localizationNextAttemptAt', v_now::text,
          'localizationLastError', null,
          'localizationCompletedAt', null,
          'localizationRequestedByUserId', v_admin_user_id,
          'localizationRequestedByActorId', v_actor_id,
          'nodeRole', 'intermediate',
          'localizations',
            jsonb_build_object(
              'en',
                jsonb_build_object(
                  'title', 'Loads',
                  'description',
                    'States and conditions representing loads applied to objects, structures or systems.'
                ),
              'ru',
                jsonb_build_object(
                  'title', 'Нагрузки',
                  'description',
                    'Состояния и условия, описывающие нагрузки, действующие на объекты, структуры или системы.'
                )
            )
        ),
      'systemMigrationV1',
        jsonb_build_object(
          'release', v_release,
          'approvedByAdminUserId', v_admin_user_id,
          'createdAt', v_now::text,
          'creationCommentRu',
            'Создано в рамках утверждённой корректировки системной онтологии ARCTor: добавлена общая ветка состояний для описания нагрузок.',
          'creationCommentEn',
            'Created as part of the approved ARCTor system ontology refinement: a reusable state branch for loads was added.'
        )
    );

  v_mechanical_load_meta :=
    jsonb_build_object(
      'localizedContent',
      jsonb_build_object(
        'schemaVersion', 2,
        'detectedSourceLocale', 'en',
        'sourceLocaleHint', 'en',
        'sourceRevision',
          '8961a0c21c030f19ef600f35fecf5c395eb97682cfb797ef667924263205be4d',
        'fieldCodes', jsonb_build_array('title','description'),
        'original',
          jsonb_build_object(
            'title', 'Mechanical load',
            'description',
              'A load produced by mechanical forces acting on an object, structure or system.'
          ),
        'variants',
          jsonb_build_object(
            'en',
              jsonb_build_object(
                'title', 'Mechanical load',
                'description',
                  'A load produced by mechanical forces acting on an object, structure or system.'
              ),
            'ru',
              jsonb_build_object(
                'title', 'Механическая нагрузка',
                'description',
                  'Нагрузка, возникающая вследствие действия механических сил на объект, структуру или систему.'
              ),
            'pl', jsonb_build_object('title', null, 'description', null),
            'uk', jsonb_build_object('title', null, 'description', null),
            'de', jsonb_build_object('title', null, 'description', null),
            'es', jsonb_build_object('title', null, 'description', null),
            'cs', jsonb_build_object('title', null, 'description', null)
          ),
        'humanLocales', jsonb_build_array('en','ru'),
        'lastEditedLocale', 'ru',
        'generatedAt', v_now::text,
        'provider', 'human',
        'model', null,
        'responseId', null,
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
        'ARCTOR_SYSTEM_VALUE_OBJECT_CANONICAL_ENGLISH_LOCALIZATION_V2_QUEUE',
      'curator_system_draft_v1',
        jsonb_build_object(
          'contract', v_creation_contract,
          'requestHash',
            '4B680C2FFA67E8BAFE0D76CE8F01C59D98785A9159B5B9DD73EE2D3E06B6ED3C',
          'rawSignalId', null,
          'curatorAppUserId', v_admin_user_id,
          'curatorAdminId', v_admin_id,
          'curatorRole', v_curator_role,
          'createdAt', v_now::text,
          'publicationState', 'published_by_curator_confirmation',
          'publishedAt', v_now::text,
          'canonicalKeyMode', 'server_generated_v1',
          'canonicalLocale', 'en',
          'creationLocale', 'ru',
          'localizationState', 'pending',
          'localizationLocales', jsonb_build_array('en','ru'),
          'localizationMissingLocales',
            jsonb_build_array('pl','uk','de','es','cs'),
          'localizationAttemptCount', 0,
          'localizationQueuedAt', v_now::text,
          'localizationLastAttemptAt', null,
          'localizationNextAttemptAt', v_now::text,
          'localizationLastError', null,
          'localizationCompletedAt', null,
          'localizationRequestedByUserId', v_admin_user_id,
          'localizationRequestedByActorId', v_actor_id,
          'nodeRole', 'leaf',
          'localizations',
            jsonb_build_object(
              'en',
                jsonb_build_object(
                  'title', 'Mechanical load',
                  'description',
                    'A load produced by mechanical forces acting on an object, structure or system.'
                ),
              'ru',
                jsonb_build_object(
                  'title', 'Механическая нагрузка',
                  'description',
                    'Нагрузка, возникающая вследствие действия механических сил на объект, структуру или систему.'
                )
            )
        ),
      'systemMigrationV1',
        jsonb_build_object(
          'release', v_release,
          'approvedByAdminUserId', v_admin_user_id,
          'createdAt', v_now::text,
          'creationCommentRu',
            'Создано как общий тип наблюдаемой механической нагрузки, независимый от конкретного анатомического объекта.',
          'creationCommentEn',
            'Created as a reusable observable mechanical-load type independent of a specific anatomical object.'
        )
    );

  v_knee_load_meta :=
    jsonb_build_object(
      'localizedContent',
      jsonb_build_object(
        'schemaVersion', 2,
        'detectedSourceLocale', 'en',
        'sourceLocaleHint', 'en',
        'sourceRevision',
          '4d1dabb0500772fb79f49492ffdeef9a2d4403916720d5ca619d4a8ff9e838dd',
        'fieldCodes', jsonb_build_array('title','description'),
        'original',
          jsonb_build_object(
            'title', 'Mechanical load on the knee joint',
            'description',
              'An observable aspect of the knee joint describing the mechanical load experienced by the joint during a specific event or time interval.'
          ),
        'variants',
          jsonb_build_object(
            'en',
              jsonb_build_object(
                'title', 'Mechanical load on the knee joint',
                'description',
                  'An observable aspect of the knee joint describing the mechanical load experienced by the joint during a specific event or time interval.'
              ),
            'ru',
              jsonb_build_object(
                'title', 'Механическая нагрузка на коленный сустав',
                'description',
                  'Наблюдаемый аспект коленного сустава, характеризующий механическую нагрузку, воспринимаемую суставом в конкретном событии или интервале времени.'
              ),
            'pl', jsonb_build_object('title', null, 'description', null),
            'uk', jsonb_build_object('title', null, 'description', null),
            'de', jsonb_build_object('title', null, 'description', null),
            'es', jsonb_build_object('title', null, 'description', null),
            'cs', jsonb_build_object('title', null, 'description', null)
          ),
        'humanLocales', jsonb_build_array('en','ru'),
        'lastEditedLocale', 'ru',
        'generatedAt', v_now::text,
        'provider', 'human',
        'model', null,
        'responseId', null,
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
        'ARCTOR_SYSTEM_VALUE_OBJECT_CANONICAL_ENGLISH_LOCALIZATION_V2_QUEUE',
      'curator_system_draft_v1',
        jsonb_build_object(
          'contract', v_creation_contract,
          'requestHash',
            'B25DEF1D4D855CB3F5A68190F8DEB72BEB07A0F67C5D90A697098AE54E63452F',
          'rawSignalId', null,
          'curatorAppUserId', v_admin_user_id,
          'curatorAdminId', v_admin_id,
          'curatorRole', v_curator_role,
          'createdAt', v_now::text,
          'publicationState', 'published_by_curator_confirmation',
          'publishedAt', v_now::text,
          'canonicalKeyMode', 'server_generated_v1',
          'canonicalLocale', 'en',
          'creationLocale', 'ru',
          'localizationState', 'pending',
          'localizationLocales', jsonb_build_array('en','ru'),
          'localizationMissingLocales',
            jsonb_build_array('pl','uk','de','es','cs'),
          'localizationAttemptCount', 0,
          'localizationQueuedAt', v_now::text,
          'localizationLastAttemptAt', null,
          'localizationNextAttemptAt', v_now::text,
          'localizationLastError', null,
          'localizationCompletedAt', null,
          'localizationRequestedByUserId', v_admin_user_id,
          'localizationRequestedByActorId', v_actor_id,
          'nodeRole', 'leaf',
          'localizations',
            jsonb_build_object(
              'en',
                jsonb_build_object(
                  'title', 'Mechanical load on the knee joint',
                  'description',
                    'An observable aspect of the knee joint describing the mechanical load experienced by the joint during a specific event or time interval.'
                ),
              'ru',
                jsonb_build_object(
                  'title', 'Механическая нагрузка на коленный сустав',
                  'description',
                    'Наблюдаемый аспект коленного сустава, характеризующий механическую нагрузку, воспринимаемую суставом в конкретном событии или интервале времени.'
                )
            )
        ),
      'systemMigrationV1',
        jsonb_build_object(
          'release', v_release,
          'approvedByAdminUserId', v_admin_user_id,
          'createdAt', v_now::text,
          'creationCommentRu',
            'Создано как конкретный наблюдаемый аспект коленного сустава; семантика механической нагрузки хранится в листовом ОН, а не в специализированном параметре.',
          'creationCommentEn',
            'Created as a concrete observable aspect of the knee joint; mechanical-load semantics are stored in the leaf ON rather than in a specialized parameter.'
        )
    );

  ---------------------------------------------------------------------------
  -- 1. Retire obsolete semantic edge while Knee is still a leaf.
  --    The relation guard requires leaf endpoints on status updates.
  ---------------------------------------------------------------------------

  update public.system_value_object_relations
  set
    status = 'inactive',
    updated_at = clock_timestamp()
  where id = v_old_relation
    and status = 'active';

  ---------------------------------------------------------------------------
  -- 2. Promote Knee joint leaf -> intermediate.
  --
  -- P1C normally makes node_role immutable. This is intentional.
  -- For this one controlled migration we:
  --   - hold an ACCESS EXCLUSIVE lock,
  --   - already verified zero facts/assignments/unexpected children,
  --   - disable ONLY the P1C enforcement trigger,
  --   - increment definition_version explicitly,
  --   - keep the immutable definition-snapshot trigger enabled,
  --   - immediately re-enable the P1C guard.
  --
  -- Any exception rolls back the whole transaction, including trigger state.
  ---------------------------------------------------------------------------

  if v_knee_row.ontology_node_role_code = 'leaf' then
    v_knee_version_before := v_knee_row.definition_version;

    lock table public.value_objects in access exclusive mode;

    execute
      'alter table public.value_objects disable trigger value_objects_ontology_p1c_enforce_trg';

    v_knee_meta :=
      coalesce(v_knee_row.metadata_json, '{}'::jsonb)
      ||
      jsonb_build_object(
        'localizedContent',
          jsonb_build_object(
            'schemaVersion', 2,
            'detectedSourceLocale', 'en',
            'sourceLocaleHint', 'en',
            'sourceRevision',
              'e8400e216493ebb29a23cf7da7eb0fb77b63d0a41e49be0b309f31d7e7dabea1',
            'fieldCodes', jsonb_build_array('title','description'),
            'original',
              jsonb_build_object(
                'title', 'Knee joint',
                'description',
                  'The joint between the femur, tibia and patella. In the ARCTor model it serves as a structural object for observable states and effects related to the knee joint.'
              ),
            'variants',
              jsonb_build_object(
                'en',
                  jsonb_build_object(
                    'title', 'Knee joint',
                    'description',
                      'The joint between the femur, tibia and patella. In the ARCTor model it serves as a structural object for observable states and effects related to the knee joint.'
                  ),
                'ru',
                  jsonb_build_object(
                    'title', 'Коленный сустав',
                    'description',
                      'Сустав между бедренной костью, большеберцовой костью и надколенником. В модели ARCTor служит структурным объектом для наблюдаемых аспектов состояния и воздействия, относящихся к коленному суставу.'
                  ),
                'pl', jsonb_build_object('title', null, 'description', null),
                'uk', jsonb_build_object('title', null, 'description', null),
                'de', jsonb_build_object('title', null, 'description', null),
                'es', jsonb_build_object('title', null, 'description', null),
                'cs', jsonb_build_object('title', null, 'description', null)
              ),
            'humanLocales', jsonb_build_array('en','ru'),
            'lastEditedLocale', 'ru',
            'generatedAt', v_now::text,
            'provider', 'human',
            'model', null,
            'responseId', null,
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
          'ARCTOR_SYSTEM_VALUE_OBJECT_CANONICAL_ENGLISH_LOCALIZATION_V2_QUEUE',
        'curator_system_draft_v1',
          coalesce(
            v_knee_row.metadata_json -> 'curator_system_draft_v1',
            '{}'::jsonb
          )
          ||
          jsonb_build_object(
            'nodeRole', 'intermediate',
            'canonicalLocale', 'en',
            'creationLocale', 'ru',
            'localizationState', 'pending',
            'localizationLocales', jsonb_build_array('en','ru'),
            'localizationMissingLocales',
              jsonb_build_array('pl','uk','de','es','cs'),
            'localizationAttemptCount', 0,
            'localizationQueuedAt', v_now::text,
            'localizationLastAttemptAt', null,
            'localizationNextAttemptAt', v_now::text,
            'localizationLastError', null,
            'localizationCompletedAt', null,
            'localizationRequestedByUserId', v_admin_user_id,
            'localizationRequestedByActorId', v_actor_id,
            'localizations',
              jsonb_build_object(
                'en',
                  jsonb_build_object(
                    'title', 'Knee joint',
                    'description',
                      'The joint between the femur, tibia and patella. In the ARCTor model it serves as a structural object for observable states and effects related to the knee joint.'
                  ),
                'ru',
                  jsonb_build_object(
                    'title', 'Коленный сустав',
                    'description',
                      'Сустав между бедренной костью, большеберцовой костью и надколенником. В модели ARCTor служит структурным объектом для наблюдаемых аспектов состояния и воздействия, относящихся к коленному суставу.'
                  )
              )
          ),
        'ontologyRefinementV1',
          jsonb_build_object(
            'release', v_release,
            'approvedByAdminUserId', v_admin_user_id,
            'changedAt', v_now::text,
            'previousNodeRole', 'leaf',
            'newNodeRole', 'intermediate',
            'previousHierarchyRelation', v_knee_row.hierarchy_relation_code,
            'newHierarchyRelation', 'part_of',
            'reasonRu',
              'Коленный сустав становится структурным родителем для конкретных наблюдаемых аспектов. Прямые факты должны записываться в дочерние листовые ОН.',
            'reasonEn',
              'Knee joint becomes a structural parent for concrete observable aspects. Direct facts must be written to child leaf ONs.'
          )
      );

    update public.value_objects
    set
      description =
        'The joint between the femur, tibia and patella. In the ARCTor model it serves as a structural object for observable states and effects related to the knee joint.',
      ontology_node_role_code = 'intermediate',
      hierarchy_relation_code = 'part_of',
      definition_version = definition_version + 1,
      metadata_json = v_knee_meta,
      updated_at = clock_timestamp()
    where id = v_knee
      and ontology_node_role_code = 'leaf';

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'ARCTOR_KNEE_LOAD_KNEE_PROMOTION_UPDATE_MISSING';
    end if;

    execute
      'alter table public.value_objects enable trigger value_objects_ontology_p1c_enforce_trg';

    select definition_version
    into v_knee_version_after
    from public.value_objects
    where id = v_knee;

    if v_knee_version_after <> v_knee_version_before + 1 then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_KNEE_LOAD_KNEE_VERSION_INCREMENT_FAILED';
    end if;

  else
    if v_knee_row.ontology_node_role_code <> 'intermediate'
       or v_knee_row.hierarchy_relation_code <> 'part_of' then
      raise exception using
        errcode = '23514',
        message = 'ARCTOR_KNEE_LOAD_EXISTING_PROMOTED_KNEE_MISMATCH';
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- 3. Create States > Loads [intermediate].
  ---------------------------------------------------------------------------

  if not exists (
    select 1
    from public.value_objects
    where id = v_loads
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
      v_loads,
      null,
      'other',
      'Loads',
      'States and conditions representing loads applied to objects, structures or systems.',
      null,
      'none',
      v_states,
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
      v_states_needs_root,
      null,
      'public',
      'standard',
      'active',
      v_loads_key,
      'STATE',
      'generic_state',
      'intermediate',
      'is_a',
      'global',
      'public',
      'public_ontology',
      1,
      'system_model',
      v_loads_meta,
      '{}'::jsonb
    );
  end if;

  ---------------------------------------------------------------------------
  -- 4. Create Loads > Mechanical load [leaf].
  ---------------------------------------------------------------------------

  if not exists (
    select 1
    from public.value_objects
    where id = v_mechanical_load
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
      v_mechanical_load,
      null,
      'other',
      'Mechanical load',
      'A load produced by mechanical forces acting on an object, structure or system.',
      null,
      'none',
      v_loads,
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
      v_states_needs_root,
      null,
      'public',
      'standard',
      'active',
      v_mechanical_load_key,
      'STATE',
      'generic_state',
      'leaf',
      'is_a',
      'global',
      'public',
      'public_ontology',
      1,
      'system_model',
      v_mechanical_load_meta,
      '{}'::jsonb
    );
  end if;

  ---------------------------------------------------------------------------
  -- 5. Create Knee joint > Mechanical load on the knee joint
  --    [leaf, aspect_of].
  ---------------------------------------------------------------------------

  if not exists (
    select 1
    from public.value_objects
    where id = v_knee_load
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
      v_knee_load,
      null,
      'other',
      'Mechanical load on the knee joint',
      'An observable aspect of the knee joint describing the mechanical load experienced by the joint during a specific event or time interval.',
      null,
      'none',
      v_knee,
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
      v_systems_root,
      null,
      'public',
      'standard',
      'active',
      v_knee_load_key,
      'ENTITY',
      'generic_entity',
      'leaf',
      'aspect_of',
      'global',
      'public',
      'public_ontology',
      1,
      'system_model',
      v_knee_load_meta,
      '{}'::jsonb
    );
  end if;

  ---------------------------------------------------------------------------
  -- 6. Register reusable directed semantic relation classified_as.
  --
  -- Production registry inventory 2026-09-18 confirmed two families:
  --   structural_crosslink
  --   analytics
  --
  -- classified_as expresses semantic classification / typing, not causal
  -- influence, so it belongs to structural_crosslink.
  --
  -- Current active directed structural-crosslink rows (supports, depends_on)
  -- establish the production contract used below:
  --   canonical_orientation_code = same
  --   ai_write_policy_code = proposal_only
  --   evidence_policy_code = optional
  --   world_evaluation_policy_code = contextual_only
  --   contract_version = 2
  ---------------------------------------------------------------------------

  if exists (
    select 1
    from public.value_object_relation_types
    where relation_type_code = 'classified_as'
      and (
        relation_family_code <> 'structural_crosslink'
        or directionality_code <> 'directed'
        or canonical_relation_type_code <> 'classified_as'
        or canonical_orientation_code <> 'same'
        or status <> 'active'
        or canonical_write_policy_code <> 'enabled'
        or ai_write_policy_code <> 'proposal_only'
        or evidence_policy_code <> 'optional'
        or world_evaluation_policy_code <> 'contextual_only'
        or from_scope_code <> 'ordinary'
        or to_scope_code <> 'ordinary'
        or allowed_source_node_roles is distinct from array['leaf']::text[]
        or allowed_target_node_roles is distinct from array['leaf']::text[]
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_CLASSIFIED_AS_EXISTING_CONTRACT_MISMATCH';
  end if;

  insert into public.value_object_relation_types (
    relation_type_code,
    directionality_code,
    from_scope_code,
    to_scope_code,
    title_key,
    description_key,
    display_order,
    status,
    reverse_title_key,
    reverse_description_key,
    allow_self_link,
    contract_version,
    relation_family_code,
    canonical_relation_type_code,
    canonical_orientation_code,
    allowed_source_facet_codes,
    allowed_target_facet_codes,
    allowed_source_node_roles,
    allowed_target_node_roles,
    canonical_write_policy_code,
    ai_write_policy_code,
    evidence_policy_code,
    world_evaluation_policy_code
  )
  values (
    'classified_as',
    'directed',
    'ordinary',
    'ordinary',
    'valueObject.relation.classifiedAs.title',
    'valueObject.relation.classifiedAs.description',
    25,
    'active',
    'valueObject.relation.hasClassifiedInstances.title',
    'valueObject.relation.hasClassifiedInstances.description',
    false,
    2,
    'structural_crosslink',
    'classified_as',
    'same',
    array[
      'DOMAIN','ENTITY','PROCESS','STATE','RELATIONSHIP',
      'ROLE','KNOWLEDGE','BEHAVIOR','CONTEXT'
    ]::text[],
    array[
      'DOMAIN','ENTITY','PROCESS','STATE','RELATIONSHIP',
      'ROLE','KNOWLEDGE','BEHAVIOR','CONTEXT'
    ]::text[],
    array['leaf']::text[],
    array['leaf']::text[],
    'enabled',
    'proposal_only',
    'optional',
    'contextual_only'
  )
  on conflict (relation_type_code) do nothing;

  ---------------------------------------------------------------------------
  -- 7. Create:
  --    Knee-load classified_as Mechanical load.
  ---------------------------------------------------------------------------

  insert into public.system_value_object_relations (
    id,
    relation_type_code,
    source_value_object_id,
    target_value_object_id,
    status,
    provenance_code,
    created_by_user_id
  )
  values (
    v_classified_relation,
    'classified_as',
    v_knee_load,
    v_mechanical_load,
    'active',
    'curator_manual',
    v_admin_user_id
  )
  on conflict (
    relation_type_code,
    source_value_object_id,
    target_value_object_id
  )
  do update
  set status = 'active';

  ---------------------------------------------------------------------------
  -- 8. Create:
  --    One-storey stair ascent influences Knee-load.
  ---------------------------------------------------------------------------

  insert into public.system_value_object_relations (
    id,
    relation_type_code,
    source_value_object_id,
    target_value_object_id,
    status,
    provenance_code,
    created_by_user_id
  )
  values (
    v_influence_relation,
    'influences',
    v_one_storey,
    v_knee_load,
    'active',
    'curator_manual',
    v_admin_user_id
  )
  on conflict (
    relation_type_code,
    source_value_object_id,
    target_value_object_id
  )
  do update
  set status = 'active';

  ---------------------------------------------------------------------------
  -- 9. Audit records.
  --    We do NOT fabricate a raw activity signal or parameter mapping.
  --    These records explicitly identify this as an administrator-approved
  --    system ontology migration.
  ---------------------------------------------------------------------------

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
  values
  (
    '3a004cdd-647c-5535-9be5-59163576bd5a',
    v_admin_user_id,
    'system_ontology_migration',
    '1',
    'validate',
    'completed',
    'notice',
    'System observation object created: Loads',
    '{}'::jsonb,
    jsonb_build_object('valueObjectId', v_loads),
    '{}'::jsonb,
    jsonb_build_object(
      'contract', v_release,
      'eventCode', 'system_observation_object_created',
      'provenance', 'controlled_system_migration',
      'curatorAppUserId', v_admin_user_id,
      'curatorAdminId', v_admin_id,
      'curatorRole', v_curator_role,
      'createdNodeRole', 'intermediate',
      'createdValueObjectId', v_loads,
      'createdCanonicalKey', v_loads_key,
      'createdLocalizedTitle', 'Нагрузки',
      'createdEnglishTitle', 'Loads',
      'createdLocalizedDescription',
        'Состояния и условия, описывающие нагрузки, действующие на объекты, структуры или системы.',
      'createdEnglishDescription',
        'States and conditions representing loads applied to objects, structures or systems.',
      'parentValueObjectId', v_states,
      'hierarchyRelationCode', 'is_a',
      'curatorComment',
        'Создано в рамках утверждённой корректировки системной онтологии ARCTor: добавлена общая ветка состояний для описания нагрузок.'
    ),
    v_now,
    v_now,
    0
  ),
  (
    '2deb64df-ce61-5681-9c3d-88f9b3e078fd',
    v_admin_user_id,
    'system_ontology_migration',
    '1',
    'validate',
    'completed',
    'notice',
    'System observation object created: Mechanical load',
    '{}'::jsonb,
    jsonb_build_object('valueObjectId', v_mechanical_load),
    '{}'::jsonb,
    jsonb_build_object(
      'contract', v_release,
      'eventCode', 'system_observation_object_created',
      'provenance', 'controlled_system_migration',
      'curatorAppUserId', v_admin_user_id,
      'curatorAdminId', v_admin_id,
      'curatorRole', v_curator_role,
      'createdNodeRole', 'leaf',
      'createdValueObjectId', v_mechanical_load,
      'createdCanonicalKey', v_mechanical_load_key,
      'createdLocalizedTitle', 'Механическая нагрузка',
      'createdEnglishTitle', 'Mechanical load',
      'createdLocalizedDescription',
        'Нагрузка, возникающая вследствие действия механических сил на объект, структуру или систему.',
      'createdEnglishDescription',
        'A load produced by mechanical forces acting on an object, structure or system.',
      'parentValueObjectId', v_loads,
      'hierarchyRelationCode', 'is_a',
      'curatorComment',
        'Создано как общий тип наблюдаемой механической нагрузки, независимый от конкретного анатомического объекта.'
    ),
    v_now,
    v_now,
    0
  ),
  (
    '8916e9b3-16b6-5703-8b0d-7b0e92e83950',
    v_admin_user_id,
    'system_ontology_migration',
    '1',
    'validate',
    'completed',
    'notice',
    'System observation object created: Mechanical load on the knee joint',
    '{}'::jsonb,
    jsonb_build_object('valueObjectId', v_knee_load),
    '{}'::jsonb,
    jsonb_build_object(
      'contract', v_release,
      'eventCode', 'system_observation_object_created',
      'provenance', 'controlled_system_migration',
      'curatorAppUserId', v_admin_user_id,
      'curatorAdminId', v_admin_id,
      'curatorRole', v_curator_role,
      'createdNodeRole', 'leaf',
      'createdValueObjectId', v_knee_load,
      'createdCanonicalKey', v_knee_load_key,
      'createdLocalizedTitle', 'Механическая нагрузка на коленный сустав',
      'createdEnglishTitle', 'Mechanical load on the knee joint',
      'createdLocalizedDescription',
        'Наблюдаемый аспект коленного сустава, характеризующий механическую нагрузку, воспринимаемую суставом в конкретном событии или интервале времени.',
      'createdEnglishDescription',
        'An observable aspect of the knee joint describing the mechanical load experienced by the joint during a specific event or time interval.',
      'parentValueObjectId', v_knee,
      'hierarchyRelationCode', 'aspect_of',
      'curatorComment',
        'Создано как конкретный наблюдаемый аспект коленного сустава; семантика механической нагрузки хранится в листовом ОН, а не в специализированном параметре.'
    ),
    v_now,
    v_now,
    0
  ),
  (
    'd6cf3fa2-ae3c-5828-8271-71ac5391f5be',
    v_admin_user_id,
    'system_ontology_migration',
    '1',
    'validate',
    'completed',
    'notice',
    'Knee joint promoted from leaf to intermediate',
    '{}'::jsonb,
    jsonb_build_object('valueObjectId', v_knee),
    '{}'::jsonb,
    jsonb_build_object(
      'contract', v_release,
      'eventCode', 'system_observation_object_role_refined',
      'provenance', 'controlled_system_migration',
      'curatorAppUserId', v_admin_user_id,
      'curatorAdminId', v_admin_id,
      'curatorRole', v_curator_role,
      'valueObjectId', v_knee,
      'previousNodeRole', 'leaf',
      'newNodeRole', 'intermediate',
      'previousHierarchyRelationCode', 'is_a',
      'newHierarchyRelationCode', 'part_of',
      'curatorComment',
        'Коленный сустав переведён в промежуточный структурный ОН, чтобы конкретные наблюдаемые аспекты записывались дочерними листовыми ОН.'
    ),
    v_now,
    v_now,
    0
  )
  on conflict (id) do nothing;

  ---------------------------------------------------------------------------
  -- POSTCHECK: object contracts
  ---------------------------------------------------------------------------

  if not exists (
    select 1
    from public.value_objects vo
    where vo.id = v_loads
      and vo.canonical_key = v_loads_key
      and vo.title = 'Loads'
      and vo.description =
        'States and conditions representing loads applied to objects, structures or systems.'
      and vo.scope_code = 'global'
      and vo.origin_type_code = 'system_model'
      and vo.status = 'active'
      and vo.owner_user_id is null
      and vo.owner_actor_id is null
      and vo.created_by_actor_id is null
      and vo.ontology_node_role_code = 'intermediate'
      and vo.parent_value_object_id = v_states
      and vo.root_value_object_id = v_states_needs_root
      and vo.hierarchy_relation_code = 'is_a'
      and vo.facet_code = 'STATE'
      and vo.object_kind_code = 'generic_state'
      and vo.metadata_json #>> '{curator_system_draft_v1,localizations,ru,title}' =
        'Нагрузки'
      and vo.metadata_json #>> '{curator_system_draft_v1,localizations,en,title}' =
        'Loads'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_POSTCHECK_LOADS_FAILED';
  end if;

  if not exists (
    select 1
    from public.value_objects vo
    where vo.id = v_mechanical_load
      and vo.canonical_key = v_mechanical_load_key
      and vo.title = 'Mechanical load'
      and vo.scope_code = 'global'
      and vo.origin_type_code = 'system_model'
      and vo.status = 'active'
      and vo.ontology_node_role_code = 'leaf'
      and vo.parent_value_object_id = v_loads
      and vo.root_value_object_id = v_states_needs_root
      and vo.hierarchy_relation_code = 'is_a'
      and vo.facet_code = 'STATE'
      and vo.object_kind_code = 'generic_state'
      and vo.metadata_json #>> '{curator_system_draft_v1,localizations,ru,title}' =
        'Механическая нагрузка'
      and vo.metadata_json #>> '{curator_system_draft_v1,localizations,en,title}' =
        'Mechanical load'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_POSTCHECK_MECHANICAL_LOAD_FAILED';
  end if;

  if not exists (
    select 1
    from public.value_objects vo
    where vo.id = v_knee_load
      and vo.canonical_key = v_knee_load_key
      and vo.title = 'Mechanical load on the knee joint'
      and vo.scope_code = 'global'
      and vo.origin_type_code = 'system_model'
      and vo.status = 'active'
      and vo.ontology_node_role_code = 'leaf'
      and vo.parent_value_object_id = v_knee
      and vo.root_value_object_id = v_systems_root
      and vo.hierarchy_relation_code = 'aspect_of'
      and vo.facet_code = 'ENTITY'
      and vo.object_kind_code = 'generic_entity'
      and vo.metadata_json #>> '{curator_system_draft_v1,localizations,ru,title}' =
        'Механическая нагрузка на коленный сустав'
      and vo.metadata_json #>> '{curator_system_draft_v1,localizations,en,title}' =
        'Mechanical load on the knee joint'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_POSTCHECK_KNEE_LOAD_FAILED';
  end if;

  if not exists (
    select 1
    from public.value_objects vo
    where vo.id = v_knee
      and vo.ontology_node_role_code = 'intermediate'
      and vo.hierarchy_relation_code = 'part_of'
      and vo.parent_value_object_id = v_lower_limb_joints
      and vo.metadata_json #>> '{curator_system_draft_v1,nodeRole}' =
        'intermediate'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_POSTCHECK_KNEE_PROMOTION_FAILED';
  end if;

  ---------------------------------------------------------------------------
  -- POSTCHECK: immutable definition snapshots exist.
  ---------------------------------------------------------------------------

  if not exists (
    select 1
    from public.value_object_definition_versions
    where value_object_id = v_loads
      and version = 1
      and node_role_code = 'intermediate'
      and hierarchy_relation_code = 'is_a'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_LOADS_DEFINITION_V1_MISSING';
  end if;

  if not exists (
    select 1
    from public.value_object_definition_versions
    where value_object_id = v_mechanical_load
      and version = 1
      and node_role_code = 'leaf'
      and hierarchy_relation_code = 'is_a'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_MECHANICAL_DEFINITION_V1_MISSING';
  end if;

  if not exists (
    select 1
    from public.value_object_definition_versions
    where value_object_id = v_knee_load
      and version = 1
      and node_role_code = 'leaf'
      and hierarchy_relation_code = 'aspect_of'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_KNEE_LOAD_DEFINITION_V1_MISSING';
  end if;

  if not exists (
    select 1
    from public.value_object_definition_versions
    where value_object_id = v_knee
      and node_role_code = 'intermediate'
      and hierarchy_relation_code = 'part_of'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_KNEE_PROMOTION_SNAPSHOT_MISSING';
  end if;

  ---------------------------------------------------------------------------
  -- POSTCHECK: relations
  ---------------------------------------------------------------------------

  if exists (
    select 1
    from public.system_value_object_relations
    where id = v_old_relation
      and status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_OLD_RELATION_STILL_ACTIVE';
  end if;

  if not exists (
    select 1
    from public.value_object_relation_types
    where relation_type_code = 'classified_as'
      and directionality_code = 'directed'
      and status = 'active'
      and canonical_write_policy_code = 'enabled'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_CLASSIFIED_AS_TYPE_MISSING';
  end if;

  if not exists (
    select 1
    from public.system_value_object_relations
    where relation_type_code = 'classified_as'
      and source_value_object_id = v_knee_load
      and target_value_object_id = v_mechanical_load
      and status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_CLASSIFICATION_RELATION_MISSING';
  end if;

  if not exists (
    select 1
    from public.system_value_object_relations
    where relation_type_code = 'influences'
      and source_value_object_id = v_one_storey
      and target_value_object_id = v_knee_load
      and status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_INFLUENCE_RELATION_MISSING';
  end if;

  ---------------------------------------------------------------------------
  -- POSTCHECK: no direct facts/parameter assignments were created.
  ---------------------------------------------------------------------------

  if exists (
    select 1
    from public.activity_object_facts
    where value_object_id = v_knee
  ) or exists (
    select 1
    from public.value_object_parameter_assignments
    where value_object_id = v_knee
  ) then
    raise exception using
      errcode = '23514',
      message = 'ARCTOR_KNEE_LOAD_POSTCHECK_KNEE_DIRECT_DATA_PRESENT';
  end if;

end;
$migration$;

commit;

-- Final human-readable evidence.
select
  'PASS'::text as result,
  (
    select ontology_node_role_code
    from public.value_objects
    where id = '585e2177-e036-5a5a-a6d4-26ae3c14349e'
  ) as knee_role,
  (
    select hierarchy_relation_code
    from public.value_objects
    where id = '585e2177-e036-5a5a-a6d4-26ae3c14349e'
  ) as knee_parent_relation,
  (
    select count(*)
    from public.value_objects
    where id in (
      'da692011-357b-502f-b44f-d916d695d017',
      'c525f501-f714-5ee7-a489-9c4b408d2478',
      '9167369d-e4f8-5031-8ba5-eec94a29d559'
    )
      and status = 'active'
  ) as expected_new_objects,
  (
    select count(*)
    from public.system_value_object_relations
    where status = 'active'
      and (
        (
          relation_type_code = 'classified_as'
          and source_value_object_id =
            '9167369d-e4f8-5031-8ba5-eec94a29d559'
          and target_value_object_id =
            'c525f501-f714-5ee7-a489-9c4b408d2478'
        )
        or
        (
          relation_type_code = 'influences'
          and source_value_object_id =
            'dd9f05a6-112d-5237-80c7-38d012da8a75'
          and target_value_object_id =
            '9167369d-e4f8-5031-8ba5-eec94a29d559'
        )
      )
  ) as expected_new_relations,
  (
    select count(*)
    from public.value_object_definition_versions
    where value_object_id in (
      'da692011-357b-502f-b44f-d916d695d017',
      'c525f501-f714-5ee7-a489-9c4b408d2478',
      '9167369d-e4f8-5031-8ba5-eec94a29d559'
    )
      and version = 1
  ) as expected_definition_v1_rows,
  (
    select count(*)
    from public.activity_processing_logs
    where id in (
      '3a004cdd-647c-5535-9be5-59163576bd5a',
      '2deb64df-ce61-5681-9c3d-88f9b3e078fd',
      '8916e9b3-16b6-5703-8b0d-7b0e92e83950',
      'd6cf3fa2-ae3c-5828-8271-71ac5391f5be'
    )
  ) as expected_audit_rows;
