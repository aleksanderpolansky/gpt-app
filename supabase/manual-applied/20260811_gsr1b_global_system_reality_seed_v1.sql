/*
ARCTor.app — GSR-1B
Global System Reality Seed v1
Manual Supabase SQL Editor migration.

BASELINE AFTER GSR-1A
- active kinds: 88
- active system parameters: 39
- global Value Objects: 0
- actor Value Objects: 15
- parameter assignment_scope_code exists
- system assignments: 0

THIS STEP
1. creates exactly 150 GLOBAL ontology objects:
   - 12 roots
   - 35 intermediate nodes
   - 103 leaves
2. uses deterministic UUIDv5 identity derived from canonical_key;
3. preserves one structural parent;
4. creates system parameter assignments only for approved leaf contracts;
5. does NOT create scientific/causal Value-Object relations;
6. does NOT activate AI runtime;
7. does NOT start P8.

UUID namespace:
d16324ec-d4bc-5c1d-8fde-35178b50c9f8

Any failure before COMMIT rolls the entire step back.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

-- ---------------------------------------------------------------------------
-- 0. Hard preflight.
-- ---------------------------------------------------------------------------

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_kind_registry') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.value_object_parameter_assignments') is null then
    raise exception using
      errcode = '42P01',
      message = 'GSR1B_REQUIRED_TABLES_MISSING';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'value_object_parameter_assignments'
      and column_name = 'assignment_scope_code'
  ) then
    raise exception using
      errcode = '42703',
      message = 'GSR1B_ASSIGNMENT_SCOPE_COLUMN_MISSING_RUN_GSR1A_FIRST';
  end if;

  if (
    select count(*)
    from public.value_objects
    where scope_code = 'global'
      and canonical_key is not null
  ) <> 0 then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_GLOBAL_ONTOLOGY_ALREADY_PRESENT';
  end if;

  if (
    select count(*)
    from public.value_object_parameter_assignments
    where assignment_scope_code = 'system'
  ) <> 0 then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_SYSTEM_ASSIGNMENTS_ALREADY_PRESENT';
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
      message = 'GSR1B_DUPLICATE_CANONICAL_KEYS_BEFORE_SEED';
  end if;

  if to_regprocedure('public.enforce_value_object_ontology_p1c()') is null
     or to_regprocedure('public.write_value_object_definition_snapshot_p1c()') is null then
    raise exception using
      errcode = '42883',
      message = 'GSR1B_P1C_RUNTIME_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.value_object_branch_types
    where branch_type_code = 'ontology_v1'
  ) then
    raise exception using
      errcode = '23503',
      message = 'GSR1B_ONTOLOGY_V1_BRANCH_BRIDGE_MISSING';
  end if;
end;
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Stage the approved ontology with deterministic IDs.
-- ---------------------------------------------------------------------------

create temporary table gsr1_global_seed_stage (
  id uuid primary key,
  canonical_key text not null unique,
  title text not null,
  description text not null,
  facet_code text not null,
  object_kind_code text not null,
  node_role_code text not null,
  hierarchy_relation_code text,
  parent_canonical_key text,
  root_canonical_key text not null,
  depth integer not null,
  display_order integer not null,
  metadata_json jsonb not null
) on commit drop;

insert into gsr1_global_seed_stage (
  id,
  canonical_key,
  title,
  description,
  facet_code,
  object_kind_code,
  node_role_code,
  hierarchy_relation_code,
  parent_canonical_key,
  root_canonical_key,
  depth,
  display_order,
  metadata_json
)
values
    ('b020251e-abae-5e65-8a9a-ca1a3524f4d6'::uuid, 'domain.body_physiology', 'Тело и физиологическое состояние', 'вес, пульс, давление, боль, усталость, анатомическая локализация', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.body_physiology', 0, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.body_physiology","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["ENTITY","STATE","PROCESS"],"pilotCoverageRu":"вес, пульс, давление, боль, усталость, анатомическая локализация"}'::jsonb),
    ('52afd482-315f-5dac-babf-953c1566636c'::uuid, 'domain.environment_context', 'Окружающая среда и контекст', 'температура воздуха, облачность, осадки, влажность, ветер, шум, освещённость, indoor/outdoor', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.environment_context', 0, 11, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.environment_context","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["CONTEXT","ENTITY"],"pilotCoverageRu":"температура воздуха, облачность, осадки, влажность, ветер, шум, освещённость, indoor/outdoor"}'::jsonb),
    ('c3aeec7a-42db-5c37-aeee-834cee1e3b03'::uuid, 'domain.finance_material_resources', 'Финансы и материальные ресурсы', 'деньги, покупка, расход, доход, перевод, баланс', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.finance_material_resources', 0, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.finance_material_resources","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["ENTITY","PROCESS","STATE"],"pilotCoverageRu":"деньги, покупка, расход, доход, перевод, баланс"}'::jsonb),
    ('59b5451c-913f-51be-86bb-17e392f5c10c'::uuid, 'domain.home_daily_life', 'Дом и повседневная жизнь', 'готовка, уборка, стирка, ремонт, обслуживание вещей, бытовая задача', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.home_daily_life', 0, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.home_daily_life","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["ENTITY","PROCESS","STATE"],"pilotCoverageRu":"готовка, уборка, стирка, ремонт, обслуживание вещей, бытовая задача"}'::jsonb),
    ('0abd947f-1264-51aa-b72d-3997d8c2a28b'::uuid, 'domain.learning_knowledge_development', 'Обучение, знания и развитие', 'учёба, практика, повторение, языковая практика, тест/экзамен, понимание', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.learning_knowledge_development', 0, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.learning_knowledge_development","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["KNOWLEDGE","PROCESS","STATE"],"pilotCoverageRu":"учёба, практика, повторение, языковая практика, тест/экзамен, понимание"}'::jsonb),
    ('d799908c-79d7-5d01-ab8d-d4a48ce00a05'::uuid, 'domain.mental_cognitive_state', 'Психическое и когнитивное состояние', 'настроение, стресс, тревога, спокойствие, внимание, концентрация, умственная нагрузка', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.mental_cognitive_state', 0, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.mental_cognitive_state","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["STATE","PROCESS","BEHAVIOR"],"pilotCoverageRu":"настроение, стресс, тревога, спокойствие, внимание, концентрация, умственная нагрузка"}'::jsonb),
    ('ebc179a0-6bb9-515b-9277-d9ea735a8ccf'::uuid, 'domain.movement_physical_activity', 'Движение и физическая активность', 'ходьба, бег, тренировка, планка, обратная планка, силовые упражнения, сидение', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.movement_physical_activity', 0, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.movement_physical_activity","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["PROCESS","BEHAVIOR"],"pilotCoverageRu":"ходьба, бег, тренировка, планка, обратная планка, силовые упражнения, сидение"}'::jsonb),
    ('ab680069-d7ea-5cd6-b762-aafed58ec077'::uuid, 'domain.nutrition_consumption', 'Питание и потребление', 'приём пищи, вода, кофеин, алкоголь, голод, сытость, жажда', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.nutrition_consumption', 0, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.nutrition_consumption","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["PROCESS","ENTITY","STATE"],"pilotCoverageRu":"приём пищи, вода, кофеин, алкоголь, голод, сытость, жажда"}'::jsonb),
    ('3fb3be94-c996-5074-9ebb-350c7f6f66f6'::uuid, 'domain.relationships_social_life', 'Отношения, семья и социальная жизнь', 'разговор, совместное время, конфликт, поддержка, забота, родительская/партнёрская роль', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.relationships_social_life', 0, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.relationships_social_life","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["RELATIONSHIP","PROCESS","ROLE"],"pilotCoverageRu":"разговор, совместное время, конфликт, поддержка, забота, родительская/партнёрская роль"}'::jsonb),
    ('9720158c-2411-5e35-986a-abdf505a3edb'::uuid, 'domain.rest_creativity_leisure', 'Отдых, творчество и досуг', 'игра на инструменте, музыка, творчество, игра, культурный досуг, отдых', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.rest_creativity_leisure', 0, 12, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.rest_creativity_leisure","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["PROCESS","STATE"],"pilotCoverageRu":"игра на инструменте, музыка, творчество, игра, культурный досуг, отдых"}'::jsonb),
    ('28b76fd3-a7b4-5bc9-84b0-0c4f54385faf'::uuid, 'domain.sleep_recovery', 'Сон и восстановление', 'ночной сон, дневной сон, отдых, сонливость, восстановленность', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.sleep_recovery', 0, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.sleep_recovery","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["PROCESS","STATE","CONTEXT"],"pilotCoverageRu":"ночной сон, дневной сон, отдых, сонливость, восстановленность"}'::jsonb),
    ('683a4811-5666-51bf-9dc9-de06233f2cf2'::uuid, 'domain.work_professional_activity', 'Работа и профессиональная деятельность', 'рабочая сессия, встреча, клиентское взаимодействие, административная работа, рабочая нагрузка', 'DOMAIN', 'domain_root', 'root', null, null, 'domain.work_professional_activity', 0, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"domain.work_professional_activity","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","facetEntrypoints":["PROCESS","ROLE","STATE"],"pilotCoverageRu":"рабочая сессия, встреча, клиентское взаимодействие, административная работа, рабочая нагрузка"}'::jsonb),
    ('ea7b3365-7679-5133-8608-10e426caa6f4'::uuid, 'entity.body_structure', 'Анатомические структуры', 'Facet entry', 'ENTITY', 'generic_entity', 'intermediate', 'part_of', 'domain.body_physiology', 'domain.body_physiology', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.body_structure","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.body_physiology","orderInDomain":1}'::jsonb),
    ('5990273c-98b0-5446-a8d0-d1076c8921fb'::uuid, 'state.physiology', 'Физиологические показатели и симптомы', 'Facet entry', 'STATE', 'generic_state', 'intermediate', 'is_a', 'domain.body_physiology', 'domain.body_physiology', 1, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.physiology","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.body_physiology","orderInDomain":5}'::jsonb),
    ('a001a537-1cfe-5a5d-96c8-5f6acd74af37'::uuid, 'process.physiology', 'Физиологические процессы', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.body_physiology', 'domain.body_physiology', 1, 12, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.physiology","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.body_physiology","orderInDomain":12}'::jsonb),
    ('eeaa12af-c33b-55bd-99c8-e9999c4cf9d5'::uuid, 'context.weather', 'Погодные и атмосферные условия', 'Facet entry', 'CONTEXT', 'generic_context', 'intermediate', 'is_a', 'domain.environment_context', 'domain.environment_context', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.weather","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.environment_context","orderInDomain":1}'::jsonb),
    ('11cbcbdc-9cdd-5d2e-aeaf-c3dc5c7b10a8'::uuid, 'context.environment', 'Физический контекст среды', 'Facet entry', 'CONTEXT', 'generic_context', 'intermediate', 'is_a', 'domain.environment_context', 'domain.environment_context', 1, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.environment","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.environment_context","orderInDomain":7}'::jsonb),
    ('ad18eaaa-53e5-5330-9754-15816eab0933'::uuid, 'context.resources', 'Ресурсный контекст', 'Facet entry для доступных ресурсов контекста, не являющихся самостоятельными DOMAIN.', 'CONTEXT', 'generic_context', 'intermediate', 'is_a', 'domain.environment_context', 'domain.environment_context', 1, 11, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.resources","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.environment_context","orderInDomain":11}'::jsonb),
    ('271e5d49-78c9-55a1-907f-c8ca1c964d61'::uuid, 'process.finance', 'Денежные операции', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.finance_material_resources', 'domain.finance_material_resources', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.finance","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":1}'::jsonb),
    ('eae3935d-b33f-5c52-b6a3-594a40215429'::uuid, 'entity.finance', 'Денежные и материальные ресурсы', 'Facet entry', 'ENTITY', 'generic_entity', 'intermediate', 'is_a', 'domain.finance_material_resources', 'domain.finance_material_resources', 1, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.finance","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":6}'::jsonb),
    ('1bee9823-eb75-50fc-9026-191571937bd2'::uuid, 'state.finance', 'Финансовые состояния', 'Facet entry', 'STATE', 'generic_state', 'intermediate', 'is_a', 'domain.finance_material_resources', 'domain.finance_material_resources', 1, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.finance","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":9}'::jsonb),
    ('fc9602fa-c846-58c4-a64a-2db94559b77e'::uuid, 'process.home', 'Бытовые процессы', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.home_daily_life', 'domain.home_daily_life', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.home","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.home_daily_life","orderInDomain":1}'::jsonb),
    ('7dfffa6e-e771-5faf-b196-a0f3ecf01193'::uuid, 'entity.home', 'Домашняя среда и вещи', 'Facet entry', 'ENTITY', 'generic_entity', 'intermediate', 'is_a', 'domain.home_daily_life', 'domain.home_daily_life', 1, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.home","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.home_daily_life","orderInDomain":7}'::jsonb),
    ('71ae491f-841e-51b5-b065-8286908962dd'::uuid, 'process.learning', 'Учебные процессы', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.learning_knowledge_development', 'domain.learning_knowledge_development', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.learning","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":1}'::jsonb),
    ('4083fb4e-4efa-572c-852b-fd2f85c4fda8'::uuid, 'state.learning', 'Состояния освоения', 'Facet entry', 'STATE', 'generic_state', 'intermediate', 'is_a', 'domain.learning_knowledge_development', 'domain.learning_knowledge_development', 1, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.learning","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":7}'::jsonb),
    ('0b661b8c-4d0c-5e55-8960-f9dc8cf1ff87'::uuid, 'knowledge.general', 'Общие знания', 'Facet entry', 'KNOWLEDGE', 'generic_knowledge', 'intermediate', 'is_a', 'domain.learning_knowledge_development', 'domain.learning_knowledge_development', 1, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"knowledge.general","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":10}'::jsonb),
    ('b5d0e3c9-d6fc-5103-9151-f1910108ba23'::uuid, 'state.emotional', 'Эмоциональные состояния', 'Facet entry', 'STATE', 'generic_state', 'intermediate', 'is_a', 'domain.mental_cognitive_state', 'domain.mental_cognitive_state', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.emotional","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":1}'::jsonb),
    ('a203ef3a-854d-5ceb-b5da-d7d046c8ab42'::uuid, 'state.cognitive', 'Когнитивные состояния', 'Facet entry', 'STATE', 'generic_state', 'intermediate', 'is_a', 'domain.mental_cognitive_state', 'domain.mental_cognitive_state', 1, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.cognitive","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":6}'::jsonb),
    ('f4e7dbae-e570-5704-a06d-1d69cca0e2a6'::uuid, 'process.cognitive', 'Когнитивная работа', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.mental_cognitive_state', 'domain.mental_cognitive_state', 1, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.cognitive","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":10}'::jsonb),
    ('0180d07a-e75a-504b-b00e-6bfc00221c24'::uuid, 'process.movement.locomotion', 'Передвижение', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.movement_physical_activity', 'domain.movement_physical_activity', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.movement.locomotion","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":1}'::jsonb),
    ('a19b7579-b4a9-5ef5-9ed9-1a36dd6baa91'::uuid, 'process.exercise', 'Упражнения', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.movement_physical_activity', 'domain.movement_physical_activity', 1, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.exercise","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":6}'::jsonb),
    ('f5e1d08d-84a2-5345-908e-ef7068237ce8'::uuid, 'behavior.movement', 'Повседневная двигательная экспозиция', 'Facet entry', 'BEHAVIOR', 'generic_behavior', 'intermediate', 'is_a', 'domain.movement_physical_activity', 'domain.movement_physical_activity', 1, 13, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"behavior.movement","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":13}'::jsonb),
    ('dd2eebdd-9126-5625-96ca-28c8ff3d22b9'::uuid, 'process.nutrition', 'Приём пищи и напитков', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.nutrition_consumption', 'domain.nutrition_consumption', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.nutrition","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":1}'::jsonb),
    ('625ac3ef-c34c-55fd-9e12-a1bddc8e56b6'::uuid, 'entity.nutrition', 'Пища и напитки', 'Facet entry', 'ENTITY', 'generic_entity', 'intermediate', 'is_a', 'domain.nutrition_consumption', 'domain.nutrition_consumption', 1, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.nutrition","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":6}'::jsonb),
    ('71e56718-7fab-59ab-bc4e-1e64445f3350'::uuid, 'state.nutrition', 'Аппетит и гидратационные ощущения', 'Facet entry', 'STATE', 'generic_state', 'intermediate', 'is_a', 'domain.nutrition_consumption', 'domain.nutrition_consumption', 1, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.nutrition","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":9}'::jsonb),
    ('79b05b0b-0473-5e83-80b1-31943e100db0'::uuid, 'relationship.social', 'Типы близких и социальных отношений', 'Facet entry', 'RELATIONSHIP', 'generic_relationship', 'intermediate', 'is_a', 'domain.relationships_social_life', 'domain.relationships_social_life', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"relationship.social","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":1}'::jsonb),
    ('1488779d-af7e-5d83-b863-6eafcd4189da'::uuid, 'process.social_interaction', 'Социальные взаимодействия', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.relationships_social_life', 'domain.relationships_social_life', 1, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.social_interaction","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":6}'::jsonb),
    ('50a976fd-887d-5165-9422-83b599fcffd9'::uuid, 'role.social', 'Социальные роли', 'Facet entry', 'ROLE', 'generic_role', 'intermediate', 'is_a', 'domain.relationships_social_life', 'domain.relationships_social_life', 1, 12, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"role.social","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":12}'::jsonb),
    ('8f82640b-58f8-5f8b-bb56-e1bec2e69df9'::uuid, 'process.creative', 'Творческая деятельность', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.rest_creativity_leisure', 'domain.rest_creativity_leisure', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.creative","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.rest_creativity_leisure","orderInDomain":1}'::jsonb),
    ('2b36d4ed-3a15-5864-84a4-d33215d518f7'::uuid, 'process.leisure', 'Досуг', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.rest_creativity_leisure', 'domain.rest_creativity_leisure', 1, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.leisure","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.rest_creativity_leisure","orderInDomain":5}'::jsonb),
    ('0518cf50-0b5e-5a2f-8ee9-335fb17ccc56'::uuid, 'process.sleep_recovery', 'Сон и отдых', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.sleep_recovery', 'domain.sleep_recovery', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.sleep_recovery","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.sleep_recovery","orderInDomain":1}'::jsonb),
    ('078c6409-7e45-572a-a37e-c8aa9cd331ce'::uuid, 'state.sleep_recovery', 'Состояния сна/восстановления', 'Facet entry', 'STATE', 'generic_state', 'intermediate', 'is_a', 'domain.sleep_recovery', 'domain.sleep_recovery', 1, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.sleep_recovery","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.sleep_recovery","orderInDomain":5}'::jsonb),
    ('872358d7-3c06-59fb-8881-3e665142a18b'::uuid, 'process.work', 'Рабочие процессы', 'Facet entry', 'PROCESS', 'generic_process', 'intermediate', 'is_a', 'domain.work_professional_activity', 'domain.work_professional_activity', 1, 1, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.work","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":1}'::jsonb),
    ('25c3a88b-6dda-5595-8c69-591fea493854'::uuid, 'state.work', 'Рабочие состояния', 'Facet entry', 'STATE', 'generic_state', 'intermediate', 'is_a', 'domain.work_professional_activity', 'domain.work_professional_activity', 1, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.work","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":7}'::jsonb),
    ('98725833-a607-58c1-908b-a27253442ece'::uuid, 'role.work', 'Общие профессиональные роли', 'Facet entry', 'ROLE', 'generic_role', 'intermediate', 'is_a', 'domain.work_professional_activity', 'domain.work_professional_activity', 1, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"role.work","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"branch","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":10}'::jsonb),
    ('1002b0ea-80d2-5b3c-9ffe-e0aad69bff18'::uuid, 'entity.body', 'Тело', 'Семантическая мишень тела как целого; прямые измерения ограничены назначенными параметрами.', 'ENTITY', 'body_entity', 'intermediate', 'part_of', 'entity.body_structure', 'domain.body_physiology', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.body","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.body_physiology","orderInDomain":2}'::jsonb),
    ('f4d0fcb2-5ad9-5e29-9020-cff91e13366b'::uuid, 'state.physiology.body_weight', 'Масса тела', 'Повторяемое наблюдение массы тела.', 'STATE', 'physiological_measurement_state', 'leaf', 'is_a', 'state.physiology', 'domain.body_physiology', 2, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.physiology.body_weight","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.body_physiology","orderInDomain":6}'::jsonb),
    ('0aeece45-75eb-55a1-b40f-7868e421d149'::uuid, 'state.physiology.heart_rate', 'Частота сердечных сокращений', 'Измерение пульса/ЧСС в конкретный момент или интервал.', 'STATE', 'physiological_signal', 'leaf', 'is_a', 'state.physiology', 'domain.body_physiology', 2, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.physiology.heart_rate","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.body_physiology","orderInDomain":7}'::jsonb),
    ('0d48944f-022a-5549-a576-daf941a460fa'::uuid, 'state.physiology.blood_pressure', 'Артериальное давление', 'Систолическое/диастолическое давление при фактическом измерении.', 'STATE', 'physiological_signal', 'leaf', 'is_a', 'state.physiology', 'domain.body_physiology', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.physiology.blood_pressure","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.body_physiology","orderInDomain":8}'::jsonb),
    ('203119a9-f092-5a97-8fcf-d65031c4a9dd'::uuid, 'state.physiology.pain', 'Боль', 'Качественное/числовое состояние боли; location связывается relation с анатомическим leaf.', 'STATE', 'symptom_state', 'leaf', 'is_a', 'state.physiology', 'domain.body_physiology', 2, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.physiology.pain","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.body_physiology","orderInDomain":9}'::jsonb),
    ('f5864a99-d5ff-587f-8e23-a11f9d0efa45'::uuid, 'state.physiology.physical_fatigue', 'Физическая усталость', 'Субъективная или измеренная физическая усталость без автоматического score.', 'STATE', 'fatigue_state', 'leaf', 'is_a', 'state.physiology', 'domain.body_physiology', 2, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.physiology.physical_fatigue","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.body_physiology","orderInDomain":10}'::jsonb),
    ('183753c6-5b08-5661-a025-ab7cb108c256'::uuid, 'state.physiology.general_wellbeing', 'Общее физическое самочувствие', 'Качественное физическое самочувствие; explicit scale только если пользователь её дал.', 'STATE', 'wellbeing_state', 'leaf', 'is_a', 'state.physiology', 'domain.body_physiology', 2, 11, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.physiology.general_wellbeing","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.body_physiology","orderInDomain":11}'::jsonb),
    ('394ff8ee-37a1-55f3-9ba1-e8c53ccb1e2b'::uuid, 'process.physiology.recovery_after_load', 'Восстановление после нагрузки', 'Наблюдаемый эпизод восстановления; не приписывает автоматически физиологический эффект.', 'PROCESS', 'recovery_process', 'leaf', 'is_a', 'process.physiology', 'domain.body_physiology', 2, 13, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.physiology.recovery_after_load","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.body_physiology","orderInDomain":13}'::jsonb),
    ('0c0ec2c6-8803-5e80-b435-d17789f8bc8e'::uuid, 'context.weather.air_temperature', 'Температура окружающего воздуха', 'Температура воздуха в текущем внешнем контексте.', 'CONTEXT', 'environment_measurement_context', 'leaf', 'is_a', 'context.weather', 'domain.environment_context', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.weather.air_temperature","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.environment_context","orderInDomain":2}'::jsonb),
    ('d00c136a-5b7e-5c1f-a787-0531fff5030b'::uuid, 'context.weather.cloudiness', 'Облачность', 'Категориальная/процентная облачность, если source её дал.', 'CONTEXT', 'weather_context', 'leaf', 'is_a', 'context.weather', 'domain.environment_context', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.weather.cloudiness","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.environment_context","orderInDomain":3}'::jsonb),
    ('03ea46dd-c41d-50bb-bd81-4992c4dd91e1'::uuid, 'context.weather.precipitation', 'Осадки', 'Дождь/снег/осадки; intensity only explicit/source-backed.', 'CONTEXT', 'weather_context', 'leaf', 'is_a', 'context.weather', 'domain.environment_context', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.weather.precipitation","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.environment_context","orderInDomain":4}'::jsonb),
    ('4d151bd9-f0ad-5efc-b0b9-d2e3f3d27a41'::uuid, 'context.weather.humidity', 'Влажность воздуха', 'Относительная влажность.', 'CONTEXT', 'environment_measurement_context', 'leaf', 'is_a', 'context.weather', 'domain.environment_context', 2, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.weather.humidity","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.environment_context","orderInDomain":5}'::jsonb),
    ('722e7229-0d66-574e-aa25-bbfa1578d9c3'::uuid, 'context.weather.wind', 'Ветер', 'Скорость/характер ветра.', 'CONTEXT', 'weather_context', 'leaf', 'is_a', 'context.weather', 'domain.environment_context', 2, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.weather.wind","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.environment_context","orderInDomain":6}'::jsonb),
    ('84585532-48c6-5276-8c5f-c900576814ed'::uuid, 'context.environment.noise', 'Шум окружающей среды', 'Уровень/категория шума.', 'CONTEXT', 'environment_context', 'leaf', 'is_a', 'context.environment', 'domain.environment_context', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.environment.noise","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.environment_context","orderInDomain":8}'::jsonb),
    ('2a41b8cb-1956-580e-aed8-03047efc97e3'::uuid, 'context.environment.illumination', 'Освещённость', 'Освещённость/яркость при source-backed измерении или качественном описании.', 'CONTEXT', 'environment_context', 'leaf', 'is_a', 'context.environment', 'domain.environment_context', 2, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.environment.illumination","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.environment_context","orderInDomain":9}'::jsonb),
    ('a25213a3-be35-5b4c-b300-af8018b39402'::uuid, 'context.environment.indoor_outdoor', 'В помещении/на улице', 'Грубый контекст без точных координат.', 'CONTEXT', 'location_context', 'leaf', 'is_a', 'context.environment', 'domain.environment_context', 2, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.environment.indoor_outdoor","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.environment_context","orderInDomain":10}'::jsonb),
    ('cfc1751f-df50-579c-904c-c0c6a181c8ba'::uuid, 'context.resources.available_time', 'Доступное время', 'Доступный временной ресурс в заданном окне. Не является дедлайном, временем суток или требуемой длительностью задачи.', 'CONTEXT', 'available_time_context', 'leaf', 'is_a', 'context.resources', 'domain.environment_context', 2, 12, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"context.resources.available_time","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.environment_context","orderInDomain":12}'::jsonb),
    ('075d5bcb-f5fd-5c20-b4cf-67250109c632'::uuid, 'process.finance.purchase', 'Покупка', 'Покупка товара/услуги; object link при наличии.', 'PROCESS', 'financial_transaction', 'leaf', 'is_a', 'process.finance', 'domain.finance_material_resources', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.finance.purchase","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":2}'::jsonb),
    ('b0868751-7179-57be-bf9e-1f443c51a735'::uuid, 'process.finance.expense', 'Расход', 'Расход денежных средств.', 'PROCESS', 'financial_transaction', 'leaf', 'is_a', 'process.finance', 'domain.finance_material_resources', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.finance.expense","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":3}'::jsonb),
    ('434d8a48-3abb-5942-9011-f935ba81f4ce'::uuid, 'process.finance.income', 'Доход', 'Получение дохода.', 'PROCESS', 'financial_transaction', 'leaf', 'is_a', 'process.finance', 'domain.finance_material_resources', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.finance.income","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":4}'::jsonb),
    ('f7b2ffc6-4b5a-5040-9c84-4b3ec48b64e0'::uuid, 'process.finance.transfer', 'Перевод денег', 'Перевод/перемещение средств.', 'PROCESS', 'financial_transaction', 'leaf', 'is_a', 'process.finance', 'domain.finance_material_resources', 2, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.finance.transfer","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":5}'::jsonb),
    ('95fb9b70-e445-5f0f-8b09-873c17b56b8f'::uuid, 'entity.finance.money', 'Денежные средства', 'Деньги как ресурс; конкретные счета/кошельки actor-scoped later.', 'ENTITY', 'financial_resource', 'leaf', 'is_a', 'entity.finance', 'domain.finance_material_resources', 2, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.finance.money","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":7}'::jsonb),
    ('a917ddf5-7aa5-5a1b-8837-179b19835fcc'::uuid, 'entity.finance.asset', 'Материальный актив', 'Общий материальный актив; конкретные активы personal layer.', 'ENTITY', 'asset_entity', 'leaf', 'is_a', 'entity.finance', 'domain.finance_material_resources', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.finance.asset","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":8}'::jsonb),
    ('0d26105f-f7d0-5736-9ec3-3dcbfa44710d'::uuid, 'state.finance.balance', 'Денежный баланс', 'Фактический баланс при explicit/source-backed наблюдении.', 'STATE', 'financial_state', 'leaf', 'is_a', 'state.finance', 'domain.finance_material_resources', 2, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.finance.balance","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":10}'::jsonb),
    ('3588b389-df7b-5960-95a8-851813150a67'::uuid, 'state.finance.debt', 'Долговое обязательство', 'Состояние долга/обязательства; amount explicit.', 'STATE', 'financial_state', 'leaf', 'is_a', 'state.finance', 'domain.finance_material_resources', 2, 11, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.finance.debt","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.finance_material_resources","orderInDomain":11}'::jsonb),
    ('39b6d14c-bc04-50c7-ae8c-1fb90dc161e7'::uuid, 'process.home.cooking', 'Приготовление пищи', 'Готовка как бытовой процесс; eating — отдельный nutrition event.', 'PROCESS', 'household_process', 'leaf', 'is_a', 'process.home', 'domain.home_daily_life', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.home.cooking","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.home_daily_life","orderInDomain":2}'::jsonb),
    ('99f4d8ba-fd57-5ba7-a7ae-d95c6bf2cf90'::uuid, 'process.home.cleaning', 'Уборка', 'Уборка помещения/вещей.', 'PROCESS', 'household_process', 'leaf', 'is_a', 'process.home', 'domain.home_daily_life', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.home.cleaning","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.home_daily_life","orderInDomain":3}'::jsonb),
    ('77ecb820-6289-5314-b918-394c6129ccd0'::uuid, 'process.home.laundry', 'Стирка/уход за одеждой', 'Стирка и уход за одеждой.', 'PROCESS', 'household_process', 'leaf', 'is_a', 'process.home', 'domain.home_daily_life', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.home.laundry","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.home_daily_life","orderInDomain":4}'::jsonb),
    ('a4377fc8-4294-5583-9ce3-9755c178853a'::uuid, 'process.home.maintenance', 'Ремонт/обслуживание', 'Ремонт или обслуживание вещи/жилья.', 'PROCESS', 'household_process', 'leaf', 'is_a', 'process.home', 'domain.home_daily_life', 2, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.home.maintenance","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.home_daily_life","orderInDomain":5}'::jsonb),
    ('f963561a-96e0-5bbc-8a12-ebc2c5727212'::uuid, 'process.home.household_task', 'Бытовая задача', 'Универсальный fallback бытовой задачи, пока нет более точного leaf.', 'PROCESS', 'household_process', 'leaf', 'is_a', 'process.home', 'domain.home_daily_life', 2, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.home.household_task","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.home_daily_life","orderInDomain":6}'::jsonb),
    ('c1b8e7c7-0076-53cb-8ec4-40fecdb7bc0d'::uuid, 'entity.home.dwelling', 'Жилище', 'Общий объект жилища; конкретный дом actor-scoped later.', 'ENTITY', 'place_entity', 'leaf', 'is_a', 'entity.home', 'domain.home_daily_life', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.home.dwelling","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.home_daily_life","orderInDomain":8}'::jsonb),
    ('8fe5b343-aa55-5e42-ba25-17ad87dafdc9'::uuid, 'entity.home.item', 'Домашняя вещь', 'Общая домашняя вещь; конкретный предмет actor-scoped later.', 'ENTITY', 'household_entity', 'leaf', 'is_a', 'entity.home', 'domain.home_daily_life', 2, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.home.item","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.home_daily_life","orderInDomain":9}'::jsonb),
    ('5828b101-3c99-51f2-82c2-828215370ad6'::uuid, 'process.learning.study_session', 'Учебная сессия', 'Общий эпизод учёбы.', 'PROCESS', 'learning_process', 'leaf', 'is_a', 'process.learning', 'domain.learning_knowledge_development', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.learning.study_session","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":2}'::jsonb),
    ('cfa36919-7e63-5dc7-860d-272c41ed5232'::uuid, 'process.learning.reading_study', 'Чтение/изучение материала', 'Чтение с учебной целью.', 'PROCESS', 'learning_process', 'leaf', 'is_a', 'process.learning', 'domain.learning_knowledge_development', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.learning.reading_study","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":3}'::jsonb),
    ('e16a189d-cf61-549e-9d64-5467853d3045'::uuid, 'process.learning.practice_repetition', 'Практика/повторение', 'Повторение материала/навыка; repetitions/items_count if explicit.', 'PROCESS', 'practice_process', 'leaf', 'is_a', 'process.learning', 'domain.learning_knowledge_development', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.learning.practice_repetition","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":4}'::jsonb),
    ('603bc099-58f0-54e7-b358-83a9e7b7bd14'::uuid, 'process.learning.language_practice', 'Языковая практика', 'Практика иностранного/родного языка; language_code via relation/context.', 'PROCESS', 'language_learning_process', 'leaf', 'is_a', 'process.learning', 'domain.learning_knowledge_development', 2, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.learning.language_practice","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":5}'::jsonb),
    ('56949fc9-939e-537f-a961-82ec0f4bddd9'::uuid, 'process.learning.test_exam', 'Тест/экзамен', 'Фактический контроль знаний; score only if explicit.', 'PROCESS', 'assessment_process', 'leaf', 'is_a', 'process.learning', 'domain.learning_knowledge_development', 2, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.learning.test_exam","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":6}'::jsonb),
    ('1159931a-7033-5864-a476-60d8d49cf753'::uuid, 'state.learning.understanding', 'Понимание материала', 'Качественное/explicit оценённое понимание.', 'STATE', 'knowledge_state', 'leaf', 'is_a', 'state.learning', 'domain.learning_knowledge_development', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.learning.understanding","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":8}'::jsonb),
    ('1a6d572d-9069-5f11-97db-1978170c9015'::uuid, 'state.learning.confidence', 'Уверенность в знании/навыке', 'Субъективная уверенность; не равна объективной компетенции.', 'STATE', 'knowledge_state', 'leaf', 'is_a', 'state.learning', 'domain.learning_knowledge_development', 2, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.learning.confidence","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":9}'::jsonb),
    ('66b78b18-ba46-56b1-9c21-1765ee625462'::uuid, 'knowledge.general.topic', 'Знание/понятие', 'Минимальный placeholder для подтверждённого knowledge target; конкретные области расширяются контролируемо.', 'KNOWLEDGE', 'knowledge_item', 'leaf', 'is_a', 'knowledge.general', 'domain.learning_knowledge_development', 2, 11, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"knowledge.general.topic","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.learning_knowledge_development","orderInDomain":11}'::jsonb),
    ('97319792-3824-586f-93fe-49650e3949d2'::uuid, 'state.emotional.mood', 'Настроение', 'Общее текущее настроение/его качественное изменение.', 'STATE', 'mood_state', 'leaf', 'is_a', 'state.emotional', 'domain.mental_cognitive_state', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.emotional.mood","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":2}'::jsonb),
    ('cc2b0055-cbd0-55a5-8438-455ad758d0d6'::uuid, 'state.emotional.stress', 'Психологическое напряжение/стресс', 'Субъективное напряжение/стресс без автоматической медицинской интерпретации.', 'STATE', 'stress_state', 'leaf', 'is_a', 'state.emotional', 'domain.mental_cognitive_state', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.emotional.stress","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":3}'::jsonb),
    ('81100473-ec9a-5cbe-b3d2-bea63d846b7d'::uuid, 'state.emotional.anxiety', 'Тревожность', 'Качественное или explicit scale состояние тревожности.', 'STATE', 'anxiety_state', 'leaf', 'is_a', 'state.emotional', 'domain.mental_cognitive_state', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.emotional.anxiety","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":4}'::jsonb),
    ('2adcf4c4-7716-5aea-ac57-e84a9409dbb7'::uuid, 'state.emotional.calmness', 'Спокойствие', 'Качественное состояние спокойствия.', 'STATE', 'calm_state', 'leaf', 'is_a', 'state.emotional', 'domain.mental_cognitive_state', 2, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.emotional.calmness","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":5}'::jsonb),
    ('544c92e4-7dba-5585-b932-cfec1e1c6397'::uuid, 'state.cognitive.concentration', 'Концентрация', 'Субъективное/explicit measure состояние концентрации.', 'STATE', 'cognitive_state', 'leaf', 'is_a', 'state.cognitive', 'domain.mental_cognitive_state', 2, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.cognitive.concentration","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":7}'::jsonb),
    ('4315f849-b64c-5439-a61f-6947633aa22a'::uuid, 'state.cognitive.attention', 'Внимание', 'Качество/устойчивость внимания.', 'STATE', 'cognitive_state', 'leaf', 'is_a', 'state.cognitive', 'domain.mental_cognitive_state', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.cognitive.attention","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":8}'::jsonb),
    ('ec993951-0b95-5480-bc35-9a9e02e58bb7'::uuid, 'state.cognitive.mental_fatigue', 'Умственная усталость', 'Качественное состояние умственной усталости.', 'STATE', 'fatigue_state', 'leaf', 'is_a', 'state.cognitive', 'domain.mental_cognitive_state', 2, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.cognitive.mental_fatigue","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":9}'::jsonb),
    ('69f66de8-a41e-52da-8a00-7aef31411710'::uuid, 'process.cognitive.focused_work', 'Сосредоточенная умственная работа', 'Эпизод целенаправленной когнитивной деятельности, не привязанный к конкретной профессии.', 'PROCESS', 'cognitive_process', 'leaf', 'is_a', 'process.cognitive', 'domain.mental_cognitive_state', 2, 11, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.cognitive.focused_work","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.mental_cognitive_state","orderInDomain":11}'::jsonb),
    ('33ebed64-4fbe-549a-9feb-17745a356453'::uuid, 'process.movement.walking', 'Ходьба', 'Обычная ходьба/прогулка; purpose/context — relation, не новый leaf.', 'PROCESS', 'locomotion_process', 'leaf', 'is_a', 'process.movement.locomotion', 'domain.movement_physical_activity', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.movement.walking","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":2}'::jsonb),
    ('ec8b39bc-97b9-5d3c-8347-ff03d9612536'::uuid, 'process.movement.running', 'Бег', 'Беговой эпизод.', 'PROCESS', 'locomotion_process', 'leaf', 'is_a', 'process.movement.locomotion', 'domain.movement_physical_activity', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.movement.running","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":3}'::jsonb),
    ('19a4cdbd-26eb-5681-9b70-b378e9989283'::uuid, 'process.movement.cycling', 'Езда на велосипеде', 'Велосипедная активность.', 'PROCESS', 'locomotion_process', 'leaf', 'is_a', 'process.movement.locomotion', 'domain.movement_physical_activity', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.movement.cycling","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":4}'::jsonb),
    ('3ee2e6c7-9d85-5206-ad89-c4436ae53739'::uuid, 'process.movement.swimming', 'Плавание', 'Плавание как физическая активность.', 'PROCESS', 'locomotion_process', 'leaf', 'is_a', 'process.movement.locomotion', 'domain.movement_physical_activity', 2, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.movement.swimming","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":5}'::jsonb),
    ('695a87e5-3015-58c7-92df-55596e102277'::uuid, 'process.exercise.plank', 'Планка', 'Статическое упражнение в положении планки.', 'PROCESS', 'isometric_exercise', 'leaf', 'is_a', 'process.exercise', 'domain.movement_physical_activity', 2, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.exercise.plank","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":7}'::jsonb),
    ('95870d7c-f15e-5622-a35a-6341e8e67c2d'::uuid, 'process.exercise.reverse_plank', 'Обратная планка', 'Статическое упражнение в положении обратной планки.', 'PROCESS', 'isometric_exercise', 'leaf', 'is_a', 'process.exercise', 'domain.movement_physical_activity', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.exercise.reverse_plank","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":8}'::jsonb),
    ('35ded42d-e377-5461-b4e0-1a2ac4668f98'::uuid, 'process.exercise.push_up', 'Отжимания', 'Отжимания; repetitions/set_count при explicit данных.', 'PROCESS', 'bodyweight_strength_exercise', 'leaf', 'is_a', 'process.exercise', 'domain.movement_physical_activity', 2, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.exercise.push_up","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":9}'::jsonb),
    ('f29e959b-ec27-543c-8bb9-4a24c0f77337'::uuid, 'process.exercise.pull_up', 'Подтягивания', 'Подтягивания; repetitions/set_count при explicit данных.', 'PROCESS', 'bodyweight_strength_exercise', 'leaf', 'is_a', 'process.exercise', 'domain.movement_physical_activity', 2, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.exercise.pull_up","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":10}'::jsonb),
    ('59468778-8a70-53e6-99e8-a22036266ae3'::uuid, 'process.exercise.squat', 'Приседания', 'Приседания с/без нагрузки; конкретный variant может стать candidate.', 'PROCESS', 'strength_exercise', 'leaf', 'is_a', 'process.exercise', 'domain.movement_physical_activity', 2, 11, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.exercise.squat","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":11}'::jsonb),
    ('ece85f3f-1b25-5572-a030-36b8bc22fe6f'::uuid, 'process.exercise.mobility_stretching', 'Растяжка/мобилизация', 'Растяжка и mobility-сессия.', 'PROCESS', 'mobility_exercise', 'leaf', 'is_a', 'process.exercise', 'domain.movement_physical_activity', 2, 12, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.exercise.mobility_stretching","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":12}'::jsonb),
    ('2b712709-38cf-54bc-ac43-8a9856041b2c'::uuid, 'behavior.movement.prolonged_sitting', 'Продолжительное сидение', 'Период сидения/низкой подвижности; duration only if explicit/derived from event interval.', 'BEHAVIOR', 'sedentary_behavior', 'leaf', 'is_a', 'behavior.movement', 'domain.movement_physical_activity', 2, 14, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"behavior.movement.prolonged_sitting","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":14}'::jsonb),
    ('95e86b63-49c2-5e2a-9a25-94487de197ce'::uuid, 'behavior.movement.prolonged_standing', 'Продолжительное стояние', 'Период стояния.', 'BEHAVIOR', 'posture_behavior', 'leaf', 'is_a', 'behavior.movement', 'domain.movement_physical_activity', 2, 15, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"behavior.movement.prolonged_standing","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.movement_physical_activity","orderInDomain":15}'::jsonb),
    ('3d2f2aed-e971-50e9-bc6d-76678d27222e'::uuid, 'process.nutrition.meal', 'Приём пищи', 'Событие приёма пищи.', 'PROCESS', 'food_intake', 'leaf', 'is_a', 'process.nutrition', 'domain.nutrition_consumption', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.nutrition.meal","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":2}'::jsonb),
    ('87606111-47de-5627-8e18-a804ac89a58f'::uuid, 'process.nutrition.water_intake', 'Употребление воды', 'Событие употребления воды.', 'PROCESS', 'fluid_intake', 'leaf', 'is_a', 'process.nutrition', 'domain.nutrition_consumption', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.nutrition.water_intake","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":3}'::jsonb),
    ('7869922a-923b-5acd-bfa1-d9ac00fd3884'::uuid, 'process.nutrition.caffeine_intake', 'Употребление кофеина', 'Кофе/чай/кофеин как intake event; dose только explicit/source-backed.', 'PROCESS', 'substance_intake', 'leaf', 'is_a', 'process.nutrition', 'domain.nutrition_consumption', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.nutrition.caffeine_intake","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":4}'::jsonb),
    ('80aaabb2-eb4d-56e2-8e44-395acb27add5'::uuid, 'process.nutrition.alcohol_intake', 'Употребление алкоголя', 'Событие употребления алкоголя; amount только explicit/source-backed.', 'PROCESS', 'substance_intake', 'leaf', 'is_a', 'process.nutrition', 'domain.nutrition_consumption', 2, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.nutrition.alcohol_intake","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":5}'::jsonb),
    ('628469da-e705-5dc0-ae35-b79792eefc45'::uuid, 'entity.food.item', 'Пищевой продукт/блюдо', 'Общий объект потребляемой пищи; детализация продукта может быть candidate/reference later.', 'ENTITY', 'food_entity', 'leaf', 'is_a', 'entity.nutrition', 'domain.nutrition_consumption', 2, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.food.item","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":7}'::jsonb),
    ('811c6a1d-b34c-52c6-8cf5-34968aa12cd5'::uuid, 'entity.beverage.item', 'Напиток', 'Общий объект напитка.', 'ENTITY', 'beverage_entity', 'leaf', 'is_a', 'entity.nutrition', 'domain.nutrition_consumption', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.beverage.item","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":8}'::jsonb),
    ('8a7002f8-160a-5098-9320-616cf76ae719'::uuid, 'state.nutrition.hunger', 'Голод', 'Качественное/explicit scale состояние голода.', 'STATE', 'appetite_state', 'leaf', 'is_a', 'state.nutrition', 'domain.nutrition_consumption', 2, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.nutrition.hunger","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":10}'::jsonb),
    ('1c401480-667a-52cb-818d-e319574b8a65'::uuid, 'state.nutrition.satiety', 'Сытость', 'Качественное/explicit scale состояние сытости.', 'STATE', 'appetite_state', 'leaf', 'is_a', 'state.nutrition', 'domain.nutrition_consumption', 2, 11, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.nutrition.satiety","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":11}'::jsonb),
    ('2f481a2f-33e8-523c-aede-5406bce52350'::uuid, 'state.nutrition.thirst', 'Жажда', 'Качественное/explicit scale состояние жажды.', 'STATE', 'hydration_state', 'leaf', 'is_a', 'state.nutrition', 'domain.nutrition_consumption', 2, 12, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.nutrition.thirst","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.nutrition_consumption","orderInDomain":12}'::jsonb),
    ('7615198b-3a8c-5059-9f8d-108851d6d954'::uuid, 'relationship.partner', 'Партнёрские отношения', 'Глобальный тип отношений; конкретный партнёр создаётся позже actor-scoped.', 'RELATIONSHIP', 'close_relationship_type', 'leaf', 'is_a', 'relationship.social', 'domain.relationships_social_life', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"relationship.partner","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":2}'::jsonb),
    ('3d5028c7-ae2d-5066-b181-914a9cd2de24'::uuid, 'relationship.parent_child', 'Родительско-детские отношения', 'Глобальный тип отношений.', 'RELATIONSHIP', 'family_relationship_type', 'leaf', 'is_a', 'relationship.social', 'domain.relationships_social_life', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"relationship.parent_child","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":3}'::jsonb),
    ('751f716e-775c-5934-8e94-2ad7e36c9d7a'::uuid, 'relationship.friendship', 'Дружеские отношения', 'Глобальный тип дружеских отношений.', 'RELATIONSHIP', 'social_relationship_type', 'leaf', 'is_a', 'relationship.social', 'domain.relationships_social_life', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"relationship.friendship","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":4}'::jsonb),
    ('b00b7a06-487d-5a2f-8cad-4c53ac01582d'::uuid, 'relationship.colleague', 'Коллегиальные отношения', 'Глобальный тип отношений с коллегами.', 'RELATIONSHIP', 'work_relationship_type', 'leaf', 'is_a', 'relationship.social', 'domain.relationships_social_life', 2, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"relationship.colleague","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":5}'::jsonb),
    ('996dd8cb-c786-5535-a9ac-04d5b65a676b'::uuid, 'process.social.conversation', 'Разговор', 'Разговор с участником/участниками.', 'PROCESS', 'communication_process', 'leaf', 'is_a', 'process.social_interaction', 'domain.relationships_social_life', 2, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.social.conversation","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":7}'::jsonb),
    ('244bda29-55df-56c2-b0e4-17bf99016461'::uuid, 'process.social.shared_time', 'Совместное время/досуг', 'Совместное время; конкретная activity может дополнительно иметь свой PROCESS leaf.', 'PROCESS', 'joint_activity_process', 'leaf', 'is_a', 'process.social_interaction', 'domain.relationships_social_life', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.social.shared_time","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":8}'::jsonb),
    ('0afc859f-7cb7-5e72-95d8-4de115fbc77e'::uuid, 'process.social.conflict_interaction', 'Конфликтное взаимодействие', 'Эпизод конфликта; stress/mood не вшиваются автоматически.', 'PROCESS', 'conflict_process', 'leaf', 'is_a', 'process.social_interaction', 'domain.relationships_social_life', 2, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.social.conflict_interaction","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":9}'::jsonb),
    ('7dd9e689-1569-54d8-9661-713044b1aeb5'::uuid, 'process.social.support_exchange', 'Помощь/поддержка', 'Оказание/получение практической или эмоциональной поддержки.', 'PROCESS', 'support_process', 'leaf', 'is_a', 'process.social_interaction', 'domain.relationships_social_life', 2, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.social.support_exchange","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":10}'::jsonb),
    ('0dcf3dd6-b2a5-5630-8e1b-5933489b4b57'::uuid, 'process.social.caregiving', 'Забота/уход за другим', 'Эпизод заботы/ухода; participant — relation.', 'PROCESS', 'caregiving_process', 'leaf', 'is_a', 'process.social_interaction', 'domain.relationships_social_life', 2, 11, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.social.caregiving","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":11}'::jsonb),
    ('a0ad10a8-d7ea-5d84-8f52-64b666aaa889'::uuid, 'role.social.partner', 'Партнёр/супруг', 'Глобальная роль, не конкретный человек.', 'ROLE', 'social_role', 'leaf', 'is_a', 'role.social', 'domain.relationships_social_life', 2, 13, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"role.social.partner","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":13}'::jsonb),
    ('1a260800-7c4a-57d0-a51b-36b1ade26c0f'::uuid, 'role.social.parent', 'Родитель', 'Глобальная роль.', 'ROLE', 'social_role', 'leaf', 'is_a', 'role.social', 'domain.relationships_social_life', 2, 14, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"role.social.parent","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":14}'::jsonb),
    ('98d09578-8835-544c-894f-105b792083c3'::uuid, 'role.social.friend', 'Друг', 'Глобальная роль.', 'ROLE', 'social_role', 'leaf', 'is_a', 'role.social', 'domain.relationships_social_life', 2, 15, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"role.social.friend","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":15}'::jsonb),
    ('d9c11af2-4943-5a3a-ae6a-90bc7879d1a8'::uuid, 'role.social.colleague', 'Коллега', 'Глобальная роль.', 'ROLE', 'social_role', 'leaf', 'is_a', 'role.social', 'domain.relationships_social_life', 2, 16, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"role.social.colleague","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.relationships_social_life","orderInDomain":16}'::jsonb),
    ('9b04f12c-06e4-51af-928c-cb5f69333c29'::uuid, 'process.creative.instrument_playing', 'Игра на музыкальном инструменте', 'Игра/практика на музыкальном инструменте.', 'PROCESS', 'creative_process', 'leaf', 'is_a', 'process.creative', 'domain.rest_creativity_leisure', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.creative.instrument_playing","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.rest_creativity_leisure","orderInDomain":2}'::jsonb),
    ('d2f61ba0-5a60-5128-8bf2-544ffc0da66a'::uuid, 'process.creative.singing', 'Пение', 'Пение как творческий процесс; professional context relation возможен.', 'PROCESS', 'creative_process', 'leaf', 'is_a', 'process.creative', 'domain.rest_creativity_leisure', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.creative.singing","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.rest_creativity_leisure","orderInDomain":3}'::jsonb),
    ('0f0a0293-89f8-5dba-b58a-2b08ad6bd611'::uuid, 'process.creative.creation', 'Создание текста/визуального материала', 'Творческое создание контента/произведения.', 'PROCESS', 'creative_process', 'leaf', 'is_a', 'process.creative', 'domain.rest_creativity_leisure', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.creative.creation","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.rest_creativity_leisure","orderInDomain":4}'::jsonb),
    ('c6cd3ebc-2d12-584e-8da9-b0c4904e90a6'::uuid, 'process.leisure.game', 'Игра/видеоигра', 'Игровой досуг.', 'PROCESS', 'leisure_process', 'leaf', 'is_a', 'process.leisure', 'domain.rest_creativity_leisure', 2, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.leisure.game","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.rest_creativity_leisure","orderInDomain":6}'::jsonb),
    ('4ecf4889-0015-51d5-8a09-596496a1eef7'::uuid, 'process.leisure.media_consumption', 'Просмотр медиа', 'Просмотр видео/телевидения/стриминга.', 'PROCESS', 'leisure_process', 'leaf', 'is_a', 'process.leisure', 'domain.rest_creativity_leisure', 2, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.leisure.media_consumption","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.rest_creativity_leisure","orderInDomain":7}'::jsonb),
    ('ce90b6c3-1e75-5ddb-8404-0251e6f0a62a'::uuid, 'process.leisure.cultural_event', 'Культурное мероприятие', 'Посещение/участие в культурном событии как досуг.', 'PROCESS', 'leisure_process', 'leaf', 'is_a', 'process.leisure', 'domain.rest_creativity_leisure', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.leisure.cultural_event","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.rest_creativity_leisure","orderInDomain":8}'::jsonb),
    ('8a92ecc9-ff84-50fc-a682-86859384dbb1'::uuid, 'process.leisure.free_rest', 'Свободный отдых', 'Свободный отдых, когда нет более точного процесса.', 'PROCESS', 'leisure_process', 'leaf', 'is_a', 'process.leisure', 'domain.rest_creativity_leisure', 2, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.leisure.free_rest","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.rest_creativity_leisure","orderInDomain":9}'::jsonb),
    ('d927be02-f26f-5c62-acf0-bd4025fc94c9'::uuid, 'process.sleep.night_episode', 'Ночной сон', 'Основной эпизод сна в ночной период.', 'PROCESS', 'sleep_episode', 'leaf', 'is_a', 'process.sleep_recovery', 'domain.sleep_recovery', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.sleep.night_episode","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.sleep_recovery","orderInDomain":2}'::jsonb),
    ('9d4df631-ddf3-5d99-9444-12f45ee1f8fc'::uuid, 'process.sleep.day_episode', 'Дневной сон', 'Дневной эпизод сна/дремоты.', 'PROCESS', 'sleep_episode', 'leaf', 'is_a', 'process.sleep_recovery', 'domain.sleep_recovery', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.sleep.day_episode","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.sleep_recovery","orderInDomain":3}'::jsonb),
    ('24213b56-91d1-543d-96a0-5d9dbafe2965'::uuid, 'process.recovery.rest_awake', 'Отдых без сна', 'Период отдыха без сна.', 'PROCESS', 'rest_episode', 'leaf', 'is_a', 'process.sleep_recovery', 'domain.sleep_recovery', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.recovery.rest_awake","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.sleep_recovery","orderInDomain":4}'::jsonb),
    ('63dd0029-f075-50a6-b335-d1bda22c2437'::uuid, 'state.sleep.sleepiness', 'Сонливость', 'Качественная/explicit scale сонливости.', 'STATE', 'sleepiness_state', 'leaf', 'is_a', 'state.sleep_recovery', 'domain.sleep_recovery', 2, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.sleep.sleepiness","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.sleep_recovery","orderInDomain":6}'::jsonb),
    ('398010f0-32ae-5b95-9046-5f194b8227b0'::uuid, 'state.recovery.restedness', 'Восстановленность', 'Ощущение/измерение восстановленности.', 'STATE', 'recovery_state', 'leaf', 'is_a', 'state.sleep_recovery', 'domain.sleep_recovery', 2, 7, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.recovery.restedness","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.sleep_recovery","orderInDomain":7}'::jsonb),
    ('335ddbbe-868a-570a-a611-271eaeb84c91'::uuid, 'state.sleep.sleep_onset_difficulty', 'Трудность засыпания', 'Качественное состояние или explicit latency.', 'STATE', 'sleep_state', 'leaf', 'is_a', 'state.sleep_recovery', 'domain.sleep_recovery', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.sleep.sleep_onset_difficulty","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.sleep_recovery","orderInDomain":8}'::jsonb),
    ('4445ccfd-e3b8-57e9-be51-731ca9525346'::uuid, 'process.work.session', 'Рабочая сессия', 'Общий эпизод работы.', 'PROCESS', 'work_process', 'leaf', 'is_a', 'process.work', 'domain.work_professional_activity', 2, 2, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.work.session","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":2}'::jsonb),
    ('791512cb-6029-5fb0-ab14-adc7aad2a555'::uuid, 'process.work.meeting', 'Встреча/совещание', 'Рабочее совещание/встреча.', 'PROCESS', 'meeting_process', 'leaf', 'is_a', 'process.work', 'domain.work_professional_activity', 2, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.work.meeting","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":3}'::jsonb),
    ('17b7e615-3ce7-5b85-91ce-89e4dd3a7f97'::uuid, 'process.work.client_interaction', 'Клиентское взаимодействие', 'Взаимодействие с клиентом/заказчиком.', 'PROCESS', 'client_process', 'leaf', 'is_a', 'process.work', 'domain.work_professional_activity', 2, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.work.client_interaction","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":4}'::jsonb),
    ('b387e9f1-651c-5050-8141-a62e03d595b3'::uuid, 'process.work.administrative', 'Административная работа', 'Административные/офисные задачи.', 'PROCESS', 'administrative_process', 'leaf', 'is_a', 'process.work', 'domain.work_professional_activity', 2, 5, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.work.administrative","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":5}'::jsonb),
    ('c6f264ca-5240-536a-b948-60a94aa40931'::uuid, 'process.work.performance', 'Публичное выступление/исполнение', 'Профессиональное публичное исполнение/выступление; relation связывает с творческим процессом при необходимости.', 'PROCESS', 'performance_process', 'leaf', 'is_a', 'process.work', 'domain.work_professional_activity', 2, 6, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"process.work.performance","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":6}'::jsonb),
    ('fd7d5e14-44a0-54fd-bdce-714aeaf8418d'::uuid, 'state.work.workload', 'Рабочая нагрузка', 'Качественная/explicit шкала текущей нагрузки.', 'STATE', 'workload_state', 'leaf', 'is_a', 'state.work', 'domain.work_professional_activity', 2, 8, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.work.workload","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":8}'::jsonb),
    ('3d75334e-d53f-5397-b732-3260917811dc'::uuid, 'state.work.readiness', 'Готовность к работе', 'Текущее ощущение/измерение готовности без универсальной нормы.', 'STATE', 'readiness_state', 'leaf', 'is_a', 'state.work', 'domain.work_professional_activity', 2, 9, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"state.work.readiness","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":9}'::jsonb),
    ('a02160b3-6b87-56b2-a411-0b8781051754'::uuid, 'role.work.worker', 'Работник/исполнитель', 'Общая роль участника профессиональной деятельности; конкретные профессии — позже.', 'ROLE', 'professional_role', 'leaf', 'is_a', 'role.work', 'domain.work_professional_activity', 2, 11, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"role.work.worker","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.work_professional_activity","orderInDomain":11}'::jsonb),
    ('6497dca9-a076-57a9-b69f-39e1e225efab'::uuid, 'entity.body.spine', 'Позвоночник', 'Опорно-двигательная структура; сырые факты только на более точных leaf.', 'ENTITY', 'anatomical_structure', 'intermediate', 'part_of', 'entity.body', 'domain.body_physiology', 3, 3, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.body.spine","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.body_physiology","orderInDomain":3}'::jsonb),
    ('92f3e4f6-fd93-5956-90bb-780fd05c6995'::uuid, 'entity.body.spine.lumbar', 'Поясничный отдел позвоночника', 'Терминальная анатомическая мишень для боли/скованности/подвижности.', 'ENTITY', 'anatomical_region', 'leaf', 'part_of', 'entity.body.spine', 'domain.body_physiology', 4, 4, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","designSource":"ARCTor_System_Reality_Seed_Global_Layer_v0_2_RU_20260811","layer":"global_system","canonicalKey":"entity.body.spine.lumbar","aiCanonicalCreateAllowed":false,"unknownLeafAction":"PROPOSE","unknownParameterAction":"PROPOSE","entryType":"node","domainCanonicalKey":"domain.body_physiology","orderInDomain":4}'::jsonb);

-- Structural validity before touching canonical Value Objects.
do $stage_guard$
declare
  v_count integer;
begin
  select count(*) into v_count from gsr1_global_seed_stage;
  if v_count <> 150 then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_STAGE_COUNT_MUST_EQUAL_150';
  end if;

  if (
    select count(*)
    from gsr1_global_seed_stage
    where node_role_code = 'root'
  ) <> 12 then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_STAGE_ROOT_COUNT_MUST_EQUAL_12';
  end if;

  if (
    select count(*)
    from gsr1_global_seed_stage
    where node_role_code = 'intermediate'
  ) <> 35 then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_STAGE_INTERMEDIATE_COUNT_MUST_EQUAL_35';
  end if;

  if (
    select count(*)
    from gsr1_global_seed_stage
    where node_role_code = 'leaf'
  ) <> 103 then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_STAGE_LEAF_COUNT_MUST_EQUAL_103';
  end if;

  if exists (
    select 1
    from gsr1_global_seed_stage child
    left join gsr1_global_seed_stage parent
      on parent.canonical_key = child.parent_canonical_key
    where child.node_role_code <> 'root'
      and parent.id is null
  ) then
    raise exception using
      errcode = '23503',
      message = 'GSR1B_STAGE_PARENT_NOT_FOUND';
  end if;

  if exists (
    select 1
    from gsr1_global_seed_stage child
    join gsr1_global_seed_stage parent
      on parent.canonical_key = child.parent_canonical_key
    where parent.node_role_code = 'leaf'
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_STAGE_LEAF_HAS_CHILD';
  end if;

  if exists (
    select 1
    from gsr1_global_seed_stage child
    join gsr1_global_seed_stage parent
      on parent.canonical_key = child.parent_canonical_key
    where parent.node_role_code <> 'root'
      and child.facet_code <> parent.facet_code
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_STAGE_NON_ROOT_FACET_MISMATCH';
  end if;

  if exists (
    select 1
    from gsr1_global_seed_stage stage
    where not exists (
      select 1
      from public.value_object_kind_registry kind_registry
      where kind_registry.object_kind_code = stage.object_kind_code
        and kind_registry.facet_code = stage.facet_code
        and kind_registry.status = 'active'
        and kind_registry.allowed_node_roles_json ? stage.node_role_code
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_STAGE_KIND_OR_ROLE_NOT_ALLOWED';
  end if;

  if exists (
    select 1
    from gsr1_global_seed_stage stage
    join public.value_objects existing
      on existing.id = stage.id
    where existing.canonical_key is distinct from stage.canonical_key
  ) then
    raise exception using
      errcode = '23505',
      message = 'GSR1B_DETERMINISTIC_UUID_COLLISION';
  end if;
end;
$stage_guard$;

-- ---------------------------------------------------------------------------
-- 2. Helper macro pattern:
-- legacy storage remains the P1C bridge values:
--   value_type='other'
--   object_kind='other'
--   node_role_code='structural'
--   branch_type_code='ontology_v1'
-- Canonical ontology meaning lives in P1 fields.
-- ---------------------------------------------------------------------------

-- 2A. Roots.
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
select
  stage.id,
  null,
  'other',
  stage.title,
  stage.description,
  null,
  'none',
  null,
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
  stage.id,
  null,
  'public',
  'standard',
  'active',
  stage.canonical_key,
  stage.facet_code,
  stage.object_kind_code,
  stage.node_role_code,
  null,
  'global',
  'public',
  'public_ontology',
  1,
  'system_model',
  stage.metadata_json
    || jsonb_build_object(
      'authoring_contract', 'ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1',
      'deterministic_uuid_namespace', 'd16324ec-d4bc-5c1d-8fde-35178b50c9f8',
      'legacy_bridge', true
    ),
  '{}'::jsonb
from gsr1_global_seed_stage stage
where stage.depth = 0
order by stage.display_order, stage.canonical_key;

-- 2B. Descendants in parent-before-child order.
do $insert_descendants$
declare
  v_depth integer;
  v_inserted integer;
begin
  for v_depth in 1..4 loop
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
    select
      stage.id,
      null,
      'other',
      stage.title,
      stage.description,
      null,
      'none',
      parent.id,
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
      root_object.id,
      null,
      'public',
      'standard',
      'active',
      stage.canonical_key,
      stage.facet_code,
      stage.object_kind_code,
      stage.node_role_code,
      stage.hierarchy_relation_code,
      'global',
      'public',
      'public_ontology',
      1,
      'system_model',
      stage.metadata_json
        || jsonb_build_object(
          'authoring_contract', 'ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1',
          'deterministic_uuid_namespace', 'd16324ec-d4bc-5c1d-8fde-35178b50c9f8',
          'legacy_bridge', true
        ),
      '{}'::jsonb
    from gsr1_global_seed_stage stage
    join public.value_objects parent
      on parent.canonical_key = stage.parent_canonical_key
     and parent.scope_code = 'global'
    join public.value_objects root_object
      on root_object.canonical_key = stage.root_canonical_key
     and root_object.scope_code = 'global'
    where stage.depth = v_depth
    order by stage.display_order, stage.canonical_key;

    get diagnostics v_inserted = row_count;

    if v_inserted <> (
      select count(*)
      from gsr1_global_seed_stage
      where depth = v_depth
    ) then
      raise exception using
        errcode = '23514',
        message = 'GSR1B_DEPTH_INSERT_COUNT_MISMATCH_' || v_depth::text;
    end if;
  end loop;
end;
$insert_descendants$;

-- ---------------------------------------------------------------------------
-- 3. Parameter assignments for approved pilot leaf contracts.
-- ---------------------------------------------------------------------------

create temporary table gsr1_parameter_assignment_stage (
  leaf_canonical_key text not null,
  semantic_parameter_code text not null,
  storage_parameter_code text not null,
  is_optional boolean not null,
  display_order integer not null,
  metadata_json jsonb not null
) on commit drop;

insert into gsr1_parameter_assignment_stage (
  leaf_canonical_key,
  semantic_parameter_code,
  storage_parameter_code,
  is_optional,
  display_order,
  metadata_json
)
values
    ('state.physiology.body_weight', 'body_weight_kg', 'body_mass', false, 10, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"body_weight_kg","storageParameterCode":"body_mass","optional":false,"sources":"manual/device","aggregationPolicyRu":"latest + daily avg + trend_7d","aiMayInventValue":false}'::jsonb),
    ('state.physiology.heart_rate', 'heart_rate_bpm', 'heart_rate', false, 20, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"heart_rate_bpm","storageParameterCode":"heart_rate","optional":false,"sources":"manual/device","aggregationPolicyRu":"latest + avg/min/max by window","aiMayInventValue":false}'::jsonb),
    ('state.physiology.blood_pressure', 'blood_pressure_systolic_mmhg', 'blood_pressure_systolic_mmhg', false, 30, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"blood_pressure_systolic_mmhg","storageParameterCode":"blood_pressure_systolic_mmhg","optional":false,"sources":"manual/device","aggregationPolicyRu":"latest + avg; paired observation","aiMayInventValue":false}'::jsonb),
    ('state.physiology.blood_pressure', 'blood_pressure_diastolic_mmhg', 'blood_pressure_diastolic_mmhg', false, 40, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"blood_pressure_diastolic_mmhg","storageParameterCode":"blood_pressure_diastolic_mmhg","optional":false,"sources":"manual/device","aggregationPolicyRu":"latest + avg; paired observation","aiMayInventValue":false}'::jsonb),
    ('state.physiology.pain', 'qualitative_state', 'observed_text', false, 50, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"qualitative_state","storageParameterCode":"observed_text","optional":false,"sources":"manual","aggregationPolicyRu":"latest + episodes; explicit scale only","aiMayInventValue":false}'::jsonb),
    ('state.physiology.pain', 'intensity_scale', 'state_score', false, 60, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"intensity_scale","storageParameterCode":"state_score","optional":false,"sources":"manual","aggregationPolicyRu":"latest + episodes; explicit scale only","aiMayInventValue":false}'::jsonb),
    ('process.sleep.night_episode', 'duration_minutes', 'duration', false, 70, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum_24h; avg_7d","aiMayInventValue":false}'::jsonb),
    ('process.sleep.night_episode', 'sleep_latency_minutes', 'sleep_latency_minutes', false, 80, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"sleep_latency_minutes","storageParameterCode":"sleep_latency_minutes","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum_24h; avg_7d","aiMayInventValue":false}'::jsonb),
    ('process.sleep.day_episode', 'duration_minutes', 'duration', false, 90, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum_24h; avg_7d","aiMayInventValue":false}'::jsonb),
    ('process.nutrition.meal', 'duration_minutes', 'duration', true, 100, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":true,"sources":"manual/reference later","aggregationPolicyRu":"event count; occurred_at обязателен/восстанавливается с temporal_precision; explicit/source-backed amounts; meal_label optional","aiMayInventValue":false}'::jsonb),
    ('process.nutrition.meal', 'energy_kcal', 'energy_intake', true, 110, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"energy_kcal","storageParameterCode":"energy_intake","optional":true,"sources":"manual/reference later","aggregationPolicyRu":"event count; occurred_at обязателен/восстанавливается с temporal_precision; explicit/source-backed amounts; meal_label optional","aiMayInventValue":false}'::jsonb),
    ('process.nutrition.meal', 'food_mass_g', 'food_mass_g', true, 120, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"food_mass_g","storageParameterCode":"food_mass_g","optional":true,"sources":"manual/reference later","aggregationPolicyRu":"event count; occurred_at обязателен/восстанавливается с temporal_precision; explicit/source-backed amounts; meal_label optional","aiMayInventValue":false}'::jsonb),
    ('process.nutrition.meal', 'meal_label', 'meal_label', true, 130, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"meal_label","storageParameterCode":"meal_label","optional":true,"sources":"manual/reference later","aggregationPolicyRu":"event count; occurred_at обязателен/восстанавливается с temporal_precision; explicit/source-backed amounts; meal_label optional","aiMayInventValue":false}'::jsonb),
    ('process.nutrition.water_intake', 'fluid_volume_ml', 'liquid_volume', false, 140, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"fluid_volume_ml","storageParameterCode":"liquid_volume","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum_24h","aiMayInventValue":false}'::jsonb),
    ('process.exercise.plank', 'duration_minutes', 'duration', false, 150, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum by 24h/7d","aiMayInventValue":false}'::jsonb),
    ('process.exercise.plank', 'set_count', 'set_count', false, 160, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"set_count","storageParameterCode":"set_count","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum by 24h/7d","aiMayInventValue":false}'::jsonb),
    ('process.exercise.reverse_plank', 'duration_minutes', 'duration', false, 170, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum by 24h/7d","aiMayInventValue":false}'::jsonb),
    ('process.exercise.reverse_plank', 'set_count', 'set_count', false, 180, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"set_count","storageParameterCode":"set_count","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum by 24h/7d","aiMayInventValue":false}'::jsonb),
    ('process.exercise.push_up', 'repetition_count', 'repetition_count', false, 190, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"repetition_count","storageParameterCode":"repetition_count","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum reps/sets by window","aiMayInventValue":false}'::jsonb),
    ('process.exercise.push_up', 'set_count', 'set_count', false, 200, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"set_count","storageParameterCode":"set_count","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum reps/sets by window","aiMayInventValue":false}'::jsonb),
    ('process.exercise.push_up', 'duration_minutes', 'duration', true, 210, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":true,"sources":"manual/device","aggregationPolicyRu":"sum reps/sets by window","aiMayInventValue":false}'::jsonb),
    ('process.exercise.pull_up', 'repetition_count', 'repetition_count', false, 220, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"repetition_count","storageParameterCode":"repetition_count","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum reps/sets by window","aiMayInventValue":false}'::jsonb),
    ('process.exercise.pull_up', 'set_count', 'set_count', false, 230, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"set_count","storageParameterCode":"set_count","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum reps/sets by window","aiMayInventValue":false}'::jsonb),
    ('process.exercise.pull_up', 'duration_minutes', 'duration', true, 240, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":true,"sources":"manual/device","aggregationPolicyRu":"sum reps/sets by window","aiMayInventValue":false}'::jsonb),
    ('process.movement.walking', 'duration_minutes', 'duration', false, 250, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum by 24h/7d","aiMayInventValue":false}'::jsonb),
    ('process.movement.walking', 'distance_m', 'distance', false, 260, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"distance_m","storageParameterCode":"distance","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum by 24h/7d","aiMayInventValue":false}'::jsonb),
    ('behavior.movement.prolonged_sitting', 'duration_minutes', 'duration', false, 270, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/system","aggregationPolicyRu":"sum/max continuous bout","aiMayInventValue":false}'::jsonb),
    ('state.emotional.mood', 'qualitative_state', 'observed_text', false, 280, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"qualitative_state","storageParameterCode":"observed_text","optional":false,"sources":"manual","aggregationPolicyRu":"latest + transitions; explicit scale only","aiMayInventValue":false}'::jsonb),
    ('state.emotional.mood', 'intensity_scale', 'state_score', true, 290, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"intensity_scale","storageParameterCode":"state_score","optional":true,"sources":"manual","aggregationPolicyRu":"latest + transitions; explicit scale only","aiMayInventValue":false}'::jsonb),
    ('state.emotional.stress', 'qualitative_state', 'observed_text', false, 300, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"qualitative_state","storageParameterCode":"observed_text","optional":false,"sources":"manual/device only if device measure is separately defined","aggregationPolicyRu":"latest + windows","aiMayInventValue":false}'::jsonb),
    ('state.emotional.stress', 'intensity_scale', 'state_score', true, 310, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"intensity_scale","storageParameterCode":"state_score","optional":true,"sources":"manual/device only if device measure is separately defined","aggregationPolicyRu":"latest + windows","aiMayInventValue":false}'::jsonb),
    ('state.cognitive.concentration', 'qualitative_state', 'observed_text', false, 320, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"qualitative_state","storageParameterCode":"observed_text","optional":false,"sources":"manual","aggregationPolicyRu":"latest/episode context","aiMayInventValue":false}'::jsonb),
    ('state.cognitive.concentration', 'intensity_scale', 'state_score', true, 330, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"intensity_scale","storageParameterCode":"state_score","optional":true,"sources":"manual","aggregationPolicyRu":"latest/episode context","aiMayInventValue":false}'::jsonb),
    ('process.social.conversation', 'duration_minutes', 'duration', false, 340, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/system","aggregationPolicyRu":"sum by participant/context","aiMayInventValue":false}'::jsonb),
    ('process.social.conflict_interaction', 'duration_minutes', 'duration', true, 350, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":true,"sources":"manual","aggregationPolicyRu":"event count + duration if explicit","aiMayInventValue":false}'::jsonb),
    ('process.social.conflict_interaction', 'qualitative_state', 'observed_text', true, 360, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"qualitative_state","storageParameterCode":"observed_text","optional":true,"sources":"manual","aggregationPolicyRu":"event count + duration if explicit","aiMayInventValue":false}'::jsonb),
    ('process.work.session', 'duration_minutes', 'duration', false, 370, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/system","aggregationPolicyRu":"sum by day/week","aiMayInventValue":false}'::jsonb),
    ('process.work.session', 'interruption_count', 'interruption_count', true, 380, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"interruption_count","storageParameterCode":"interruption_count","optional":true,"sources":"manual/system","aggregationPolicyRu":"sum by day/week","aiMayInventValue":false}'::jsonb),
    ('process.learning.language_practice', 'duration_minutes', 'duration', false, 390, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/system","aggregationPolicyRu":"sum by day/week","aiMayInventValue":false}'::jsonb),
    ('process.learning.language_practice', 'repetition_count', 'repetition_count', false, 400, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"repetition_count","storageParameterCode":"repetition_count","optional":false,"sources":"manual/system","aggregationPolicyRu":"sum by day/week","aiMayInventValue":false}'::jsonb),
    ('process.learning.language_practice', 'items_count', 'items_count', false, 410, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"items_count","storageParameterCode":"items_count","optional":false,"sources":"manual/system","aggregationPolicyRu":"sum by day/week","aiMayInventValue":false}'::jsonb),
    ('process.finance.purchase', 'amount_money', 'monetary_amount_pln', false, 420, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"amount_money","storageParameterCode":"monetary_amount_pln","optional":false,"sources":"manual/import","aggregationPolicyRu":"sum by day/month","aiMayInventValue":false}'::jsonb),
    ('process.finance.purchase', 'amount_money', 'monetary_amount_eur', false, 430, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"amount_money","storageParameterCode":"monetary_amount_eur","optional":false,"sources":"manual/import","aggregationPolicyRu":"sum by day/month","aiMayInventValue":false}'::jsonb),
    ('process.finance.purchase', 'amount_money', 'monetary_amount_usd', false, 440, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"amount_money","storageParameterCode":"monetary_amount_usd","optional":false,"sources":"manual/import","aggregationPolicyRu":"sum by day/month","aiMayInventValue":false}'::jsonb),
    ('process.finance.purchase', 'currency_code', 'currency_code', false, 450, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"currency_code","storageParameterCode":"currency_code","optional":false,"sources":"manual/import","aggregationPolicyRu":"sum by day/month","aiMayInventValue":false}'::jsonb),
    ('context.weather.air_temperature', 'temperature_celsius', 'temperature', false, 460, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"temperature_celsius","storageParameterCode":"temperature","optional":false,"sources":"manual/external_api","aggregationPolicyRu":"latest/min/max/avg day","aiMayInventValue":false}'::jsonb),
    ('context.weather.cloudiness', 'weather_category', 'observed_text', false, 470, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"weather_category","storageParameterCode":"observed_text","optional":false,"sources":"manual/external_api","aggregationPolicyRu":"latest/avg if numeric","aiMayInventValue":false}'::jsonb),
    ('context.weather.cloudiness', 'cloudiness_percent', 'cloudiness_percent', true, 480, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"cloudiness_percent","storageParameterCode":"cloudiness_percent","optional":true,"sources":"manual/external_api","aggregationPolicyRu":"latest/avg if numeric","aiMayInventValue":false}'::jsonb),
    ('context.environment.indoor_outdoor', 'qualitative_state', 'observed_text', false, 490, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"qualitative_state","storageParameterCode":"observed_text","optional":false,"sources":"manual/device","aggregationPolicyRu":"latest/context duration","aiMayInventValue":false}'::jsonb),
    ('process.creative.instrument_playing', 'duration_minutes', 'duration', false, 500, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/device","aggregationPolicyRu":"sum by day/week","aiMayInventValue":false}'::jsonb),
    ('process.creative.instrument_playing', 'repetition_count', 'repetition_count', true, 510, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"repetition_count","storageParameterCode":"repetition_count","optional":true,"sources":"manual/device","aggregationPolicyRu":"sum by day/week","aiMayInventValue":false}'::jsonb),
    ('context.resources.available_time', 'available_duration_minutes', 'duration', false, 520, '{"contract":"ARCTOR_GSR1_GLOBAL_SYSTEM_SEED_V1","semanticParameterCode":"available_duration_minutes","storageParameterCode":"duration","optional":false,"sources":"manual/planner","aggregationPolicyRu":"latest by declared window; history kept; no automatic conversion into goal","aiMayInventValue":false}'::jsonb);

do $assignment_preflight$
begin
  if (
    select count(*)
    from gsr1_parameter_assignment_stage
  ) <> 52 then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_PARAMETER_ASSIGNMENT_STAGE_COUNT_MISMATCH';
  end if;

  if exists (
    select 1
    from gsr1_parameter_assignment_stage stage
    left join public.value_objects leaf
      on leaf.canonical_key = stage.leaf_canonical_key
     and leaf.scope_code = 'global'
     and leaf.ontology_node_role_code = 'leaf'
    where leaf.id is null
  ) then
    raise exception using
      errcode = '23503',
      message = 'GSR1B_PARAMETER_ASSIGNMENT_LEAF_NOT_FOUND';
  end if;

  if exists (
    select 1
    from gsr1_parameter_assignment_stage stage
    left join public.value_object_parameter_definitions definition
      on definition.parameter_code = stage.storage_parameter_code
     and definition.scope_code = 'system'
     and definition.status = 'active'
    where definition.id is null
  ) then
    raise exception using
      errcode = '23503',
      message = 'GSR1B_PARAMETER_ASSIGNMENT_DEFINITION_NOT_FOUND';
  end if;
end;
$assignment_preflight$;

insert into public.value_object_parameter_assignments (
  value_object_id,
  parameter_definition_id,
  owner_user_id,
  owner_actor_id,
  created_by_actor_id,
  assignment_scope_code,
  status,
  display_order,
  idempotency_key,
  metadata_json
)
select
  leaf.id,
  definition.id,
  null,
  null,
  null,
  'system',
  'active',
  stage.display_order,
  null,
  stage.metadata_json
from gsr1_parameter_assignment_stage stage
join public.value_objects leaf
  on leaf.canonical_key = stage.leaf_canonical_key
 and leaf.scope_code = 'global'
 and leaf.ontology_node_role_code = 'leaf'
join public.value_object_parameter_definitions definition
  on definition.parameter_code = stage.storage_parameter_code
 and definition.scope_code = 'system'
 and definition.status = 'active'
order by stage.display_order, stage.leaf_canonical_key, stage.storage_parameter_code;

-- ---------------------------------------------------------------------------
-- 4. Transactional acceptance gate.
-- ---------------------------------------------------------------------------

do $acceptance$
declare
  v_global integer;
  v_roots integer;
  v_intermediate integer;
  v_leaves integer;
  v_versions integer;
  v_assignments integer;
begin
  select
    count(*),
    count(*) filter (where ontology_node_role_code = 'root'),
    count(*) filter (where ontology_node_role_code = 'intermediate'),
    count(*) filter (where ontology_node_role_code = 'leaf')
  into
    v_global,
    v_roots,
    v_intermediate,
    v_leaves
  from public.value_objects
  where scope_code = 'global'
    and canonical_key is not null;

  if v_global <> 150
     or v_roots <> 12
     or v_intermediate <> 35
     or v_leaves <> 103 then
    raise exception using
      errcode = '23514',
      message = format(
        'GSR1B_GLOBAL_DISTRIBUTION_INVALID total=%s root=%s intermediate=%s leaf=%s',
        v_global,
        v_roots,
        v_intermediate,
        v_leaves
      );
  end if;

  if exists (
    select 1
    from public.value_objects child
    join public.value_objects parent
      on parent.id = child.parent_value_object_id
    where child.scope_code = 'global'
      and parent.scope_code = 'global'
      and parent.ontology_node_role_code = 'leaf'
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_GLOBAL_LEAF_HAS_CHILD';
  end if;

  if exists (
    select 1
    from public.value_objects child
    join public.value_objects parent
      on parent.id = child.parent_value_object_id
    where child.scope_code = 'global'
      and parent.scope_code = 'global'
      and parent.ontology_node_role_code <> 'root'
      and child.facet_code <> parent.facet_code
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_GLOBAL_NON_ROOT_FACET_MISMATCH';
  end if;

  if exists (
    select 1
    from public.value_objects child
    join public.value_objects root_object
      on root_object.id = child.root_value_object_id
    where child.scope_code = 'global'
      and (
        root_object.scope_code <> 'global'
        or root_object.ontology_node_role_code <> 'root'
        or root_object.facet_code <> 'DOMAIN'
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_GLOBAL_ROOT_POINTER_INVALID';
  end if;

  select count(*)
  into v_versions
  from public.value_object_definition_versions definition
  join public.value_objects value_object
    on value_object.id = definition.value_object_id
  where value_object.scope_code = 'global'
    and definition.version = 1;

  if v_versions <> 150 then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_DEFINITION_VERSION_COUNT_MUST_EQUAL_150';
  end if;

  select count(*)
  into v_assignments
  from public.value_object_parameter_assignments assignment
  join public.value_objects leaf
    on leaf.id = assignment.value_object_id
  where assignment.assignment_scope_code = 'system'
    and assignment.status = 'active'
    and leaf.scope_code = 'global';

  if v_assignments <> 52 then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_SYSTEM_ASSIGNMENT_COUNT_INVALID';
  end if;

  if exists (
    select 1
    from public.value_object_parameter_assignments assignment
    join public.value_objects value_object
      on value_object.id = assignment.value_object_id
    where assignment.assignment_scope_code = 'system'
      and (
        assignment.owner_user_id is not null
        or assignment.owner_actor_id is not null
        or assignment.created_by_actor_id is not null
        or value_object.scope_code <> 'global'
        or value_object.ontology_node_role_code <> 'leaf'
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_SYSTEM_ASSIGNMENT_SCOPE_GUARD_FAILED';
  end if;

  -- User-approved Q1-Q5 invariants.
  if exists (
    select 1
    from public.value_objects
    where scope_code = 'global'
      and canonical_key in (
        'process.movement.stroll',
        'process.nutrition.breakfast',
        'process.nutrition.lunch',
        'process.nutrition.dinner'
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_LOCKED_DECISION_FORBIDDEN_LEAF_PRESENT';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where scope_code = 'global'
      and canonical_key = 'process.movement.walking'
      and ontology_node_role_code = 'leaf'
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_WALKING_LEAF_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where scope_code = 'global'
      and canonical_key = 'process.nutrition.meal'
      and ontology_node_role_code = 'leaf'
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_MEAL_LEAF_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.value_objects
    where scope_code = 'global'
      and canonical_key = 'context.resources.available_time'
      and ontology_node_role_code = 'leaf'
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_AVAILABLE_TIME_LEAF_REQUIRED';
  end if;

  if exists (
    select 1
    from public.value_objects
    where scope_code = 'global'
      and (
        canonical_key = 'domain.time'
        or canonical_key = 'domain.location'
        or canonical_key like '%body_temperature%'
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'GSR1B_LOCKED_DECISION_FORBIDDEN_GLOBAL_OBJECT_PRESENT';
  end if;
end;
$acceptance$;

commit;

-- ---------------------------------------------------------------------------
-- 5. Return one compact result row.
-- Copy this JSON back to ChatGPT.
-- ---------------------------------------------------------------------------

select jsonb_pretty(
  jsonb_build_object(
    'check',
      'ARCTOR_GSR1B_GLOBAL_SYSTEM_REALITY_SEED_V1',
    'global_objects',
      (
        select count(*)
        from public.value_objects
        where scope_code = 'global'
          and canonical_key is not null
      ),
    'global_roots',
      (
        select count(*)
        from public.value_objects
        where scope_code = 'global'
          and ontology_node_role_code = 'root'
      ),
    'global_intermediates',
      (
        select count(*)
        from public.value_objects
        where scope_code = 'global'
          and ontology_node_role_code = 'intermediate'
      ),
    'global_leaves',
      (
        select count(*)
        from public.value_objects
        where scope_code = 'global'
          and ontology_node_role_code = 'leaf'
      ),
    'global_definition_versions_v1',
      (
        select count(*)
        from public.value_object_definition_versions definition
        join public.value_objects value_object
          on value_object.id = definition.value_object_id
        where value_object.scope_code = 'global'
          and definition.version = 1
      ),
    'system_parameter_assignments',
      (
        select count(*)
        from public.value_object_parameter_assignments assignment
        join public.value_objects value_object
          on value_object.id = assignment.value_object_id
        where assignment.assignment_scope_code = 'system'
          and assignment.status = 'active'
          and value_object.scope_code = 'global'
      ),
    'plank_id',
      (
        select id
        from public.value_objects
        where canonical_key = 'process.exercise.plank'
          and scope_code = 'global'
      ),
    'reverse_plank_id',
      (
        select id
        from public.value_objects
        where canonical_key = 'process.exercise.reverse_plank'
          and scope_code = 'global'
      ),
    'walking_id',
      (
        select id
        from public.value_objects
        where canonical_key = 'process.movement.walking'
          and scope_code = 'global'
      ),
    'meal_id',
      (
        select id
        from public.value_objects
        where canonical_key = 'process.nutrition.meal'
          and scope_code = 'global'
      ),
    'available_time_id',
      (
        select id
        from public.value_objects
        where canonical_key = 'context.resources.available_time'
          and scope_code = 'global'
      ),
    'duplicate_canonical_keys',
      (
        select count(*)
        from (
          select canonical_key
          from public.value_objects
          where canonical_key is not null
          group by canonical_key
          having count(*) > 1
        ) duplicates
      )
  )
) as gsr1b_result;
