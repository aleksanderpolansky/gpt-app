/*
ARCTor.app — GSR-1A
Global System Reality registry/schema support v1
Manual Supabase SQL Editor migration.

PURPOSE
- prepare the existing canonical registries for Global System Layer;
- DO NOT seed the 150 global Value Objects yet;
- preserve all current actor-scoped parameter behavior.

This migration is transactional. Any failure before COMMIT rolls the whole step back.
*/

begin;

-- ---------------------------------------------------------------------------
-- 0. Hard preflight against the live state captured on 2026-08-11.
-- ---------------------------------------------------------------------------

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_kind_registry') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null then
    raise exception using
      errcode = '42P01',
      message = 'GSR1A_REQUIRED_REALITY_TABLES_MISSING';
  end if;

  if to_regprocedure('public.enforce_value_object_ontology_p1c()') is null
     or to_regprocedure('public.write_value_object_definition_snapshot_p1c()') is null then
    raise exception using
      errcode = '42883',
      message = 'GSR1A_P1C_ONTOLOGY_RUNTIME_REQUIRED';
  end if;

  if exists (
    select 1
    from public.value_objects
    where canonical_key is not null
    group by canonical_key
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'GSR1A_DUPLICATE_CANONICAL_KEYS_PRESENT';
  end if;
end;
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Parameter dimensions required by the approved pilot vocabulary.
-- Existing dimensions remain valid; only semantically missing dimensions are added.
-- ---------------------------------------------------------------------------

alter table public.value_object_parameter_definitions
  drop constraint if exists value_object_parameter_definitions_dimension_check;

alter table public.value_object_parameter_definitions
  add constraint value_object_parameter_definitions_dimension_check
  check (
    dimension_code in (
      'time',
      'distance',
      'count',
      'volume',
      'mass',
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

-- Wind in the pilot may arrive in m/s.
-- Keep the existing generic `speed` parameter and permit the extra source unit.
update public.value_object_parameter_definitions
set
  allowed_unit_codes =
    case
      when allowed_unit_codes ? 'meter_per_second'
        then allowed_unit_codes
      else allowed_unit_codes || '["meter_per_second"]'::jsonb
    end,
  metadata_json =
    coalesce(metadata_json, '{}'::jsonb)
    || jsonb_build_object(
      'gsr1_meter_per_second_enabled', true,
      'gsr1_note',
      'Runtime unit conversion must be present before automatic wind-speed fact writes.'
    ),
  updated_at = now()
where scope_code = 'system'
  and status = 'active'
  and parameter_code = 'speed';

-- ---------------------------------------------------------------------------
-- 2. Missing SYSTEM parameter definitions.
-- Semantic aliases such as duration_minutes -> duration are intentionally NOT
-- duplicated here.
-- ---------------------------------------------------------------------------

with requested(
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
  validation_json,
  source_version,
  metadata_json
) as (
  values
    ('blood_pressure_systolic_mmhg', 'Систолическое артериальное давление', 'Измеренное систолическое артериальное давление.', 'pressure', 'numeric', 'mmhg', '["mmhg"]'::jsonb, 'latest', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"semantic_unit":"mmHg","pilot_contract":"GSR1_V1"}'::jsonb),
    ('blood_pressure_diastolic_mmhg', 'Диастолическое артериальное давление', 'Измеренное диастолическое артериальное давление.', 'pressure', 'numeric', 'mmhg', '["mmhg"]'::jsonb, 'latest', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"semantic_unit":"mmHg","pilot_contract":"GSR1_V1"}'::jsonb),
    ('sleep_latency_minutes', 'Время засыпания', 'Интервал от попытки уснуть до наступления сна.', 'time', 'numeric', 'minute', '["minute"]'::jsonb, 'average', 'day', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1"}'::jsonb),
    ('food_mass_g', 'Масса пищи', 'Масса явно указанной или измеренной пищи.', 'mass', 'numeric', 'gram', '["gram","kilogram"]'::jsonb, 'sum', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1"}'::jsonb),
    ('caffeine_mg', 'Кофеин', 'Количество кофеина, указанное пользователем или подтверждённое источником.', 'mass', 'numeric', 'milligram', '["milligram","gram"]'::jsonb, 'sum', 'day', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1","source_required_if_not_declared":true}'::jsonb),
    ('alcohol_g', 'Алкоголь', 'Масса чистого алкоголя, указанная пользователем или подтверждённая источником.', 'mass', 'numeric', 'gram', '["gram"]'::jsonb, 'sum', 'day', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1","source_required_if_not_declared":true}'::jsonb),
    ('currency_code', 'Код валюты', 'ISO 4217 код валюты для денежного наблюдения.', 'text', 'text', 'text', '["text"]'::jsonb, 'none', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1","format":"ISO4217"}'::jsonb),
    ('humidity_percent', 'Относительная влажность', 'Измеренная или полученная из внешнего источника относительная влажность.', 'ratio', 'numeric', 'percent', '["percent"]'::jsonb, 'average', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1"}'::jsonb),
    ('cloudiness_percent', 'Облачность', 'Облачность в процентах, если источник предоставляет числовое значение.', 'ratio', 'numeric', 'percent', '["percent"]'::jsonb, 'average', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1"}'::jsonb),
    ('noise_level_db', 'Уровень шума', 'Измеренный уровень звука.', 'sound_level', 'numeric', 'decibel', '["decibel"]'::jsonb, 'average', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1"}'::jsonb),
    ('illumination_lux', 'Освещённость', 'Измеренная освещённость.', 'illuminance', 'numeric', 'lux', '["lux"]'::jsonb, 'average', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1"}'::jsonb),
    ('score_percent', 'Результат в процентах', 'Явно зафиксированный результат теста, экзамена или проверки.', 'ratio', 'numeric', 'percent', '["percent"]'::jsonb, 'latest', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1"}'::jsonb),
    ('items_count', 'Количество элементов', 'Количество элементов, задач, учебных единиц или других считаемых объектов.', 'count', 'numeric', 'count', '["count"]'::jsonb, 'sum', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1","integer_only":true}'::jsonb),
    ('interruption_count', 'Количество прерываний', 'Количество наблюдавшихся прерываний рабочей или когнитивной сессии.', 'count', 'numeric', 'count', '["count"]'::jsonb, 'sum', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1","integer_only":true}'::jsonb),
    ('meal_label', 'Тип приёма пищи', 'Опциональная классификация breakfast/lunch/dinner/snack/other; не заменяет occurred_at.', 'text', 'text', 'text', '["text"]'::jsonb, 'none', 'event', false, '{}'::jsonb, 'global-system-reality-seed-v1', '{"pilot_contract":"GSR1_V1","allowed_values":["breakfast","lunch","dinner","snack","other"]}'::jsonb)
)
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
select
  'system',
  requested.parameter_code,
  null,
  null,
  null,
  requested.title,
  requested.description,
  requested.dimension_code,
  requested.value_type_code,
  requested.canonical_unit_code,
  requested.allowed_unit_codes,
  requested.aggregation_method_code,
  requested.default_window_code,
  requested.allow_negative,
  requested.validation_json,
  requested.source_version,
  'active',
  requested.metadata_json
from requested
where not exists (
  select 1
  from public.value_object_parameter_definitions existing
  where existing.scope_code = 'system'
    and existing.status = 'active'
    and existing.parameter_code = requested.parameter_code
);

-- ---------------------------------------------------------------------------
-- 3. Object-kind extensions required by Global Seed v0.2.
-- body_entity is explicitly intermediate|leaf because `entity.body` contains
-- `entity.body.spine`; this closes the semantic invariant found after V2.
-- ---------------------------------------------------------------------------

with requested(
  object_kind_code,
  facet_code,
  title_key,
  description_key,
  allowed_node_roles_json,
  policy_json,
  status,
  version
) as (
  values
    ('administrative_process', 'PROCESS', 'valueObject.kind.administrative_process.title', 'valueObject.kind.administrative_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('anatomical_region', 'ENTITY', 'valueObject.kind.anatomical_region.title', 'valueObject.kind.anatomical_region.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('anxiety_state', 'STATE', 'valueObject.kind.anxiety_state.title', 'valueObject.kind.anxiety_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('appetite_state', 'STATE', 'valueObject.kind.appetite_state.title', 'valueObject.kind.appetite_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('assessment_process', 'PROCESS', 'valueObject.kind.assessment_process.title', 'valueObject.kind.assessment_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('asset_entity', 'ENTITY', 'valueObject.kind.asset_entity.title', 'valueObject.kind.asset_entity.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('available_time_context', 'CONTEXT', 'valueObject.kind.available_time_context.title', 'valueObject.kind.available_time_context.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('beverage_entity', 'ENTITY', 'valueObject.kind.beverage_entity.title', 'valueObject.kind.beverage_entity.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('body_entity', 'ENTITY', 'valueObject.kind.body_entity.title', 'valueObject.kind.body_entity.description', '["intermediate","leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('bodyweight_strength_exercise', 'PROCESS', 'valueObject.kind.bodyweight_strength_exercise.title', 'valueObject.kind.bodyweight_strength_exercise.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('calm_state', 'STATE', 'valueObject.kind.calm_state.title', 'valueObject.kind.calm_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('caregiving_process', 'PROCESS', 'valueObject.kind.caregiving_process.title', 'valueObject.kind.caregiving_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('client_process', 'PROCESS', 'valueObject.kind.client_process.title', 'valueObject.kind.client_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('close_relationship_type', 'RELATIONSHIP', 'valueObject.kind.close_relationship_type.title', 'valueObject.kind.close_relationship_type.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('cognitive_process', 'PROCESS', 'valueObject.kind.cognitive_process.title', 'valueObject.kind.cognitive_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('cognitive_state', 'STATE', 'valueObject.kind.cognitive_state.title', 'valueObject.kind.cognitive_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('communication_process', 'PROCESS', 'valueObject.kind.communication_process.title', 'valueObject.kind.communication_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('conflict_process', 'PROCESS', 'valueObject.kind.conflict_process.title', 'valueObject.kind.conflict_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('creative_process', 'PROCESS', 'valueObject.kind.creative_process.title', 'valueObject.kind.creative_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('environment_context', 'CONTEXT', 'valueObject.kind.environment_context.title', 'valueObject.kind.environment_context.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('environment_measurement_context', 'CONTEXT', 'valueObject.kind.environment_measurement_context.title', 'valueObject.kind.environment_measurement_context.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('family_relationship_type', 'RELATIONSHIP', 'valueObject.kind.family_relationship_type.title', 'valueObject.kind.family_relationship_type.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('fatigue_state', 'STATE', 'valueObject.kind.fatigue_state.title', 'valueObject.kind.fatigue_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('financial_resource', 'ENTITY', 'valueObject.kind.financial_resource.title', 'valueObject.kind.financial_resource.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('financial_state', 'STATE', 'valueObject.kind.financial_state.title', 'valueObject.kind.financial_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('financial_transaction', 'PROCESS', 'valueObject.kind.financial_transaction.title', 'valueObject.kind.financial_transaction.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('fluid_intake', 'PROCESS', 'valueObject.kind.fluid_intake.title', 'valueObject.kind.fluid_intake.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('food_entity', 'ENTITY', 'valueObject.kind.food_entity.title', 'valueObject.kind.food_entity.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('food_intake', 'PROCESS', 'valueObject.kind.food_intake.title', 'valueObject.kind.food_intake.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('household_entity', 'ENTITY', 'valueObject.kind.household_entity.title', 'valueObject.kind.household_entity.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('household_process', 'PROCESS', 'valueObject.kind.household_process.title', 'valueObject.kind.household_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('hydration_state', 'STATE', 'valueObject.kind.hydration_state.title', 'valueObject.kind.hydration_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('isometric_exercise', 'PROCESS', 'valueObject.kind.isometric_exercise.title', 'valueObject.kind.isometric_exercise.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('joint_activity_process', 'PROCESS', 'valueObject.kind.joint_activity_process.title', 'valueObject.kind.joint_activity_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('knowledge_state', 'STATE', 'valueObject.kind.knowledge_state.title', 'valueObject.kind.knowledge_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('language_learning_process', 'PROCESS', 'valueObject.kind.language_learning_process.title', 'valueObject.kind.language_learning_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('learning_process', 'PROCESS', 'valueObject.kind.learning_process.title', 'valueObject.kind.learning_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('leisure_process', 'PROCESS', 'valueObject.kind.leisure_process.title', 'valueObject.kind.leisure_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('location_context', 'CONTEXT', 'valueObject.kind.location_context.title', 'valueObject.kind.location_context.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('locomotion_process', 'PROCESS', 'valueObject.kind.locomotion_process.title', 'valueObject.kind.locomotion_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('meeting_process', 'PROCESS', 'valueObject.kind.meeting_process.title', 'valueObject.kind.meeting_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('mobility_exercise', 'PROCESS', 'valueObject.kind.mobility_exercise.title', 'valueObject.kind.mobility_exercise.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('mood_state', 'STATE', 'valueObject.kind.mood_state.title', 'valueObject.kind.mood_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('performance_process', 'PROCESS', 'valueObject.kind.performance_process.title', 'valueObject.kind.performance_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('physiological_measurement_state', 'STATE', 'valueObject.kind.physiological_measurement_state.title', 'valueObject.kind.physiological_measurement_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('physiological_signal', 'STATE', 'valueObject.kind.physiological_signal.title', 'valueObject.kind.physiological_signal.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('place_entity', 'ENTITY', 'valueObject.kind.place_entity.title', 'valueObject.kind.place_entity.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('posture_behavior', 'BEHAVIOR', 'valueObject.kind.posture_behavior.title', 'valueObject.kind.posture_behavior.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('practice_process', 'PROCESS', 'valueObject.kind.practice_process.title', 'valueObject.kind.practice_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('readiness_state', 'STATE', 'valueObject.kind.readiness_state.title', 'valueObject.kind.readiness_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('recovery_process', 'PROCESS', 'valueObject.kind.recovery_process.title', 'valueObject.kind.recovery_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('recovery_state', 'STATE', 'valueObject.kind.recovery_state.title', 'valueObject.kind.recovery_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('rest_episode', 'PROCESS', 'valueObject.kind.rest_episode.title', 'valueObject.kind.rest_episode.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('sedentary_behavior', 'BEHAVIOR', 'valueObject.kind.sedentary_behavior.title', 'valueObject.kind.sedentary_behavior.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('sleep_episode', 'PROCESS', 'valueObject.kind.sleep_episode.title', 'valueObject.kind.sleep_episode.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('sleep_state', 'STATE', 'valueObject.kind.sleep_state.title', 'valueObject.kind.sleep_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('sleepiness_state', 'STATE', 'valueObject.kind.sleepiness_state.title', 'valueObject.kind.sleepiness_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('social_relationship_type', 'RELATIONSHIP', 'valueObject.kind.social_relationship_type.title', 'valueObject.kind.social_relationship_type.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('social_role', 'ROLE', 'valueObject.kind.social_role.title', 'valueObject.kind.social_role.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('strength_exercise', 'PROCESS', 'valueObject.kind.strength_exercise.title', 'valueObject.kind.strength_exercise.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('stress_state', 'STATE', 'valueObject.kind.stress_state.title', 'valueObject.kind.stress_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('substance_intake', 'PROCESS', 'valueObject.kind.substance_intake.title', 'valueObject.kind.substance_intake.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('support_process', 'PROCESS', 'valueObject.kind.support_process.title', 'valueObject.kind.support_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('symptom_state', 'STATE', 'valueObject.kind.symptom_state.title', 'valueObject.kind.symptom_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('weather_context', 'CONTEXT', 'valueObject.kind.weather_context.title', 'valueObject.kind.weather_context.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('wellbeing_state', 'STATE', 'valueObject.kind.wellbeing_state.title', 'valueObject.kind.wellbeing_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('work_process', 'PROCESS', 'valueObject.kind.work_process.title', 'valueObject.kind.work_process.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('work_relationship_type', 'RELATIONSHIP', 'valueObject.kind.work_relationship_type.title', 'valueObject.kind.work_relationship_type.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1),
    ('workload_state', 'STATE', 'valueObject.kind.workload_state.title', 'valueObject.kind.workload_state.description', '["leaf"]'::jsonb, '{}'::jsonb, 'active', 1)
)
insert into public.value_object_kind_registry (
  object_kind_code,
  facet_code,
  title_key,
  description_key,
  allowed_node_roles_json,
  policy_json,
  status,
  version
)
select
  requested.object_kind_code,
  requested.facet_code,
  requested.title_key,
  requested.description_key,
  requested.allowed_node_roles_json,
  requested.policy_json,
  requested.status,
  requested.version
from requested
on conflict (object_kind_code) do update
set
  facet_code = excluded.facet_code,
  title_key = excluded.title_key,
  description_key = excluded.description_key,
  allowed_node_roles_json = excluded.allowed_node_roles_json,
  policy_json = excluded.policy_json,
  status = excluded.status,
  version = greatest(public.value_object_kind_registry.version, excluded.version),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. Generalize the EXISTING assignment table instead of creating a competing
-- global assignment table.
--
-- Existing rows remain assignment_scope_code='actor'.
-- Global system assignments use null owners and target only global semantic leaves.
-- ---------------------------------------------------------------------------

alter table public.value_object_parameter_assignments
  add column if not exists assignment_scope_code text;

update public.value_object_parameter_assignments
set assignment_scope_code = 'actor'
where assignment_scope_code is null;

alter table public.value_object_parameter_assignments
  alter column assignment_scope_code set default 'actor',
  alter column assignment_scope_code set not null,
  alter column owner_user_id drop not null,
  alter column owner_actor_id drop not null;

alter table public.value_object_parameter_assignments
  drop constraint if exists value_object_parameter_assignments_scope_shape_gsr1_check;

alter table public.value_object_parameter_assignments
  add constraint value_object_parameter_assignments_scope_shape_gsr1_check
  check (
    (
      assignment_scope_code = 'actor'
      and owner_user_id is not null
      and owner_actor_id is not null
    )
    or
    (
      assignment_scope_code = 'system'
      and owner_user_id is null
      and owner_actor_id is null
      and created_by_actor_id is null
    )
  );

create index if not exists value_object_parameter_assignments_scope_idx
  on public.value_object_parameter_assignments(
    assignment_scope_code,
    value_object_id,
    status
  );

-- Preserve the previous actor behavior exactly, while allowing SYSTEM assignments
-- only to ontology leaves in scope_code='global'.
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

  if new.assignment_scope_code = 'system' then
    if v_value_object.scope_code is distinct from 'global'
       or v_value_object.ontology_node_role_code is distinct from 'leaf'
       or v_value_object.owner_user_id is not null
       or v_value_object.owner_actor_id is not null then
      raise exception using
        errcode = '23514',
        message = 'GSR1_SYSTEM_PARAMETER_ASSIGNMENT_REQUIRES_GLOBAL_ONTOLOGY_LEAF';
    end if;

    if new.owner_user_id is not null
       or new.owner_actor_id is not null
       or new.created_by_actor_id is not null then
      raise exception using
        errcode = '23514',
        message = 'GSR1_SYSTEM_PARAMETER_ASSIGNMENT_OWNER_MUST_BE_NULL';
    end if;

    if v_definition.scope_code is distinct from 'system'
       or v_definition.owner_user_id is not null
       or v_definition.owner_actor_id is not null then
      raise exception using
        errcode = '23514',
        message = 'GSR1_SYSTEM_PARAMETER_ASSIGNMENT_REQUIRES_SYSTEM_DEFINITION';
    end if;

    return new;
  end if;

  if new.assignment_scope_code <> 'actor' then
    raise exception using
      errcode = '23514',
      message = 'GSR1_PARAMETER_ASSIGNMENT_SCOPE_INVALID';
  end if;

  -- Original P7 actor-scoped contract is deliberately preserved below.
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

-- ---------------------------------------------------------------------------
-- 5. Transactional acceptance gates.
-- ---------------------------------------------------------------------------

do $acceptance$
declare
  v_missing_kinds integer;
  v_missing_parameters integer;
  v_non_actor_legacy_assignments integer;
begin
  select count(*)
  into v_missing_kinds
  from (
    values
      ('administrative_process'),
      ('anatomical_region'),
      ('anxiety_state'),
      ('appetite_state'),
      ('assessment_process'),
      ('asset_entity'),
      ('available_time_context'),
      ('beverage_entity'),
      ('body_entity'),
      ('bodyweight_strength_exercise'),
      ('calm_state'),
      ('caregiving_process'),
      ('client_process'),
      ('close_relationship_type'),
      ('cognitive_process'),
      ('cognitive_state'),
      ('communication_process'),
      ('conflict_process'),
      ('creative_process'),
      ('environment_context'),
      ('environment_measurement_context'),
      ('family_relationship_type'),
      ('fatigue_state'),
      ('financial_resource'),
      ('financial_state'),
      ('financial_transaction'),
      ('fluid_intake'),
      ('food_entity'),
      ('food_intake'),
      ('household_entity'),
      ('household_process'),
      ('hydration_state'),
      ('isometric_exercise'),
      ('joint_activity_process'),
      ('knowledge_state'),
      ('language_learning_process'),
      ('learning_process'),
      ('leisure_process'),
      ('location_context'),
      ('locomotion_process'),
      ('meeting_process'),
      ('mobility_exercise'),
      ('mood_state'),
      ('performance_process'),
      ('physiological_measurement_state'),
      ('physiological_signal'),
      ('place_entity'),
      ('posture_behavior'),
      ('practice_process'),
      ('readiness_state'),
      ('recovery_process'),
      ('recovery_state'),
      ('rest_episode'),
      ('sedentary_behavior'),
      ('sleep_episode'),
      ('sleep_state'),
      ('sleepiness_state'),
      ('social_relationship_type'),
      ('social_role'),
      ('strength_exercise'),
      ('stress_state'),
      ('substance_intake'),
      ('support_process'),
      ('symptom_state'),
      ('weather_context'),
      ('wellbeing_state'),
      ('work_process'),
      ('work_relationship_type'),
      ('workload_state')
  ) required(kind_code)
  where not exists (
    select 1
    from public.value_object_kind_registry actual
    where actual.object_kind_code = required.kind_code
      and actual.status = 'active'
  );

  if v_missing_kinds <> 0 then
    raise exception using
      errcode = '23514',
      message = 'GSR1A_REQUIRED_OBJECT_KINDS_MISSING_AFTER_WRITE';
  end if;

  select count(*)
  into v_missing_parameters
  from (
    values
      ('blood_pressure_systolic_mmhg'),
      ('blood_pressure_diastolic_mmhg'),
      ('sleep_latency_minutes'),
      ('food_mass_g'),
      ('caffeine_mg'),
      ('alcohol_g'),
      ('currency_code'),
      ('humidity_percent'),
      ('cloudiness_percent'),
      ('noise_level_db'),
      ('illumination_lux'),
      ('score_percent'),
      ('items_count'),
      ('interruption_count'),
      ('meal_label')
  ) required(parameter_code)
  where not exists (
    select 1
    from public.value_object_parameter_definitions actual
    where actual.scope_code = 'system'
      and actual.status = 'active'
      and actual.parameter_code = required.parameter_code
  );

  if v_missing_parameters <> 0 then
    raise exception using
      errcode = '23514',
      message = 'GSR1A_REQUIRED_SYSTEM_PARAMETERS_MISSING_AFTER_WRITE';
  end if;

  select count(*)
  into v_non_actor_legacy_assignments
  from public.value_object_parameter_assignments
  where assignment_scope_code <> 'actor';

  -- No system assignments should exist yet; they are created only after the
  -- 150 global objects pass their own seed gate.
  if v_non_actor_legacy_assignments <> 0 then
    raise exception using
      errcode = '23514',
      message = 'GSR1A_UNEXPECTED_SYSTEM_ASSIGNMENT_BEFORE_GLOBAL_OBJECT_SEED';
  end if;

  if not exists (
    select 1
    from public.value_object_kind_registry
    where object_kind_code = 'body_entity'
      and status = 'active'
      and allowed_node_roles_json ? 'intermediate'
      and allowed_node_roles_json ? 'leaf'
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1A_BODY_ENTITY_KIND_ROLE_FIX_MISSING';
  end if;
end;
$acceptance$;

commit;

-- ---------------------------------------------------------------------------
-- 6. Copy this single postcheck row back to ChatGPT.
-- ---------------------------------------------------------------------------

select jsonb_pretty(
  jsonb_build_object(
    'check',
      'ARCTOR_GSR1A_REGISTRY_SCHEMA_SUPPORT_V1',
    'active_kind_count',
      (
        select count(*)
        from public.value_object_kind_registry
        where status = 'active'
      ),
    'active_system_parameter_count',
      (
        select count(*)
        from public.value_object_parameter_definitions
        where scope_code = 'system'
          and status = 'active'
      ),
    'new_gsr1_parameter_count',
      (
        select count(*)
        from public.value_object_parameter_definitions
        where scope_code = 'system'
          and status = 'active'
          and source_version = 'global-system-reality-seed-v1'
      ),
    'speed_allowed_units',
      (
        select allowed_unit_codes
        from public.value_object_parameter_definitions
        where scope_code = 'system'
          and status = 'active'
          and parameter_code = 'speed'
        limit 1
      ),
    'assignment_scope_column',
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'value_object_parameter_assignments'
          and column_name = 'assignment_scope_code'
      ),
    'actor_assignments',
      (
        select count(*)
        from public.value_object_parameter_assignments
        where assignment_scope_code = 'actor'
      ),
    'system_assignments',
      (
        select count(*)
        from public.value_object_parameter_assignments
        where assignment_scope_code = 'system'
      ),
    'global_objects',
      (
        select count(*)
        from public.value_objects
        where scope_code = 'global'
          and canonical_key is not null
      ),
    'body_entity_roles',
      (
        select allowed_node_roles_json
        from public.value_object_kind_registry
        where object_kind_code = 'body_entity'
      )
  )
) as gsr1a_result;
