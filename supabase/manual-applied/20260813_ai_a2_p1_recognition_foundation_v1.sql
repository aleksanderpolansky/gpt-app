/*
ARCTor.app - AI-A2 / GSR1L-P1
Recognition Profiles foundation v1
2026-08-13

Purpose:
- create the first versioned recognition-profile table for GLOBAL active leaves;
- keep aliases, parameters and long-lived semantic relations in their existing sources of truth;
- add read-only assembled-profile and bounded-candidate RPCs;
- seed a deliberately small pilot set;
- do NOT change /activity-ai-lab runtime or Reality Graph write paths.

Safety:
- one atomic transaction for all writes;
- hard live-state preflight;
- acceptance DO block before COMMIT;
- no OpenAI calls;
- no writes to existing activity/fact/relation tables;
- direct table access denied to anon/authenticated/service_role;
- new read RPCs are service_role-only.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

-- ===========================================================================
-- 1. HARD LIVE-STATE PREFLIGHT
-- ===========================================================================

do $preflight$
declare
  v_seed_leaf_count integer;
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.concept_aliases') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null
     or to_regclass('public.ai_analysis_executions') is null
     or to_regclass('public.ai_context_manifests') is null then
    raise exception using
      errcode='42P01',
      message='AI_A2_P1_REQUIRED_BASELINE_TABLE_MISSING';
  end if;

  if to_regclass('public.value_object_recognition_profiles') is not null then
    raise exception using
      errcode='42P07',
      message='AI_A2_P1_TARGET_TABLE_ALREADY_EXISTS_STOP';
  end if;

  if to_regprocedure('public.enforce_value_object_recognition_profile_v1()') is not null
     or to_regprocedure('public.get_global_value_object_recognition_profile_v1(uuid)') is not null
     or to_regprocedure('public.get_global_value_object_recognition_candidates_v1(text,text,jsonb,integer)') is not null then
    raise exception using
      errcode='42723',
      message='AI_A2_P1_TARGET_FUNCTION_ALREADY_EXISTS_STOP';
  end if;

  if to_regprocedure(
       'public.recognize_global_value_object_text_v1(text,text,text,text,integer)'
     ) is null
     or to_regprocedure(
       'public.get_global_value_object_leaf_candidates_v1(text,text,integer)'
     ) is null then
    raise exception using
      errcode='42883',
      message='AI_A2_P1_GSR1C_BASELINE_RPC_MISSING';
  end if;

  if (
    select count(*)
    from public.value_objects
    where scope_code='global'
      and canonical_key is not null
  ) <> 150
  or (
    select count(*)
    from public.value_objects
    where scope_code='global'
      and ontology_node_role_code='root'
  ) <> 12
  or (
    select count(*)
    from public.value_objects
    where scope_code='global'
      and ontology_node_role_code='intermediate'
  ) <> 35
  or (
    select count(*)
    from public.value_objects
    where scope_code='global'
      and ontology_node_role_code='leaf'
  ) <> 103 then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_GLOBAL_ONTOLOGY_BASELINE_MISMATCH';
  end if;

  if (
    select count(*)
    from public.concept_aliases a
    join public.value_objects v
      on v.id=a.concept_id
    where a.concept_type='value_object'
      and a.status='published'
      and a.source_type='system_seed'
      and v.scope_code='global'
  ) <> 89 then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_GLOBAL_ALIAS_BASELINE_MISMATCH';
  end if;

  with required(canonical_key) as (
    values
      ('process.exercise.plank'),
      ('process.exercise.reverse_plank'),
      ('process.movement.walking'),
      ('process.movement.running'),
      ('state.physiology.pain'),
      ('entity.body.spine.lumbar'),
      ('process.nutrition.meal'),
      ('entity.food.item'),
      ('process.sleep.night_episode'),
      ('process.sleep.day_episode'),
      ('process.finance.purchase'),
      ('process.home.household_task')
  )
  select count(*)
  into v_seed_leaf_count
  from required r
  join public.value_objects v
    on v.canonical_key=r.canonical_key
   and v.scope_code='global'
   and v.ontology_node_role_code='leaf'
   and v.status='active';

  if v_seed_leaf_count <> 12 then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_REQUIRED_PILOT_LEAF_MISSING';
  end if;
end;
$preflight$;

-- ===========================================================================
-- 2. VERSIONED RECOGNITION PROFILE TABLE
-- ===========================================================================

create table public.value_object_recognition_profiles (
  id uuid primary key default gen_random_uuid(),

  value_object_id uuid not null
    references public.value_objects(id)
    on delete restrict,

  profile_version integer not null,
  status text not null default 'draft',

  semantic_signature_json jsonb not null default '{}'::jsonb,
  positive_examples_json jsonb not null default '[]'::jsonb,
  negative_examples_json jsonb not null default '[]'::jsonb,
  recognition_cues_json jsonb not null default '[]'::jsonb,
  disambiguation_json jsonb not null default '{}'::jsonb,

  uncertainty_policy_code text not null default 'allow_unresolved',

  fallback_value_object_id uuid
    references public.value_objects(id)
    on delete restrict,

  allowed_event_links_json jsonb not null default '[]'::jsonb,
  temporal_semantics_json jsonb not null default '{}'::jsonb,

  source_version text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint value_object_recognition_profiles_version_check
    check (profile_version > 0),

  constraint value_object_recognition_profiles_status_check
    check (status in ('draft','active','retired')),

  constraint value_object_recognition_profiles_signature_json_check
    check (jsonb_typeof(semantic_signature_json)='object'),

  constraint value_object_recognition_profiles_positive_json_check
    check (jsonb_typeof(positive_examples_json)='array'),

  constraint value_object_recognition_profiles_negative_json_check
    check (jsonb_typeof(negative_examples_json)='array'),

  constraint value_object_recognition_profiles_cues_json_check
    check (jsonb_typeof(recognition_cues_json)='array'),

  constraint value_object_recognition_profiles_disambiguation_json_check
    check (jsonb_typeof(disambiguation_json)='object'),

  constraint value_object_recognition_profiles_uncertainty_check
    check (
      uncertainty_policy_code in (
        'allow_unresolved',
        'fallback_leaf',
        'exact_only'
      )
    ),

  constraint value_object_recognition_profiles_fallback_shape_check
    check (
      (
        uncertainty_policy_code='fallback_leaf'
        and fallback_value_object_id is not null
        and fallback_value_object_id<>value_object_id
      )
      or
      (
        uncertainty_policy_code<>'fallback_leaf'
        and fallback_value_object_id is null
      )
    ),

  constraint value_object_recognition_profiles_event_links_json_check
    check (jsonb_typeof(allowed_event_links_json)='array'),

  constraint value_object_recognition_profiles_temporal_json_check
    check (jsonb_typeof(temporal_semantics_json)='object'),

  constraint value_object_recognition_profiles_source_version_check
    check (
      char_length(btrim(source_version)) between 1 and 240
    ),

  constraint value_object_recognition_profiles_value_version_key
    unique (value_object_id, profile_version)
);

create unique index value_object_recognition_profiles_one_active_uidx
  on public.value_object_recognition_profiles(value_object_id)
  where status='active';

create index value_object_recognition_profiles_status_idx
  on public.value_object_recognition_profiles(status, value_object_id);

-- ===========================================================================
-- 3. PROFILE GUARD + LIFECYCLE
-- ===========================================================================

create function public.enforce_value_object_recognition_profile_v1()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_target public.value_objects%rowtype;
  v_fallback public.value_objects%rowtype;
begin
  select *
  into v_target
  from public.value_objects
  where id=new.value_object_id;

  if not found
     or v_target.scope_code<>'global'
     or v_target.ontology_node_role_code<>'leaf'
     or v_target.canonical_key is null then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_PROFILE_TARGET_MUST_BE_GLOBAL_LEAF';
  end if;

  if (tg_op='INSERT' or new.status in ('draft','active'))
     and v_target.status<>'active' then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_DRAFT_OR_ACTIVE_PROFILE_TARGET_MUST_BE_ACTIVE_LEAF';
  end if;

  if new.fallback_value_object_id is not null then
    select *
    into v_fallback
    from public.value_objects
    where id=new.fallback_value_object_id;

    if not found
       or v_fallback.scope_code<>'global'
       or v_fallback.ontology_node_role_code<>'leaf'
       or v_fallback.status<>'active'
       or v_fallback.canonical_key is null then
      raise exception using
        errcode='23514',
        message='AI_A2_P1_PROFILE_FALLBACK_MUST_BE_ACTIVE_GLOBAL_LEAF';
    end if;
  end if;

  if jsonb_typeof(new.recognition_cues_json)<>'array' then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_PROFILE_CUES_MUST_BE_ARRAY';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.recognition_cues_json) as cue(value)
    where jsonb_typeof(cue.value)<>'object'
       or nullif(btrim(cue.value->>'evidenceClass'),'') is null
       or (cue.value->>'evidenceClass') not in ('strong','supporting','exclusion')
       or nullif(btrim(cue.value->>'matchType'),'') is null
       or (cue.value->>'matchType') not in ('token','token_prefix','phrase','semantic_tag')
       or nullif(btrim(cue.value->>'value'),'') is null
       or char_length(cue.value->>'value') > 120
       or (
         cue.value ? 'locale'
         and cue.value->>'locale' is not null
         and (
           char_length(cue.value->>'locale') > 35
           or lower(cue.value->>'locale') !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'
         )
       )
  ) then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_PROFILE_CUE_SCHEMA_INVALID';
  end if;

  if new.disambiguation_json ? 'siblingCanonicalKeys' then
    if jsonb_typeof(new.disambiguation_json->'siblingCanonicalKeys')<>'array' then
      raise exception using
        errcode='23514',
        message='AI_A2_P1_PROFILE_SIBLING_KEYS_MUST_BE_ARRAY';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(new.disambiguation_json->'siblingCanonicalKeys') as item(value)
      where jsonb_typeof(item.value)<>'string'
         or nullif(btrim(item.value #>> '{}'),'') is null
    ) then
      raise exception using
        errcode='23514',
        message='AI_A2_P1_PROFILE_SIBLING_SCHEMA_INVALID';
    end if;

    if exists (
      select 1
      from jsonb_array_elements_text(
        new.disambiguation_json->'siblingCanonicalKeys'
      ) as sibling(canonical_key)
      left join public.value_objects v
        on v.canonical_key=sibling.canonical_key
       and v.scope_code='global'
       and v.ontology_node_role_code='leaf'
       and v.status='active'
      where v.id is null
    ) then
      raise exception using
        errcode='23514',
        message='AI_A2_P1_PROFILE_SIBLING_NOT_ACTIVE_GLOBAL_LEAF';
    end if;
  end if;

  if tg_op='UPDATE' then
    if new.value_object_id is distinct from old.value_object_id
       or new.profile_version is distinct from old.profile_version
       or new.created_at is distinct from old.created_at then
      raise exception using
        errcode='23514',
        message='AI_A2_P1_PROFILE_IDENTITY_IMMUTABLE';
    end if;

    if old.status='retired' then
      raise exception using
        errcode='23514',
        message='AI_A2_P1_RETIRED_PROFILE_IMMUTABLE';
    end if;

    if old.status='active' then
      if new.status not in ('active','retired') then
        raise exception using
          errcode='23514',
          message='AI_A2_P1_ACTIVE_PROFILE_CAN_ONLY_RETIRE';
      end if;

      if new.semantic_signature_json is distinct from old.semantic_signature_json
         or new.positive_examples_json is distinct from old.positive_examples_json
         or new.negative_examples_json is distinct from old.negative_examples_json
         or new.recognition_cues_json is distinct from old.recognition_cues_json
         or new.disambiguation_json is distinct from old.disambiguation_json
         or new.uncertainty_policy_code is distinct from old.uncertainty_policy_code
         or new.fallback_value_object_id is distinct from old.fallback_value_object_id
         or new.allowed_event_links_json is distinct from old.allowed_event_links_json
         or new.temporal_semantics_json is distinct from old.temporal_semantics_json
         or new.source_version is distinct from old.source_version then
        raise exception using
          errcode='23514',
          message='AI_A2_P1_ACTIVE_PROFILE_CONTENT_IMMUTABLE_CREATE_NEW_VERSION';
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

revoke all
on function public.enforce_value_object_recognition_profile_v1()
from public, anon, authenticated, service_role;

create trigger value_object_recognition_profiles_guard_v1_trg
before insert or update
on public.value_object_recognition_profiles
for each row
execute function public.enforce_value_object_recognition_profile_v1();

-- ===========================================================================
-- 4. RLS + DIRECT ACCESS BOUNDARY
-- ===========================================================================

alter table public.value_object_recognition_profiles enable row level security;

revoke all
on table public.value_object_recognition_profiles
from public, anon, authenticated, service_role;

-- No table policy is created intentionally.
-- Reads are exposed only through SECURITY DEFINER read RPCs below.

-- ===========================================================================
-- 5. LIMITED PILOT SEED (11 ACTIVE PROFILES)
-- ===========================================================================

with seed(
  canonical_key,
  semantic_signature_json,
  positive_examples_json,
  negative_examples_json,
  recognition_cues_json,
  disambiguation_json,
  uncertainty_policy_code,
  allowed_event_links_json,
  temporal_semantics_json
) as (
  values
  (
    'process.exercise.plank',
    '{"semanticTags":["exercise","isometric_exercise","plank"],"distinguishers":["front_or_generic_plank"]}'::jsonb,
    '[{"locale":"ru","text":"стоял в планке две минуты"},{"locale":"en","text":"held a plank for two minutes"}]'::jsonb,
    '[{"locale":"ru","text":"обратная планка"},{"locale":"en","text":"reverse plank"}]'::jsonb,
    '[
      {"evidenceClass":"strong","matchType":"token_prefix","value":"планк","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"plank","locale":"en"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"plank"},
      {"evidenceClass":"exclusion","matchType":"phrase","value":"обратная планк","locale":"ru"},
      {"evidenceClass":"exclusion","matchType":"phrase","value":"обратной планк","locale":"ru"},
      {"evidenceClass":"exclusion","matchType":"phrase","value":"обратную планк","locale":"ru"},
      {"evidenceClass":"exclusion","matchType":"phrase","value":"reverse plank","locale":"en"}
    ]'::jsonb,
    '{"includeSiblings":true,"siblingCanonicalKeys":["process.exercise.reverse_plank"],"rule":"reverse marker must be explicit for reverse plank"}'::jsonb,
    'allow_unresolved',
    '[{"code":"categorized_as"}]'::jsonb,
    '{"roles":["occurrence","duration"],"orderingAllowed":true}'::jsonb
  ),
  (
    'process.exercise.reverse_plank',
    '{"semanticTags":["exercise","isometric_exercise","reverse_plank"],"requiredDistinguishers":["reverse_marker"]}'::jsonb,
    '[{"locale":"ru","text":"стоял в обратной планке две минуты"},{"locale":"en","text":"held a reverse plank"}]'::jsonb,
    '[{"locale":"ru","text":"обычная планка"},{"locale":"en","text":"regular plank"}]'::jsonb,
    '[
      {"evidenceClass":"strong","matchType":"phrase","value":"обратная планк","locale":"ru"},
      {"evidenceClass":"strong","matchType":"phrase","value":"обратной планк","locale":"ru"},
      {"evidenceClass":"strong","matchType":"phrase","value":"обратную планк","locale":"ru"},
      {"evidenceClass":"strong","matchType":"phrase","value":"reverse plank","locale":"en"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"reverse_plank"}
    ]'::jsonb,
    '{"includeSiblings":true,"siblingCanonicalKeys":["process.exercise.plank"],"requiredAny":["reverse_marker"]}'::jsonb,
    'allow_unresolved',
    '[{"code":"categorized_as"}]'::jsonb,
    '{"roles":["occurrence","duration"],"orderingAllowed":true}'::jsonb
  ),
  (
    'process.movement.walking',
    '{"semanticTags":["locomotion","walking"]}'::jsonb,
    '[{"locale":"ru","text":"гулял 35 минут"},{"locale":"ru","text":"ходил пешком"},{"locale":"en","text":"walked for 35 minutes"}]'::jsonb,
    '[{"locale":"ru","text":"бежал 35 минут"},{"locale":"en","text":"ran for 35 minutes"}]'::jsonb,
    '[
      {"evidenceClass":"strong","matchType":"token_prefix","value":"гуля","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"прогул","locale":"ru"},
      {"evidenceClass":"strong","matchType":"phrase","value":"ходил пешком","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"walk","locale":"en"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"stroll","locale":"en"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"walking"}
    ]'::jsonb,
    '{"includeSiblings":true,"siblingCanonicalKeys":["process.movement.running"]}'::jsonb,
    'allow_unresolved',
    '[{"code":"categorized_as"},{"code":"with_participant"},{"code":"occurs_in_context"}]'::jsonb,
    '{"roles":["occurrence","duration","window"],"orderingAllowed":true}'::jsonb
  ),
  (
    'process.movement.running',
    '{"semanticTags":["locomotion","running"]}'::jsonb,
    '[{"locale":"ru","text":"бежал 35 минут"},{"locale":"ru","text":"бегал утром"},{"locale":"en","text":"ran for 35 minutes"}]'::jsonb,
    '[{"locale":"ru","text":"гулял 35 минут"},{"locale":"en","text":"walked for 35 minutes"}]'::jsonb,
    '[
      {"evidenceClass":"strong","matchType":"token_prefix","value":"бег","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"беж","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"run","locale":"en"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"jog","locale":"en"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"running"}
    ]'::jsonb,
    '{"includeSiblings":true,"siblingCanonicalKeys":["process.movement.walking"]}'::jsonb,
    'allow_unresolved',
    '[{"code":"categorized_as"},{"code":"with_participant"},{"code":"occurs_in_context"}]'::jsonb,
    '{"roles":["occurrence","duration","window"],"orderingAllowed":true}'::jsonb
  ),
  (
    'state.physiology.pain',
    '{"semanticTags":["physiological_state","pain_state"],"requiresLocation":false}'::jsonb,
    '[{"locale":"ru","text":"начала болеть поясница"},{"locale":"ru","text":"боль в пояснице 4 из 10"},{"locale":"en","text":"lower back pain"}]'::jsonb,
    '[{"locale":"ru","text":"больница рядом"},{"locale":"en","text":"went to a hospital"}]'::jsonb,
    '[
      {"evidenceClass":"strong","matchType":"token_prefix","value":"бол","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token","value":"pain","locale":"en"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"pain_state"},
      {"evidenceClass":"exclusion","matchType":"token_prefix","value":"больниц","locale":"ru"},
      {"evidenceClass":"exclusion","matchType":"token_prefix","value":"hospital","locale":"en"}
    ]'::jsonb,
    '{"rule":"pain intensity is accepted only when explicit; anatomy is a separate ENTITY candidate"}'::jsonb,
    'allow_unresolved',
    '[{"code":"located_in","targetFacetCodes":["ENTITY"],"targetKindCodes":["anatomical_region"]}]'::jsonb,
    '{"roles":["occurrence","duration","window"],"orderingAllowed":true,"causalPromotionAllowed":false}'::jsonb
  ),
  (
    'entity.body.spine.lumbar',
    '{"semanticTags":["anatomical_entity","anatomical_region","lumbar"]}'::jsonb,
    '[{"locale":"ru","text":"поясница"},{"locale":"ru","text":"нижняя часть спины"},{"locale":"en","text":"lower back"}]'::jsonb,
    '[]'::jsonb,
    '[
      {"evidenceClass":"strong","matchType":"token_prefix","value":"поясниц","locale":"ru"},
      {"evidenceClass":"strong","matchType":"phrase","value":"нижняя часть спины","locale":"ru"},
      {"evidenceClass":"strong","matchType":"phrase","value":"lower back","locale":"en"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"lumbar","locale":"en"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"lumbar"},
      {"evidenceClass":"supporting","matchType":"semantic_tag","value":"anatomical_region"}
    ]'::jsonb,
    '{}'::jsonb,
    'allow_unresolved',
    '[]'::jsonb,
    '{"roles":["occurrence_context"],"orderingAllowed":false}'::jsonb
  ),
  (
    'process.nutrition.meal',
    '{"semanticTags":["food_intake","meal"]}'::jsonb,
    '[{"locale":"ru","text":"съел пирожное"},{"locale":"ru","text":"поел"},{"locale":"en","text":"ate a meal"}]'::jsonb,
    '[{"locale":"ru","text":"купил продукты в магазине"},{"locale":"en","text":"bought groceries"}]'::jsonb,
    '[
      {"evidenceClass":"strong","matchType":"token","value":"съел","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token","value":"поел","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token","value":"ел","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"eat","locale":"en"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"ate","locale":"en"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"food_intake"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"meal"}
    ]'::jsonb,
    '{"rule":"food nouns without consumption evidence do not prove a meal"}'::jsonb,
    'allow_unresolved',
    '[{"code":"consumes","targetFacetCodes":["ENTITY"],"targetKindCodes":["food_entity","beverage_entity"]}]'::jsonb,
    '{"roles":["occurrence","duration","window"],"orderingAllowed":true}'::jsonb
  ),
  (
    'entity.food.item',
    '{"semanticTags":["food_item","food_entity"]}'::jsonb,
    '[{"locale":"ru","text":"пищевой продукт"},{"locale":"en","text":"food item"}]'::jsonb,
    '[]'::jsonb,
    '[
      {"evidenceClass":"strong","matchType":"phrase","value":"пищевой продукт","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token","value":"блюдо","locale":"ru"},
      {"evidenceClass":"strong","matchType":"phrase","value":"food item","locale":"en"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"food_item"},
      {"evidenceClass":"supporting","matchType":"semantic_tag","value":"food_entity"}
    ]'::jsonb,
    '{}'::jsonb,
    'allow_unresolved',
    '[]'::jsonb,
    '{"roles":["occurrence_context"],"orderingAllowed":false}'::jsonb
  ),
  (
    'process.sleep.night_episode',
    '{"semanticTags":["sleep_episode","night_sleep"],"requiredDistinguishersForExactSelection":["night_marker","explicit_night_interval"]}'::jsonb,
    '[{"locale":"ru","text":"спал ночью"},{"locale":"ru","text":"спал с 23:40 до 06:30"},{"locale":"en","text":"slept at night"}]'::jsonb,
    '[{"locale":"ru","text":"дневной сон"},{"locale":"en","text":"daytime nap"}]'::jsonb,
    '[
      {"evidenceClass":"supporting","matchType":"token_prefix","value":"спал","locale":"ru"},
      {"evidenceClass":"supporting","matchType":"token_prefix","value":"сон","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"ноч","locale":"ru"},
      {"evidenceClass":"supporting","matchType":"token_prefix","value":"sleep","locale":"en"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"night","locale":"en"},
      {"evidenceClass":"supporting","matchType":"semantic_tag","value":"sleep_episode"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"night_sleep"}
    ]'::jsonb,
    '{"includeSiblings":true,"siblingCanonicalKeys":["process.sleep.day_episode"],"rule":"generic sleep without a day/night discriminator remains unresolved"}'::jsonb,
    'allow_unresolved',
    '[{"code":"categorized_as"}]'::jsonb,
    '{"roles":["occurrence","duration","window"],"orderingAllowed":true}'::jsonb
  ),
  (
    'process.sleep.day_episode',
    '{"semanticTags":["sleep_episode","day_sleep"],"requiredDistinguishersForExactSelection":["day_marker","nap_marker"]}'::jsonb,
    '[{"locale":"ru","text":"спал днём"},{"locale":"ru","text":"дневной сон"},{"locale":"en","text":"daytime nap"}]'::jsonb,
    '[{"locale":"ru","text":"ночной сон"},{"locale":"en","text":"night sleep"}]'::jsonb,
    '[
      {"evidenceClass":"supporting","matchType":"token_prefix","value":"спал","locale":"ru"},
      {"evidenceClass":"supporting","matchType":"token_prefix","value":"сон","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token","value":"днем","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token","value":"днём","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"днев","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"дрем","locale":"ru"},
      {"evidenceClass":"supporting","matchType":"token_prefix","value":"sleep","locale":"en"},
      {"evidenceClass":"strong","matchType":"token","value":"day","locale":"en"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"daytime","locale":"en"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"nap","locale":"en"},
      {"evidenceClass":"supporting","matchType":"semantic_tag","value":"sleep_episode"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"day_sleep"}
    ]'::jsonb,
    '{"includeSiblings":true,"siblingCanonicalKeys":["process.sleep.night_episode"],"rule":"generic sleep without a day/night discriminator remains unresolved"}'::jsonb,
    'allow_unresolved',
    '[{"code":"categorized_as"}]'::jsonb,
    '{"roles":["occurrence","duration","window"],"orderingAllowed":true}'::jsonb
  ),
  (
    'process.finance.purchase',
    '{"semanticTags":["purchase","financial_transaction","acquisition"],"distinguishers":["buy_or_pay_for_goods_or_services"]}'::jsonb,
    '[{"locale":"ru","text":"купил продукты в магазине и заплатил"},{"locale":"ru","text":"купил товар"},{"locale":"en","text":"bought groceries at a store"}]'::jsonb,
    '[{"locale":"ru","text":"готовил еду дома"},{"locale":"ru","text":"убирал квартиру"},{"locale":"en","text":"cleaned the house"}]'::jsonb,
    '[
      {"evidenceClass":"strong","matchType":"token","value":"купил","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token","value":"купила","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token","value":"купили","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"покуп","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"приобр","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"заплат","locale":"ru"},
      {"evidenceClass":"supporting","matchType":"token_prefix","value":"магазин","locale":"ru"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"bought","locale":"en"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"purchas","locale":"en"},
      {"evidenceClass":"strong","matchType":"token_prefix","value":"paid","locale":"en"},
      {"evidenceClass":"supporting","matchType":"token_prefix","value":"store","locale":"en"},
      {"evidenceClass":"strong","matchType":"semantic_tag","value":"purchase"}
    ]'::jsonb,
    '{"rule":"shopping and payment evidence route to purchase; goods/services remain event-linked objects, not structural children"}'::jsonb,
    'allow_unresolved',
    '[{"code":"categorized_as"}]'::jsonb,
    '{"roles":["occurrence","window"],"orderingAllowed":true}'::jsonb
  )
)
insert into public.value_object_recognition_profiles (
  value_object_id,
  profile_version,
  status,
  semantic_signature_json,
  positive_examples_json,
  negative_examples_json,
  recognition_cues_json,
  disambiguation_json,
  uncertainty_policy_code,
  fallback_value_object_id,
  allowed_event_links_json,
  temporal_semantics_json,
  source_version
)
select
  v.id,
  1,
  'active',
  seed.semantic_signature_json,
  seed.positive_examples_json,
  seed.negative_examples_json,
  seed.recognition_cues_json,
  seed.disambiguation_json,
  seed.uncertainty_policy_code,
  null,
  seed.allowed_event_links_json,
  seed.temporal_semantics_json,
  'GSR1L_RECOGNITION_ARCHITECTURE_V1_20260812/AI_A2_P1_V1'
from seed
join public.value_objects v
  on v.canonical_key=seed.canonical_key
 and v.scope_code='global'
 and v.ontology_node_role_code='leaf'
 and v.status='active';

-- ===========================================================================
-- 6. READ-ONLY ASSEMBLED PROFILE RPC
-- ===========================================================================

create function public.get_global_value_object_recognition_profile_v1(
  p_value_object_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $function$
declare
  v_value_object public.value_objects%rowtype;
  v_profile public.value_object_recognition_profiles%rowtype;
  v_aliases jsonb := '[]'::jsonb;
  v_parameters jsonb := '[]'::jsonb;
begin
  if p_value_object_id is null then
    raise exception using
      errcode='22023',
      message='AI_A2_P1_PROFILE_VALUE_OBJECT_ID_REQUIRED';
  end if;

  select *
  into v_value_object
  from public.value_objects
  where id=p_value_object_id
    and scope_code='global'
    and ontology_node_role_code='leaf'
    and status='active';

  if not found then
    raise exception using
      errcode='P0002',
      message='AI_A2_P1_PROFILE_ACTIVE_GLOBAL_LEAF_NOT_FOUND';
  end if;

  select *
  into v_profile
  from public.value_object_recognition_profiles
  where value_object_id=v_value_object.id
    and status='active';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',a.id,
        'text',a.alias_text,
        'normalized',a.alias_normalized,
        'locale',a.locale,
        'status',a.status,
        'sourceType',a.source_type
      )
      order by lower(coalesce(a.locale,'')), a.alias_normalized, a.id
    ),
    '[]'::jsonb
  )
  into v_aliases
  from public.concept_aliases a
  where a.concept_type='value_object'
    and a.concept_id=v_value_object.id
    and a.status in ('approved','published');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'assignmentId',assignment.id,
        'parameterDefinitionId',parameter.id,
        'parameterCode',parameter.parameter_code,
        'parameterVersion',parameter.version,
        'dimensionCode',parameter.dimension_code,
        'valueTypeCode',parameter.value_type_code,
        'canonicalUnitCode',parameter.canonical_unit_code,
        'allowedUnitCodes',parameter.allowed_unit_codes,
        'aggregationMethodCode',parameter.aggregation_method_code,
        'defaultWindowCode',parameter.default_window_code
      )
      order by assignment.display_order, parameter.parameter_code, parameter.version
    ),
    '[]'::jsonb
  )
  into v_parameters
  from public.value_object_parameter_assignments assignment
  join public.value_object_parameter_definitions parameter
    on parameter.id=assignment.parameter_definition_id
  where assignment.value_object_id=v_value_object.id
    and assignment.assignment_scope_code='system'
    and assignment.status='active'
    and parameter.scope_code='system'
    and parameter.status='active';

  return jsonb_build_object(
    'ok',true,
    'contractVersion','AI_A2_GSR1L_ASSEMBLED_PROFILE_V1',
    'identity',jsonb_build_object(
      'valueObjectId',v_value_object.id,
      'canonicalKey',v_value_object.canonical_key,
      'title',v_value_object.title,
      'description',v_value_object.description,
      'definitionVersion',v_value_object.definition_version
    ),
    'ontology',jsonb_build_object(
      'facetCode',v_value_object.facet_code,
      'objectKindCode',v_value_object.object_kind_code,
      'nodeRoleCode',v_value_object.ontology_node_role_code,
      'parentValueObjectId',v_value_object.parent_value_object_id,
      'rootValueObjectId',v_value_object.root_value_object_id,
      'hierarchyRelationCode',v_value_object.hierarchy_relation_code,
      'scopeCode',v_value_object.scope_code
    ),
    'recognition',case
      when v_profile.id is null then null
      else jsonb_build_object(
        'profileId',v_profile.id,
        'profileVersion',v_profile.profile_version,
        'status',v_profile.status,
        'semanticSignature',v_profile.semantic_signature_json,
        'positiveExamples',v_profile.positive_examples_json,
        'negativeExamples',v_profile.negative_examples_json,
        'recognitionCues',v_profile.recognition_cues_json,
        'disambiguation',v_profile.disambiguation_json,
        'uncertaintyPolicyCode',v_profile.uncertainty_policy_code,
        'fallbackValueObjectId',v_profile.fallback_value_object_id,
        'allowedEventLinks',v_profile.allowed_event_links_json,
        'temporalSemantics',v_profile.temporal_semantics_json,
        'sourceVersion',v_profile.source_version
      )
    end,
    'aliases',v_aliases,
    'allowedParameters',v_parameters
  );
end;
$function$;

revoke all
on function public.get_global_value_object_recognition_profile_v1(uuid)
from public, anon, authenticated;

grant execute
on function public.get_global_value_object_recognition_profile_v1(uuid)
to service_role;

-- ===========================================================================
-- 7. READ-ONLY BOUNDED CANDIDATE ASSEMBLER
-- ===========================================================================

create function public.get_global_value_object_recognition_candidates_v1(
  p_query_text text,
  p_locale text default null,
  p_semantic_tags jsonb default '[]'::jsonb,
  p_limit integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $function$
declare
  v_query_text text;
  v_query_normalized text;
  v_locale text;
  v_total integer := 0;
  v_best_rank integer := null;
  v_candidates jsonb := '[]'::jsonb;
  v_status text;
begin
  v_query_text := nullif(btrim(p_query_text),'');

  if v_query_text is null or char_length(v_query_text)>4000 then
    raise exception using
      errcode='22023',
      message='AI_A2_P1_CANDIDATE_TEXT_INVALID';
  end if;

  v_query_normalized := lower(
    regexp_replace(v_query_text, '[[:space:]]+', ' ', 'g')
  );

  v_locale := lower(nullif(btrim(p_locale),''));

  if v_locale is not null
     and (
       char_length(v_locale)>35
       or v_locale !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'
     ) then
    raise exception using
      errcode='22023',
      message='AI_A2_P1_CANDIDATE_LOCALE_INVALID';
  end if;

  if p_semantic_tags is null
     or jsonb_typeof(p_semantic_tags)<>'array' then
    raise exception using
      errcode='22023',
      message='AI_A2_P1_CANDIDATE_SEMANTIC_TAGS_MUST_BE_ARRAY';
  end if;

  if jsonb_array_length(p_semantic_tags)>20
     or exists (
       select 1
       from jsonb_array_elements(p_semantic_tags) as item(value)
       where jsonb_typeof(item.value)<>'string'
          or nullif(btrim(item.value #>> '{}'),'') is null
          or char_length(item.value #>> '{}')>64
     ) then
    raise exception using
      errcode='22023',
      message='AI_A2_P1_CANDIDATE_SEMANTIC_TAGS_INVALID';
  end if;

  if p_limit is null or p_limit<1 or p_limit>5 then
    raise exception using
      errcode='22023',
      message='AI_A2_P1_CANDIDATE_LIMIT_INVALID';
  end if;

  with
  tokens as (
    select distinct token
    from regexp_split_to_table(
      v_query_normalized,
      '[^[:alnum:]_]+'
    ) as token_row(token)
    where token<>''
  ),
  tags as (
    select distinct lower(btrim(value)) as tag
    from jsonb_array_elements_text(p_semantic_tags) as tag_row(value)
    where btrim(value)<>''
  ),
  active_profiles as (
    select p.*
    from public.value_object_recognition_profiles p
    join public.value_objects v
      on v.id=p.value_object_id
     and v.scope_code='global'
     and v.ontology_node_role_code='leaf'
     and v.status='active'
    where p.status='active'
  ),
  cue_rows as (
    select
      p.id as profile_id,
      p.value_object_id,
      p.profile_version,
      p.uncertainty_policy_code,
      p.disambiguation_json,
      p.allowed_event_links_json,
      p.temporal_semantics_json,
      cue.value as cue,
      cue.value->>'evidenceClass' as evidence_class,
      cue.value->>'matchType' as match_type,
      lower(cue.value->>'value') as cue_value,
      lower(nullif(btrim(cue.value->>'locale'),'')) as cue_locale
    from active_profiles p
    cross join lateral jsonb_array_elements(p.recognition_cues_json) as cue(value)
  ),
  cue_eval as (
    select
      c.*,
      case
        when c.cue_locale is not null
             and v_locale is not null
             and c.cue_locale<>v_locale
          then false
        when c.match_type='token'
          then exists (
            select 1 from tokens t where t.token=c.cue_value
          )
        when c.match_type='token_prefix'
          then exists (
            select 1 from tokens t where starts_with(t.token,c.cue_value)
          )
        when c.match_type='phrase'
          then position(c.cue_value in v_query_normalized)>0
        when c.match_type='semantic_tag'
          then exists (
            select 1 from tags t where t.tag=c.cue_value
          )
        else false
      end as matched
    from cue_rows c
  ),
  profile_signals as (
    select
      c.profile_id,
      c.value_object_id,
      c.profile_version,
      c.uncertainty_policy_code,
      c.disambiguation_json,
      c.allowed_event_links_json,
      c.temporal_semantics_json,
      coalesce(bool_or(c.matched and c.evidence_class='exclusion'),false) as has_exclusion,
      coalesce(bool_or(c.matched and c.evidence_class='strong'),false) as has_strong,
      coalesce(bool_or(c.matched and c.evidence_class='supporting'),false) as has_supporting,
      coalesce(
        jsonb_agg(c.cue order by c.evidence_class, c.match_type, c.cue_value)
          filter (where c.matched),
        '[]'::jsonb
      ) as matched_cues
    from cue_eval c
    group by
      c.profile_id,
      c.value_object_id,
      c.profile_version,
      c.uncertainty_policy_code,
      c.disambiguation_json,
      c.allowed_event_links_json,
      c.temporal_semantics_json
  ),
  title_hits as (
    select
      v.id as value_object_id,
      1 as evidence_rank,
      'exact'::text as evidence_class,
      jsonb_build_array(
        jsonb_build_object(
          'source','title',
          'value',v.title
        )
      ) as lexical_evidence
    from public.value_objects v
    where v.scope_code='global'
      and v.ontology_node_role_code='leaf'
      and v.status='active'
      and v.title is not null
      and (
        case
          when char_length(lower(btrim(v.title)))<=3
               and position(' ' in lower(btrim(v.title)))=0
            then exists (
              select 1
              from tokens t
              where t.token=lower(btrim(v.title))
            )
          else position(lower(btrim(v.title)) in v_query_normalized)>0
        end
      )
  ),
  alias_hits as (
    select
      v.id as value_object_id,
      1 as evidence_rank,
      'exact'::text as evidence_class,
      jsonb_agg(
        jsonb_build_object(
          'source','alias',
          'aliasId',a.id,
          'value',a.alias_text,
          'locale',a.locale
        )
        order by a.alias_normalized, a.id
      ) as lexical_evidence
    from public.concept_aliases a
    join public.value_objects v
      on v.id=a.concept_id
    where a.concept_type='value_object'
      and a.status in ('approved','published')
      and v.scope_code='global'
      and v.ontology_node_role_code='leaf'
      and v.status='active'
      and (
        v_locale is null
        or a.locale is null
        or lower(a.locale)=v_locale
      )
      and a.alias_normalized is not null
      and (
        case
          when char_length(a.alias_normalized)<=3
               and position(' ' in a.alias_normalized)=0
            then exists (
              select 1
              from tokens t
              where t.token=a.alias_normalized
            )
          else position(a.alias_normalized in v_query_normalized)>0
        end
      )
    group by v.id
  ),
  profile_hits as (
    select
      s.value_object_id,
      case when s.has_strong then 2 else 3 end as evidence_rank,
      case when s.has_strong then 'strong' else 'supporting' end as evidence_class,
      s.matched_cues as lexical_evidence
    from profile_signals s
    where not s.has_exclusion
      and (s.has_strong or s.has_supporting)
  ),
  initial_hits as (
    select * from title_hits
    union all
    select * from alias_hits
    union all
    select * from profile_hits
  ),
  initial_value_objects as (
    select distinct value_object_id
    from initial_hits
  ),
  sibling_hits as (
    select distinct
      sibling.id as value_object_id,
      4 as evidence_rank,
      'supporting'::text as evidence_class,
      jsonb_build_array(
        jsonb_build_object(
          'source','required_sibling',
          'fromValueObjectId',source.value_object_id,
          'canonicalKey',sibling_key.canonical_key
        )
      ) as lexical_evidence
    from initial_value_objects source
    join active_profiles p
      on p.value_object_id=source.value_object_id
    cross join lateral jsonb_array_elements_text(
      coalesce(p.disambiguation_json->'siblingCanonicalKeys','[]'::jsonb)
    ) as sibling_key(canonical_key)
    join public.value_objects sibling
      on sibling.canonical_key=sibling_key.canonical_key
     and sibling.scope_code='global'
     and sibling.ontology_node_role_code='leaf'
     and sibling.status='active'
    where coalesce((p.disambiguation_json->>'includeSiblings')::boolean,false)
  ),
  all_hits as (
    select * from initial_hits
    union all
    select * from sibling_hits
  ),
  excluded_value_objects as (
    select value_object_id
    from profile_signals
    where has_exclusion
  ),
  grouped_hits as (
    select
      h.value_object_id,
      min(h.evidence_rank) as evidence_rank,
      case min(h.evidence_rank)
        when 1 then 'exact'
        when 2 then 'strong'
        else 'supporting'
      end as evidence_class,
      coalesce(
        jsonb_agg(h.lexical_evidence order by h.evidence_rank),
        '[]'::jsonb
      ) as evidence_groups
    from all_hits h
    where not exists (
      select 1
      from excluded_value_objects x
      where x.value_object_id=h.value_object_id
    )
    group by h.value_object_id
  ),
  counted as (
    select
      count(*)::integer as total,
      min(evidence_rank)::integer as best_rank
    from grouped_hits
  ),
  candidate_rows as (
    select
      g.value_object_id,
      g.evidence_rank,
      g.evidence_class,
      g.evidence_groups,
      v.canonical_key,
      v.title,
      v.description,
      v.facet_code,
      v.object_kind_code,
      p.id as profile_id,
      p.profile_version,
      p.uncertainty_policy_code,
      p.disambiguation_json,
      p.allowed_event_links_json,
      p.temporal_semantics_json
    from grouped_hits g
    join public.value_objects v
      on v.id=g.value_object_id
    left join active_profiles p
      on p.value_object_id=g.value_object_id
  ),
  ordered_candidates as (
    select *
    from candidate_rows
    order by evidence_rank, canonical_key
  )
  select
    counted.total,
    counted.best_rank,
    case
      when counted.total=0 then '[]'::jsonb
      when counted.total>p_limit then '[]'::jsonb
      else coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'valueObjectId',c.value_object_id,
              'canonicalKey',c.canonical_key,
              'title',c.title,
              'description',c.description,
              'facetCode',c.facet_code,
              'objectKindCode',c.object_kind_code,
              'evidenceClass',c.evidence_class,
              'evidenceGroups',c.evidence_groups,
              'profileId',c.profile_id,
              'profileVersion',c.profile_version,
              'uncertaintyPolicyCode',c.uncertainty_policy_code,
              'disambiguation',coalesce(c.disambiguation_json,'{}'::jsonb),
              'allowedEventLinks',coalesce(c.allowed_event_links_json,'[]'::jsonb),
              'temporalSemantics',coalesce(c.temporal_semantics_json,'{}'::jsonb),
              'allowedParameters',
                coalesce(
                  (
                    select jsonb_agg(
                      jsonb_build_object(
                        'parameterCode',parameter.parameter_code,
                        'parameterVersion',parameter.version,
                        'dimensionCode',parameter.dimension_code,
                        'valueTypeCode',parameter.value_type_code,
                        'canonicalUnitCode',parameter.canonical_unit_code
                      )
                      order by assignment.display_order, parameter.parameter_code
                    )
                    from public.value_object_parameter_assignments assignment
                    join public.value_object_parameter_definitions parameter
                      on parameter.id=assignment.parameter_definition_id
                    where assignment.value_object_id=c.value_object_id
                      and assignment.assignment_scope_code='system'
                      and assignment.status='active'
                      and parameter.scope_code='system'
                      and parameter.status='active'
                  ),
                  '[]'::jsonb
                )
            )
            order by c.evidence_rank, c.canonical_key
          )
          from ordered_candidates c
        ),
        '[]'::jsonb
      )
    end
  into v_total, v_best_rank, v_candidates
  from counted;

  v_status := case
    when v_total=0 then 'NO_MATCH'
    when v_total>p_limit then 'UNRESOLVED_TOO_BROAD'
    when v_total>1 and coalesce(v_best_rank,99)>=3 then 'UNRESOLVED'
    when v_total=1 then 'SINGLE_CANDIDATE'
    else 'CANDIDATES_READY'
  end;

  return jsonb_build_object(
    'ok',true,
    'contractVersion','AI_A2_GSR1L_BOUNDED_CANDIDATES_V1',
    'queryText',v_query_text,
    'queryNormalized',v_query_normalized,
    'requestedLocale',v_locale,
    'semanticTags',p_semantic_tags,
    'status',v_status,
    'candidateCount',v_total,
    'candidateLimit',p_limit,
    'selectedValueObjectId',null,
    'requiresModelSelection',
      (v_status='CANDIDATES_READY'),
    'candidates',v_candidates
  );
end;
$function$;

revoke all
on function public.get_global_value_object_recognition_candidates_v1(
  text,text,jsonb,integer
)
from public, anon, authenticated;

grant execute
on function public.get_global_value_object_recognition_candidates_v1(
  text,text,jsonb,integer
)
to service_role;

-- ===========================================================================
-- 8. ACCEPTANCE GATES - ANY FAILURE ROLLS BACK THE WHOLE MIGRATION
-- ===========================================================================

do $acceptance$
declare
  v_profile jsonb;
  v_result jsonb;
  v_old_exact jsonb;
  v_plank_id uuid;
begin
  if to_regclass('public.value_object_recognition_profiles') is null then
    raise exception using
      errcode='42P01',
      message='AI_A2_P1_ACCEPT_TABLE_MISSING';
  end if;

  if not (
    select c.relrowsecurity
    from pg_class c
    where c.oid='public.value_object_recognition_profiles'::regclass
  ) then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_ACCEPT_RLS_NOT_ENABLED';
  end if;

  if has_table_privilege('anon','public.value_object_recognition_profiles','SELECT')
     or has_table_privilege('anon','public.value_object_recognition_profiles','INSERT')
     or has_table_privilege('authenticated','public.value_object_recognition_profiles','SELECT')
     or has_table_privilege('authenticated','public.value_object_recognition_profiles','INSERT')
     or has_table_privilege('service_role','public.value_object_recognition_profiles','SELECT')
     or has_table_privilege('service_role','public.value_object_recognition_profiles','INSERT') then
    raise exception using
      errcode='42501',
      message='AI_A2_P1_ACCEPT_DIRECT_TABLE_PRIVILEGE_LEAK';
  end if;

  if has_function_privilege(
       'anon',
       'public.get_global_value_object_recognition_profile_v1(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.get_global_value_object_recognition_profile_v1(uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.get_global_value_object_recognition_profile_v1(uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.get_global_value_object_recognition_candidates_v1(text,text,jsonb,integer)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.get_global_value_object_recognition_candidates_v1(text,text,jsonb,integer)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.get_global_value_object_recognition_candidates_v1(text,text,jsonb,integer)',
       'EXECUTE'
     ) then
    raise exception using
      errcode='42501',
      message='AI_A2_P1_ACCEPT_RPC_PRIVILEGE_GUARD_FAILED';
  end if;

  if (
    select count(*)
    from public.value_object_recognition_profiles
    where status='active'
  ) <> 11 then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_ACCEPT_ACTIVE_PROFILE_COUNT_NOT_11';
  end if;

  if exists (
    select 1
    from public.value_object_recognition_profiles p
    join public.value_objects v
      on v.id=p.value_object_id
    where p.status='active'
      and (
        v.scope_code<>'global'
        or v.ontology_node_role_code<>'leaf'
        or v.status<>'active'
      )
  ) then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_ACCEPT_NON_GLOBAL_LEAF_PROFILE_FOUND';
  end if;

  select id
  into v_plank_id
  from public.value_objects
  where canonical_key='process.exercise.plank'
    and scope_code='global'
    and ontology_node_role_code='leaf'
    and status='active';

  v_profile := public.get_global_value_object_recognition_profile_v1(v_plank_id);

  if v_profile #>> '{identity,canonicalKey}' <> 'process.exercise.plank'
     or (v_profile #>> '{recognition,profileVersion}')::integer <> 1
     or jsonb_typeof(v_profile->'aliases')<>'array'
     or jsonb_typeof(v_profile->'allowedParameters')<>'array' then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_ACCEPT_ASSEMBLED_PROFILE_FAILED';
  end if;

  v_old_exact := public.recognize_global_value_object_text_v1(
    'вес','ru',null,null,12
  );

  if v_old_exact->>'resolvedValueObjectId' is null
     or (
       select canonical_key
       from public.value_objects
       where id=(v_old_exact->>'resolvedValueObjectId')::uuid
     ) <> 'state.physiology.body_weight' then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_ACCEPT_OLD_EXACT_RECOGNIZER_REGRESSED';
  end if;

  v_result := public.get_global_value_object_recognition_candidates_v1(
    'После планки начала болеть поясница.',
    'ru',
    '["exercise","pain_state","anatomical_region"]'::jsonb,
    5
  );

  if not exists (
       select 1
       from jsonb_array_elements(v_result->'candidates') c
       where c->>'canonicalKey'='process.exercise.plank'
     )
     or not exists (
       select 1
       from jsonb_array_elements(v_result->'candidates') c
       where c->>'canonicalKey'='state.physiology.pain'
     )
     or not exists (
       select 1
       from jsonb_array_elements(v_result->'candidates') c
       where c->>'canonicalKey'='entity.body.spine.lumbar'
     ) then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_ACCEPT_G03_CANDIDATES_FAILED';
  end if;

  v_result := public.get_global_value_object_recognition_candidates_v1(
    'Спал примерно 6 часов',
    'ru',
    '["sleep_episode"]'::jsonb,
    5
  );

  if v_result->>'status'<>'UNRESOLVED'
     or (v_result->>'candidateCount')::integer<>2
     or not exists (
       select 1
       from jsonb_array_elements(v_result->'candidates') c
       where c->>'canonicalKey'='process.sleep.night_episode'
     )
     or not exists (
       select 1
       from jsonb_array_elements(v_result->'candidates') c
       where c->>'canonicalKey'='process.sleep.day_episode'
     )
     or v_result->>'selectedValueObjectId' is not null then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_ACCEPT_SLEEP_UNRESOLVED_FAILED';
  end if;

  v_result := public.get_global_value_object_recognition_candidates_v1(
    'сходил в магазин стокротка возле меня, купил две консервы тунца и макароны, заплатил 20 злотых',
    'ru',
    '[]'::jsonb,
    5
  );

  if not exists (
       select 1
       from jsonb_array_elements(v_result->'candidates') c
       where c->>'canonicalKey'='process.finance.purchase'
     )
     or exists (
       select 1
       from jsonb_array_elements(v_result->'candidates') c
       where c->>'canonicalKey'='process.home.household_task'
     ) then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_ACCEPT_STOKROTKA_REGRESSION_FAILED';
  end if;

  if (
    select count(*)
    from public.value_objects
    where scope_code='global'
      and canonical_key is not null
  ) <> 150 then
    raise exception using
      errcode='23514',
      message='AI_A2_P1_ACCEPT_GLOBAL_OBJECT_COUNT_CHANGED';
  end if;
end;
$acceptance$;

commit;

-- ===========================================================================
-- 9. HUMAN-READABLE POSTCHECK RESULT
-- ===========================================================================

with checks(ord,check_name,passed,detail) as (
  select
    1,
    '01_recognition_profiles_table',
    to_regclass('public.value_object_recognition_profiles') is not null,
    'table exists'

  union all

  select
    2,
    '02_rls_enabled',
    coalesce((
      select c.relrowsecurity
      from pg_class c
      where c.oid='public.value_object_recognition_profiles'::regclass
    ),false),
    'RLS enabled'

  union all

  select
    3,
    '03_active_pilot_profiles',
    (
      select count(*)=11
      from public.value_object_recognition_profiles
      where status='active'
    ),
    '11 active pilot profiles'

  union all

  select
    4,
    '04_one_active_per_leaf',
    not exists (
      select 1
      from public.value_object_recognition_profiles
      where status='active'
      group by value_object_id
      having count(*)>1
    ),
    'partial unique active-profile invariant'

  union all

  select
    5,
    '05_direct_table_access_blocked',
    not has_table_privilege('anon','public.value_object_recognition_profiles','SELECT')
    and not has_table_privilege('authenticated','public.value_object_recognition_profiles','SELECT')
    and not has_table_privilege('service_role','public.value_object_recognition_profiles','SELECT'),
    'anon/authenticated/service_role direct SELECT blocked'

  union all

  select
    6,
    '06_profile_rpc_service_role_only',
    not has_function_privilege(
      'anon',
      'public.get_global_value_object_recognition_profile_v1(uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.get_global_value_object_recognition_profile_v1(uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.get_global_value_object_recognition_profile_v1(uuid)',
      'EXECUTE'
    ),
    'assembled profile RPC boundary'

  union all

  select
    7,
    '07_candidate_rpc_service_role_only',
    not has_function_privilege(
      'anon',
      'public.get_global_value_object_recognition_candidates_v1(text,text,jsonb,integer)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.get_global_value_object_recognition_candidates_v1(text,text,jsonb,integer)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.get_global_value_object_recognition_candidates_v1(text,text,jsonb,integer)',
      'EXECUTE'
    ),
    'bounded candidate RPC boundary'

  union all

  select
    8,
    '08_old_exact_recognizer_preserved',
    (
      select v.canonical_key='state.physiology.body_weight'
      from public.value_objects v
      where v.id=(
        public.recognize_global_value_object_text_v1(
          'вес','ru',null,null,12
        )->>'resolvedValueObjectId'
      )::uuid
    ),
    'existing exact alias path still resolves вес'

  union all

  select
    9,
    '09_g03_plank_pain_lumbar_candidates',
    (
      with r as (
        select public.get_global_value_object_recognition_candidates_v1(
          'После планки начала болеть поясница.',
          'ru',
          '["exercise","pain_state","anatomical_region"]'::jsonb,
          5
        ) as result
      )
      select
        exists (
          select 1 from r, jsonb_array_elements(r.result->'candidates') c
          where c->>'canonicalKey'='process.exercise.plank'
        )
        and exists (
          select 1 from r, jsonb_array_elements(r.result->'candidates') c
          where c->>'canonicalKey'='state.physiology.pain'
        )
        and exists (
          select 1 from r, jsonb_array_elements(r.result->'candidates') c
          where c->>'canonicalKey'='entity.body.spine.lumbar'
        )
    ),
    'same generic mechanism; no causal write'

  union all

  select
    10,
    '10_generic_sleep_unresolved',
    (
      with r as (
        select public.get_global_value_object_recognition_candidates_v1(
          'Спал примерно 6 часов',
          'ru',
          '["sleep_episode"]'::jsonb,
          5
        ) as result
      )
      select
        r.result->>'status'='UNRESOLVED'
        and (r.result->>'candidateCount')::integer=2
        and r.result->>'selectedValueObjectId' is null
      from r
    ),
    'day/night is not guessed'

  union all

  select
    11,
    '11_stokrotka_purchase_candidate',
    (
      with r as (
        select public.get_global_value_object_recognition_candidates_v1(
          'сходил в магазин стокротка возле меня, купил две консервы тунца и макароны, заплатил 20 злотых',
          'ru',
          '[]'::jsonb,
          5
        ) as result
      )
      select exists (
        select 1
        from r, jsonb_array_elements(r.result->'candidates') c
        where c->>'canonicalKey'='process.finance.purchase'
      )
    ),
    'purchase is in bounded candidates'

  union all

  select
    12,
    '12_stokrotka_household_not_candidate',
    (
      with r as (
        select public.get_global_value_object_recognition_candidates_v1(
          'сходил в магазин стокротка возле меня, купил две консервы тунца и макароны, заплатил 20 злотых',
          'ru',
          '[]'::jsonb,
          5
        ) as result
      )
      select not exists (
        select 1
        from r, jsonb_array_elements(r.result->'candidates') c
        where c->>'canonicalKey'='process.home.household_task'
      )
    ),
    'known wrong household route is absent'

  union all

  select
    13,
    '13_global_ontology_unchanged',
    (
      select count(*)=150
      from public.value_objects
      where scope_code='global'
        and canonical_key is not null
    ),
    '150 global objects unchanged'

  union all

  select
    14,
    '14_ai_a1_foundation_preserved',
    to_regclass('public.ai_analysis_executions') is not null
    and to_regclass('public.ai_context_manifests') is not null,
    'AI-A1 execution/context foundation still present'
)
select check_name,passed,detail
from checks
order by ord;
