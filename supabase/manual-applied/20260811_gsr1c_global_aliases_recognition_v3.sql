/*
ARCTor.app — GSR-1C
Global System Reality aliases + bounded leaf recognition v3
2026-08-11

RECOVERY V3

V1 failed because alias_normalized is a GENERATED column.
V2 fixed that, but the Supabase SQL Editor again lost the ordinary staging
relation between statements.

V3 therefore has NO staging table at all.
Every statement carries its own deterministic VALUES/CTE payload.
The script is recovery-safe for either:
- 0 expected aliases already present, or
- any partial subset of the same 89 deterministic aliases.

It refuses unrelated GLOBAL Value Object aliases.
It uses CREATE OR REPLACE for both RPCs.
*/

begin;

set local lock_timeout = '5s';
set local statement_timeout = '180s';

-- ---------------------------------------------------------------------------
-- 1. Hard live-state preflight
-- ---------------------------------------------------------------------------

do $preflight$
begin
  if to_regclass('public.value_objects') is null
     or to_regclass('public.value_object_definition_versions') is null
     or to_regclass('public.value_object_parameter_assignments') is null
     or to_regclass('public.value_object_parameter_definitions') is null
     or to_regclass('public.concept_aliases') is null then
    raise exception using
      errcode='42P01',
      message='GSR1C_V3_REQUIRED_TABLES_MISSING';
  end if;

  if (
    select count(*)
    from public.value_objects
    where scope_code='global'
      and canonical_key is not null
  ) <> 150 then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_GLOBAL_OBJECT_COUNT_MISMATCH';
  end if;

  if (
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
      message='GSR1C_V3_GLOBAL_ROLE_COUNTS_MISMATCH';
  end if;

  if (
    select count(*)
    from public.value_object_definition_versions d
    join public.value_objects v
      on v.id=d.value_object_id
    where v.scope_code='global'
      and d.version=1
  ) <> 150 then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_GLOBAL_DEFINITION_VERSION_COUNT_MISMATCH';
  end if;

  if (
    select count(*)
    from public.value_object_parameter_assignments a
    join public.value_objects v
      on v.id=a.value_object_id
    where a.assignment_scope_code='system'
      and a.status='active'
      and v.scope_code='global'
  ) <> 52 then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_SYSTEM_ASSIGNMENT_COUNT_MISMATCH';
  end if;

  if to_regprocedure(
       'public.recognize_value_object_text_v1(uuid,uuid,text,text)'
     ) is null then
    raise exception using
      errcode='42883',
      message='GSR1C_V3_ACTOR_RECOGNITION_BASELINE_MISSING';
  end if;

  if (
    select max(leaf_count)
    from (
      select
        root_value_object_id,
        facet_code,
        count(*) as leaf_count
      from public.value_objects
      where scope_code='global'
        and ontology_node_role_code='leaf'
        and status='active'
      group by root_value_object_id, facet_code
    ) grouped
  ) > 10 then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_DOMAIN_FACET_CANDIDATE_BOUND_EXCEEDED';
  end if;
end;
$preflight$;

-- Any GLOBAL VO alias already present must belong to the deterministic V3 set.
do $existing_alias_guard$
begin
  if exists (
    with expected(id,canonical_key,alias_text,alias_normalized,locale) as (
      values
    ('bc9c431b-6d97-56ca-84ea-fd5bc9e0aa9e'::uuid, 'process.exercise.plank', 'планку', 'планку', 'ru'),
    ('0778efa0-3017-5ea7-8d53-8b04c4c92c9c'::uuid, 'process.exercise.plank', 'plank', 'plank', 'en'),
    ('2bac812a-4f91-519b-a449-420aa2e27f2d'::uuid, 'process.exercise.reverse_plank', 'обратную планку', 'обратную планку', 'ru'),
    ('b00ee7b2-dda0-574e-9c94-02adb8a7e04f'::uuid, 'process.exercise.reverse_plank', 'reverse plank', 'reverse plank', 'en'),
    ('1621ebd5-e9f2-5a83-87b9-13ab0d32474f'::uuid, 'process.movement.walking', 'прогулка', 'прогулка', 'ru'),
    ('922b6663-074e-5b83-a6e7-857c8f6fa03d'::uuid, 'process.movement.walking', 'гулял', 'гулял', 'ru'),
    ('92ac8aa3-26fb-5e77-85e2-ba051584fd4b'::uuid, 'process.movement.walking', 'ходил пешком', 'ходил пешком', 'ru'),
    ('2c4a22f0-13ce-50d5-8558-f47a137e0ffc'::uuid, 'process.movement.walking', 'walk', 'walk', 'en'),
    ('d24671cf-3d35-543f-9eff-a92e940ed8df'::uuid, 'process.movement.walking', 'walking', 'walking', 'en'),
    ('5f1c83dd-a69e-588c-9f6f-7a69c8fc0c46'::uuid, 'process.movement.walking', 'stroll', 'stroll', 'en'),
    ('53210f1a-82d4-5860-bbf2-bcb7688dc17f'::uuid, 'state.physiology.body_weight', 'вес', 'вес', 'ru'),
    ('0f49ebe9-bc02-5ff7-8ce2-6123f1662a44'::uuid, 'state.physiology.body_weight', 'вес тела', 'вес тела', 'ru'),
    ('fae81ae1-4b55-5857-a121-712734d06ed0'::uuid, 'state.physiology.body_weight', 'weight', 'weight', 'en'),
    ('daae2c21-8a69-548b-bd44-2d55b47f17e7'::uuid, 'state.physiology.body_weight', 'body weight', 'body weight', 'en'),
    ('85e9ba97-38af-5571-bb89-ff8534b28f54'::uuid, 'state.physiology.heart_rate', 'пульс', 'пульс', 'ru'),
    ('59439ebc-1f6a-53d6-9cbe-5093229be447'::uuid, 'state.physiology.heart_rate', 'чсс', 'чсс', 'ru'),
    ('60e20aa8-4bff-582e-9f3b-01c799e4a1e4'::uuid, 'state.physiology.heart_rate', 'pulse', 'pulse', 'en'),
    ('065e1cfd-1986-5c86-94c7-13cfc55b34f7'::uuid, 'state.physiology.heart_rate', 'heart rate', 'heart rate', 'en'),
    ('9a146c2d-734a-53f3-a7e9-1acefd2dee7f'::uuid, 'state.physiology.blood_pressure', 'давление', 'давление', 'ru'),
    ('fe3a584b-f82e-505f-a9f6-cb75c5a96d22'::uuid, 'state.physiology.blood_pressure', 'ад', 'ад', 'ru'),
    ('2a087acf-6a5f-5709-a4bb-a124837c9eaa'::uuid, 'state.physiology.blood_pressure', 'blood pressure', 'blood pressure', 'en'),
    ('24fc2a1a-9aa9-5905-b345-d30417d0773f'::uuid, 'state.physiology.blood_pressure', 'bp', 'bp', 'en'),
    ('3ae248da-c197-56e0-940f-48119a61f6d3'::uuid, 'state.physiology.pain', 'болит', 'болит', 'ru'),
    ('bb9d6353-2c2b-5896-b85c-bd6b6c9badb7'::uuid, 'state.physiology.pain', 'болевые ощущения', 'болевые ощущения', 'ru'),
    ('eda81278-aaf3-5c87-9c74-4c43d7689c33'::uuid, 'state.physiology.pain', 'pain', 'pain', 'en'),
    ('07120441-ef4d-5846-b56f-7fb687a892c2'::uuid, 'entity.body.spine.lumbar', 'поясница', 'поясница', 'ru'),
    ('66d74221-440c-5c33-a253-4ff806d4119b'::uuid, 'entity.body.spine.lumbar', 'нижняя часть спины', 'нижняя часть спины', 'ru'),
    ('912361e4-b96d-54f1-854f-688184af0cc3'::uuid, 'entity.body.spine.lumbar', 'lower back', 'lower back', 'en'),
    ('b240c9b0-9068-52aa-aaad-e775678f90d9'::uuid, 'entity.body.spine.lumbar', 'lumbar', 'lumbar', 'en'),
    ('863fe3f5-0826-5dc2-b060-b74bf4bee81e'::uuid, 'state.emotional.mood', 'эмоциональный фон', 'эмоциональный фон', 'ru'),
    ('d7111ca9-7e69-507f-9b9a-c5da1fecf093'::uuid, 'state.emotional.mood', 'mood', 'mood', 'en'),
    ('e80ce825-ffe7-5c22-88aa-6acaa290c073'::uuid, 'state.emotional.stress', 'стресс', 'стресс', 'ru'),
    ('2fa708bf-bf76-5129-9b47-d3786e2e2592'::uuid, 'state.emotional.stress', 'stress', 'stress', 'en'),
    ('de3a8e54-16c6-5f99-9223-9b38c575a86b'::uuid, 'process.sleep.night_episode', 'night sleep', 'night sleep', 'en'),
    ('f781ca66-03ad-5935-bce4-956d050b78dd'::uuid, 'process.sleep.night_episode', 'sleep at night', 'sleep at night', 'en'),
    ('0d332bb8-8561-5636-aed3-80bfa2d7cf7c'::uuid, 'process.nutrition.meal', 'еда', 'еда', 'ru'),
    ('0955036f-4486-57eb-ac35-40973ec9ab86'::uuid, 'process.nutrition.meal', 'прием пищи', 'прием пищи', 'ru'),
    ('3a1a4975-f0ee-5e20-9845-07a9ae54ae73'::uuid, 'process.nutrition.meal', 'поел', 'поел', 'ru'),
    ('8b266df5-734a-55db-9107-50f136f2e0b3'::uuid, 'process.nutrition.meal', 'завтрак', 'завтрак', 'ru'),
    ('d2d946a9-443c-5929-b8a7-d27c438a809a'::uuid, 'process.nutrition.meal', 'обед', 'обед', 'ru'),
    ('b04685fe-2c11-51c0-aace-1595c22fc893'::uuid, 'process.nutrition.meal', 'ужин', 'ужин', 'ru'),
    ('f06582ca-11a8-500f-a226-6b2a82895cd6'::uuid, 'process.nutrition.meal', 'перекус', 'перекус', 'ru'),
    ('70316b1a-38a1-5d39-85f2-d2f0d4880efd'::uuid, 'process.nutrition.meal', 'meal', 'meal', 'en'),
    ('20988271-3189-5d80-bf3b-85fdf44eaf69'::uuid, 'process.nutrition.meal', 'breakfast', 'breakfast', 'en'),
    ('f688a865-1a80-5b81-bf79-d36bdb3a0a82'::uuid, 'process.nutrition.meal', 'lunch', 'lunch', 'en'),
    ('92e12491-33ea-5f65-9605-24a6ab28f939'::uuid, 'process.nutrition.meal', 'dinner', 'dinner', 'en'),
    ('845ef42a-a6c3-5be7-a5f3-082fb3064b8d'::uuid, 'process.nutrition.meal', 'snack', 'snack', 'en'),
    ('a54092f5-6dcc-5a48-91d7-3a6689d5d196'::uuid, 'process.nutrition.water_intake', 'вода', 'вода', 'ru'),
    ('cbb3e46e-8c5f-5891-bafc-264f4cf5bcfb'::uuid, 'process.nutrition.water_intake', 'пил воду', 'пил воду', 'ru'),
    ('26179376-5731-544d-ae0d-91d00931fb0f'::uuid, 'process.nutrition.water_intake', 'выпил воду', 'выпил воду', 'ru'),
    ('ed91abda-e0bd-590e-a2db-72dc488a12bd'::uuid, 'process.nutrition.water_intake', 'water intake', 'water intake', 'en'),
    ('224cb7eb-9a88-587e-b7ea-4ffe61eb0a80'::uuid, 'process.nutrition.water_intake', 'drank water', 'drank water', 'en'),
    ('384a747e-4ce3-51f6-8541-b7c042f548f9'::uuid, 'process.nutrition.caffeine_intake', 'кофе', 'кофе', 'ru'),
    ('8b5e666c-9833-5988-8317-f44cad1d974c'::uuid, 'process.nutrition.caffeine_intake', 'кофеин', 'кофеин', 'ru'),
    ('72f65684-71d6-5415-a346-8ee64d59de48'::uuid, 'process.nutrition.caffeine_intake', 'выпил кофе', 'выпил кофе', 'ru'),
    ('4b9fb94a-4c87-5544-96ea-733993580f22'::uuid, 'process.nutrition.caffeine_intake', 'coffee', 'coffee', 'en'),
    ('db70c7da-0d06-5962-85c2-6983ff7dcf13'::uuid, 'process.nutrition.caffeine_intake', 'caffeine', 'caffeine', 'en'),
    ('57a33630-dce1-5b18-9d89-06df6fa9bf24'::uuid, 'process.nutrition.caffeine_intake', 'drank coffee', 'drank coffee', 'en'),
    ('a4be7b84-a0d8-565d-a59d-c8b0d430deca'::uuid, 'process.social.conflict_interaction', 'конфликт', 'конфликт', 'ru'),
    ('dd9bb42e-52b6-55ed-bd46-1154c637fb71'::uuid, 'process.social.conflict_interaction', 'ссора', 'ссора', 'ru'),
    ('381e6ab7-95aa-57bd-8640-27105ec7158c'::uuid, 'process.social.conflict_interaction', 'поссорился', 'поссорился', 'ru'),
    ('ab7ea00d-2289-59cc-a7b7-abb54570858b'::uuid, 'process.social.conflict_interaction', 'conflict', 'conflict', 'en'),
    ('c9c6014d-095e-536a-8fc8-cb07b73663fc'::uuid, 'process.social.conflict_interaction', 'argument', 'argument', 'en'),
    ('c536a738-7095-5e7a-8bc5-c2ce733e2d05'::uuid, 'process.social.shared_time', 'совместное время', 'совместное время', 'ru'),
    ('cf856fd8-c68e-500b-bdc4-4812f289dd1b'::uuid, 'process.social.shared_time', 'время вместе', 'время вместе', 'ru'),
    ('d2f84d60-56a0-5915-95b4-0cda8459625d'::uuid, 'process.social.shared_time', 'shared time', 'shared time', 'en'),
    ('59e32119-6df3-5fda-9c2e-c13cc36ffe1d'::uuid, 'process.social.shared_time', 'time together', 'time together', 'en'),
    ('8d40f15b-a268-5056-8888-f1d8f94e78a6'::uuid, 'context.weather.air_temperature', 'температура воздуха', 'температура воздуха', 'ru'),
    ('94fad0ed-1943-5bd4-bac7-0f53d3000433'::uuid, 'context.weather.air_temperature', 'температура на улице', 'температура на улице', 'ru'),
    ('1ca11b33-a6c2-5a4d-b666-79f606f12f0c'::uuid, 'context.weather.air_temperature', 'air temperature', 'air temperature', 'en'),
    ('f8811fe9-92f0-5740-8210-7f2685c19ff2'::uuid, 'context.weather.air_temperature', 'outdoor temperature', 'outdoor temperature', 'en'),
    ('d8bb09d6-549e-5d0a-a166-ac64b48af339'::uuid, 'context.weather.cloudiness', 'облачно', 'облачно', 'ru'),
    ('6c2cc79e-9cf1-5484-9189-9d5dd4af684d'::uuid, 'context.weather.cloudiness', 'cloudy', 'cloudy', 'en'),
    ('98c434bc-aa86-5c2d-9e35-fd429b2da4e0'::uuid, 'context.weather.cloudiness', 'cloudiness', 'cloudiness', 'en'),
    ('e1f84144-9563-55d6-b1bb-359a584762f6'::uuid, 'context.environment.indoor_outdoor', 'на улице', 'на улице', 'ru'),
    ('ed8153ab-13d2-5959-8f7d-30cd3b1082cd'::uuid, 'context.environment.indoor_outdoor', 'в помещении', 'в помещении', 'ru'),
    ('bf55033b-8f6d-5b98-8a4f-0e88320d3e23'::uuid, 'context.environment.indoor_outdoor', 'outdoors', 'outdoors', 'en'),
    ('d6807b68-2dee-565a-af14-aea0f3875ef2'::uuid, 'context.environment.indoor_outdoor', 'indoors', 'indoors', 'en'),
    ('397fd78f-1f0a-5094-9cbf-76b7204f0872'::uuid, 'process.learning.language_practice', 'занимался немецким', 'занимался немецким', 'ru'),
    ('9116038c-4f93-5fcb-ba8e-616652809ff0'::uuid, 'process.learning.language_practice', 'language practice', 'language practice', 'en'),
    ('92533901-afa8-5cfc-88b8-0a90b83bf7b3'::uuid, 'process.learning.language_practice', 'german practice', 'german practice', 'en'),
    ('0c887b7a-92dd-5049-8e78-6397cbe76dee'::uuid, 'process.creative.instrument_playing', 'гитара', 'гитара', 'ru'),
    ('b81cf1f5-eb8b-5e40-81ab-0996e9421251'::uuid, 'process.creative.instrument_playing', 'играл на гитаре', 'играл на гитаре', 'ru'),
    ('7b69bf1d-70c5-5200-ac3f-2140c911afc1'::uuid, 'process.creative.instrument_playing', 'guitar', 'guitar', 'en'),
    ('93dc09d4-5284-5051-b871-49a52a05eea5'::uuid, 'process.creative.instrument_playing', 'played guitar', 'played guitar', 'en'),
    ('07f37b3c-5f8c-50ae-8275-7cb321b3098b'::uuid, 'context.resources.available_time', 'есть время', 'есть время', 'ru'),
    ('60c5fa05-bca6-551e-8caf-f0a8e7f18719'::uuid, 'context.resources.available_time', 'available time', 'available time', 'en'),
    ('a66af01b-b220-5166-a38c-6772dd2b7b6c'::uuid, 'process.work.session', 'работал за компьютером', 'работал за компьютером', 'ru'),
    ('c2663799-17ac-5451-81e9-e2fec36e049e'::uuid, 'process.work.session', 'computer work', 'computer work', 'en')
    )
    select 1
    from public.concept_aliases alias_row
    join public.value_objects value_object
      on value_object.id=alias_row.concept_id
     and value_object.scope_code='global'
    left join expected
      on expected.id=alias_row.id
    where alias_row.concept_type='value_object'
      and expected.id is null
  ) then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_UNEXPECTED_GLOBAL_ALIAS_ALREADY_PRESENT';
  end if;

  if exists (
    with expected(id,canonical_key,alias_text,alias_normalized,locale) as (
      values
    ('bc9c431b-6d97-56ca-84ea-fd5bc9e0aa9e'::uuid, 'process.exercise.plank', 'планку', 'планку', 'ru'),
    ('0778efa0-3017-5ea7-8d53-8b04c4c92c9c'::uuid, 'process.exercise.plank', 'plank', 'plank', 'en'),
    ('2bac812a-4f91-519b-a449-420aa2e27f2d'::uuid, 'process.exercise.reverse_plank', 'обратную планку', 'обратную планку', 'ru'),
    ('b00ee7b2-dda0-574e-9c94-02adb8a7e04f'::uuid, 'process.exercise.reverse_plank', 'reverse plank', 'reverse plank', 'en'),
    ('1621ebd5-e9f2-5a83-87b9-13ab0d32474f'::uuid, 'process.movement.walking', 'прогулка', 'прогулка', 'ru'),
    ('922b6663-074e-5b83-a6e7-857c8f6fa03d'::uuid, 'process.movement.walking', 'гулял', 'гулял', 'ru'),
    ('92ac8aa3-26fb-5e77-85e2-ba051584fd4b'::uuid, 'process.movement.walking', 'ходил пешком', 'ходил пешком', 'ru'),
    ('2c4a22f0-13ce-50d5-8558-f47a137e0ffc'::uuid, 'process.movement.walking', 'walk', 'walk', 'en'),
    ('d24671cf-3d35-543f-9eff-a92e940ed8df'::uuid, 'process.movement.walking', 'walking', 'walking', 'en'),
    ('5f1c83dd-a69e-588c-9f6f-7a69c8fc0c46'::uuid, 'process.movement.walking', 'stroll', 'stroll', 'en'),
    ('53210f1a-82d4-5860-bbf2-bcb7688dc17f'::uuid, 'state.physiology.body_weight', 'вес', 'вес', 'ru'),
    ('0f49ebe9-bc02-5ff7-8ce2-6123f1662a44'::uuid, 'state.physiology.body_weight', 'вес тела', 'вес тела', 'ru'),
    ('fae81ae1-4b55-5857-a121-712734d06ed0'::uuid, 'state.physiology.body_weight', 'weight', 'weight', 'en'),
    ('daae2c21-8a69-548b-bd44-2d55b47f17e7'::uuid, 'state.physiology.body_weight', 'body weight', 'body weight', 'en'),
    ('85e9ba97-38af-5571-bb89-ff8534b28f54'::uuid, 'state.physiology.heart_rate', 'пульс', 'пульс', 'ru'),
    ('59439ebc-1f6a-53d6-9cbe-5093229be447'::uuid, 'state.physiology.heart_rate', 'чсс', 'чсс', 'ru'),
    ('60e20aa8-4bff-582e-9f3b-01c799e4a1e4'::uuid, 'state.physiology.heart_rate', 'pulse', 'pulse', 'en'),
    ('065e1cfd-1986-5c86-94c7-13cfc55b34f7'::uuid, 'state.physiology.heart_rate', 'heart rate', 'heart rate', 'en'),
    ('9a146c2d-734a-53f3-a7e9-1acefd2dee7f'::uuid, 'state.physiology.blood_pressure', 'давление', 'давление', 'ru'),
    ('fe3a584b-f82e-505f-a9f6-cb75c5a96d22'::uuid, 'state.physiology.blood_pressure', 'ад', 'ад', 'ru'),
    ('2a087acf-6a5f-5709-a4bb-a124837c9eaa'::uuid, 'state.physiology.blood_pressure', 'blood pressure', 'blood pressure', 'en'),
    ('24fc2a1a-9aa9-5905-b345-d30417d0773f'::uuid, 'state.physiology.blood_pressure', 'bp', 'bp', 'en'),
    ('3ae248da-c197-56e0-940f-48119a61f6d3'::uuid, 'state.physiology.pain', 'болит', 'болит', 'ru'),
    ('bb9d6353-2c2b-5896-b85c-bd6b6c9badb7'::uuid, 'state.physiology.pain', 'болевые ощущения', 'болевые ощущения', 'ru'),
    ('eda81278-aaf3-5c87-9c74-4c43d7689c33'::uuid, 'state.physiology.pain', 'pain', 'pain', 'en'),
    ('07120441-ef4d-5846-b56f-7fb687a892c2'::uuid, 'entity.body.spine.lumbar', 'поясница', 'поясница', 'ru'),
    ('66d74221-440c-5c33-a253-4ff806d4119b'::uuid, 'entity.body.spine.lumbar', 'нижняя часть спины', 'нижняя часть спины', 'ru'),
    ('912361e4-b96d-54f1-854f-688184af0cc3'::uuid, 'entity.body.spine.lumbar', 'lower back', 'lower back', 'en'),
    ('b240c9b0-9068-52aa-aaad-e775678f90d9'::uuid, 'entity.body.spine.lumbar', 'lumbar', 'lumbar', 'en'),
    ('863fe3f5-0826-5dc2-b060-b74bf4bee81e'::uuid, 'state.emotional.mood', 'эмоциональный фон', 'эмоциональный фон', 'ru'),
    ('d7111ca9-7e69-507f-9b9a-c5da1fecf093'::uuid, 'state.emotional.mood', 'mood', 'mood', 'en'),
    ('e80ce825-ffe7-5c22-88aa-6acaa290c073'::uuid, 'state.emotional.stress', 'стресс', 'стресс', 'ru'),
    ('2fa708bf-bf76-5129-9b47-d3786e2e2592'::uuid, 'state.emotional.stress', 'stress', 'stress', 'en'),
    ('de3a8e54-16c6-5f99-9223-9b38c575a86b'::uuid, 'process.sleep.night_episode', 'night sleep', 'night sleep', 'en'),
    ('f781ca66-03ad-5935-bce4-956d050b78dd'::uuid, 'process.sleep.night_episode', 'sleep at night', 'sleep at night', 'en'),
    ('0d332bb8-8561-5636-aed3-80bfa2d7cf7c'::uuid, 'process.nutrition.meal', 'еда', 'еда', 'ru'),
    ('0955036f-4486-57eb-ac35-40973ec9ab86'::uuid, 'process.nutrition.meal', 'прием пищи', 'прием пищи', 'ru'),
    ('3a1a4975-f0ee-5e20-9845-07a9ae54ae73'::uuid, 'process.nutrition.meal', 'поел', 'поел', 'ru'),
    ('8b266df5-734a-55db-9107-50f136f2e0b3'::uuid, 'process.nutrition.meal', 'завтрак', 'завтрак', 'ru'),
    ('d2d946a9-443c-5929-b8a7-d27c438a809a'::uuid, 'process.nutrition.meal', 'обед', 'обед', 'ru'),
    ('b04685fe-2c11-51c0-aace-1595c22fc893'::uuid, 'process.nutrition.meal', 'ужин', 'ужин', 'ru'),
    ('f06582ca-11a8-500f-a226-6b2a82895cd6'::uuid, 'process.nutrition.meal', 'перекус', 'перекус', 'ru'),
    ('70316b1a-38a1-5d39-85f2-d2f0d4880efd'::uuid, 'process.nutrition.meal', 'meal', 'meal', 'en'),
    ('20988271-3189-5d80-bf3b-85fdf44eaf69'::uuid, 'process.nutrition.meal', 'breakfast', 'breakfast', 'en'),
    ('f688a865-1a80-5b81-bf79-d36bdb3a0a82'::uuid, 'process.nutrition.meal', 'lunch', 'lunch', 'en'),
    ('92e12491-33ea-5f65-9605-24a6ab28f939'::uuid, 'process.nutrition.meal', 'dinner', 'dinner', 'en'),
    ('845ef42a-a6c3-5be7-a5f3-082fb3064b8d'::uuid, 'process.nutrition.meal', 'snack', 'snack', 'en'),
    ('a54092f5-6dcc-5a48-91d7-3a6689d5d196'::uuid, 'process.nutrition.water_intake', 'вода', 'вода', 'ru'),
    ('cbb3e46e-8c5f-5891-bafc-264f4cf5bcfb'::uuid, 'process.nutrition.water_intake', 'пил воду', 'пил воду', 'ru'),
    ('26179376-5731-544d-ae0d-91d00931fb0f'::uuid, 'process.nutrition.water_intake', 'выпил воду', 'выпил воду', 'ru'),
    ('ed91abda-e0bd-590e-a2db-72dc488a12bd'::uuid, 'process.nutrition.water_intake', 'water intake', 'water intake', 'en'),
    ('224cb7eb-9a88-587e-b7ea-4ffe61eb0a80'::uuid, 'process.nutrition.water_intake', 'drank water', 'drank water', 'en'),
    ('384a747e-4ce3-51f6-8541-b7c042f548f9'::uuid, 'process.nutrition.caffeine_intake', 'кофе', 'кофе', 'ru'),
    ('8b5e666c-9833-5988-8317-f44cad1d974c'::uuid, 'process.nutrition.caffeine_intake', 'кофеин', 'кофеин', 'ru'),
    ('72f65684-71d6-5415-a346-8ee64d59de48'::uuid, 'process.nutrition.caffeine_intake', 'выпил кофе', 'выпил кофе', 'ru'),
    ('4b9fb94a-4c87-5544-96ea-733993580f22'::uuid, 'process.nutrition.caffeine_intake', 'coffee', 'coffee', 'en'),
    ('db70c7da-0d06-5962-85c2-6983ff7dcf13'::uuid, 'process.nutrition.caffeine_intake', 'caffeine', 'caffeine', 'en'),
    ('57a33630-dce1-5b18-9d89-06df6fa9bf24'::uuid, 'process.nutrition.caffeine_intake', 'drank coffee', 'drank coffee', 'en'),
    ('a4be7b84-a0d8-565d-a59d-c8b0d430deca'::uuid, 'process.social.conflict_interaction', 'конфликт', 'конфликт', 'ru'),
    ('dd9bb42e-52b6-55ed-bd46-1154c637fb71'::uuid, 'process.social.conflict_interaction', 'ссора', 'ссора', 'ru'),
    ('381e6ab7-95aa-57bd-8640-27105ec7158c'::uuid, 'process.social.conflict_interaction', 'поссорился', 'поссорился', 'ru'),
    ('ab7ea00d-2289-59cc-a7b7-abb54570858b'::uuid, 'process.social.conflict_interaction', 'conflict', 'conflict', 'en'),
    ('c9c6014d-095e-536a-8fc8-cb07b73663fc'::uuid, 'process.social.conflict_interaction', 'argument', 'argument', 'en'),
    ('c536a738-7095-5e7a-8bc5-c2ce733e2d05'::uuid, 'process.social.shared_time', 'совместное время', 'совместное время', 'ru'),
    ('cf856fd8-c68e-500b-bdc4-4812f289dd1b'::uuid, 'process.social.shared_time', 'время вместе', 'время вместе', 'ru'),
    ('d2f84d60-56a0-5915-95b4-0cda8459625d'::uuid, 'process.social.shared_time', 'shared time', 'shared time', 'en'),
    ('59e32119-6df3-5fda-9c2e-c13cc36ffe1d'::uuid, 'process.social.shared_time', 'time together', 'time together', 'en'),
    ('8d40f15b-a268-5056-8888-f1d8f94e78a6'::uuid, 'context.weather.air_temperature', 'температура воздуха', 'температура воздуха', 'ru'),
    ('94fad0ed-1943-5bd4-bac7-0f53d3000433'::uuid, 'context.weather.air_temperature', 'температура на улице', 'температура на улице', 'ru'),
    ('1ca11b33-a6c2-5a4d-b666-79f606f12f0c'::uuid, 'context.weather.air_temperature', 'air temperature', 'air temperature', 'en'),
    ('f8811fe9-92f0-5740-8210-7f2685c19ff2'::uuid, 'context.weather.air_temperature', 'outdoor temperature', 'outdoor temperature', 'en'),
    ('d8bb09d6-549e-5d0a-a166-ac64b48af339'::uuid, 'context.weather.cloudiness', 'облачно', 'облачно', 'ru'),
    ('6c2cc79e-9cf1-5484-9189-9d5dd4af684d'::uuid, 'context.weather.cloudiness', 'cloudy', 'cloudy', 'en'),
    ('98c434bc-aa86-5c2d-9e35-fd429b2da4e0'::uuid, 'context.weather.cloudiness', 'cloudiness', 'cloudiness', 'en'),
    ('e1f84144-9563-55d6-b1bb-359a584762f6'::uuid, 'context.environment.indoor_outdoor', 'на улице', 'на улице', 'ru'),
    ('ed8153ab-13d2-5959-8f7d-30cd3b1082cd'::uuid, 'context.environment.indoor_outdoor', 'в помещении', 'в помещении', 'ru'),
    ('bf55033b-8f6d-5b98-8a4f-0e88320d3e23'::uuid, 'context.environment.indoor_outdoor', 'outdoors', 'outdoors', 'en'),
    ('d6807b68-2dee-565a-af14-aea0f3875ef2'::uuid, 'context.environment.indoor_outdoor', 'indoors', 'indoors', 'en'),
    ('397fd78f-1f0a-5094-9cbf-76b7204f0872'::uuid, 'process.learning.language_practice', 'занимался немецким', 'занимался немецким', 'ru'),
    ('9116038c-4f93-5fcb-ba8e-616652809ff0'::uuid, 'process.learning.language_practice', 'language practice', 'language practice', 'en'),
    ('92533901-afa8-5cfc-88b8-0a90b83bf7b3'::uuid, 'process.learning.language_practice', 'german practice', 'german practice', 'en'),
    ('0c887b7a-92dd-5049-8e78-6397cbe76dee'::uuid, 'process.creative.instrument_playing', 'гитара', 'гитара', 'ru'),
    ('b81cf1f5-eb8b-5e40-81ab-0996e9421251'::uuid, 'process.creative.instrument_playing', 'играл на гитаре', 'играл на гитаре', 'ru'),
    ('7b69bf1d-70c5-5200-ac3f-2140c911afc1'::uuid, 'process.creative.instrument_playing', 'guitar', 'guitar', 'en'),
    ('93dc09d4-5284-5051-b871-49a52a05eea5'::uuid, 'process.creative.instrument_playing', 'played guitar', 'played guitar', 'en'),
    ('07f37b3c-5f8c-50ae-8275-7cb321b3098b'::uuid, 'context.resources.available_time', 'есть время', 'есть время', 'ru'),
    ('60c5fa05-bca6-551e-8caf-f0a8e7f18719'::uuid, 'context.resources.available_time', 'available time', 'available time', 'en'),
    ('a66af01b-b220-5166-a38c-6772dd2b7b6c'::uuid, 'process.work.session', 'работал за компьютером', 'работал за компьютером', 'ru'),
    ('c2663799-17ac-5451-81e9-e2fec36e049e'::uuid, 'process.work.session', 'computer work', 'computer work', 'en')
    )
    select 1
    from public.concept_aliases alias_row
    join expected
      on expected.id=alias_row.id
    join public.value_objects value_object
      on value_object.id=alias_row.concept_id
    where alias_row.concept_type <> 'value_object'
       or value_object.scope_code <> 'global'
       or value_object.canonical_key is distinct from expected.canonical_key
       or alias_row.alias_text is distinct from expected.alias_text
       or lower(coalesce(alias_row.locale,'')) is distinct from lower(expected.locale)
  ) then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_EXISTING_EXPECTED_ALIAS_SHAPE_MISMATCH';
  end if;
end;
$existing_alias_guard$;

-- ---------------------------------------------------------------------------
-- 2. Insert / repair the 89 deterministic pilot aliases
-- ---------------------------------------------------------------------------

with expected(id,canonical_key,alias_text,alias_normalized,locale) as (
  values
    ('bc9c431b-6d97-56ca-84ea-fd5bc9e0aa9e'::uuid, 'process.exercise.plank', 'планку', 'планку', 'ru'),
    ('0778efa0-3017-5ea7-8d53-8b04c4c92c9c'::uuid, 'process.exercise.plank', 'plank', 'plank', 'en'),
    ('2bac812a-4f91-519b-a449-420aa2e27f2d'::uuid, 'process.exercise.reverse_plank', 'обратную планку', 'обратную планку', 'ru'),
    ('b00ee7b2-dda0-574e-9c94-02adb8a7e04f'::uuid, 'process.exercise.reverse_plank', 'reverse plank', 'reverse plank', 'en'),
    ('1621ebd5-e9f2-5a83-87b9-13ab0d32474f'::uuid, 'process.movement.walking', 'прогулка', 'прогулка', 'ru'),
    ('922b6663-074e-5b83-a6e7-857c8f6fa03d'::uuid, 'process.movement.walking', 'гулял', 'гулял', 'ru'),
    ('92ac8aa3-26fb-5e77-85e2-ba051584fd4b'::uuid, 'process.movement.walking', 'ходил пешком', 'ходил пешком', 'ru'),
    ('2c4a22f0-13ce-50d5-8558-f47a137e0ffc'::uuid, 'process.movement.walking', 'walk', 'walk', 'en'),
    ('d24671cf-3d35-543f-9eff-a92e940ed8df'::uuid, 'process.movement.walking', 'walking', 'walking', 'en'),
    ('5f1c83dd-a69e-588c-9f6f-7a69c8fc0c46'::uuid, 'process.movement.walking', 'stroll', 'stroll', 'en'),
    ('53210f1a-82d4-5860-bbf2-bcb7688dc17f'::uuid, 'state.physiology.body_weight', 'вес', 'вес', 'ru'),
    ('0f49ebe9-bc02-5ff7-8ce2-6123f1662a44'::uuid, 'state.physiology.body_weight', 'вес тела', 'вес тела', 'ru'),
    ('fae81ae1-4b55-5857-a121-712734d06ed0'::uuid, 'state.physiology.body_weight', 'weight', 'weight', 'en'),
    ('daae2c21-8a69-548b-bd44-2d55b47f17e7'::uuid, 'state.physiology.body_weight', 'body weight', 'body weight', 'en'),
    ('85e9ba97-38af-5571-bb89-ff8534b28f54'::uuid, 'state.physiology.heart_rate', 'пульс', 'пульс', 'ru'),
    ('59439ebc-1f6a-53d6-9cbe-5093229be447'::uuid, 'state.physiology.heart_rate', 'чсс', 'чсс', 'ru'),
    ('60e20aa8-4bff-582e-9f3b-01c799e4a1e4'::uuid, 'state.physiology.heart_rate', 'pulse', 'pulse', 'en'),
    ('065e1cfd-1986-5c86-94c7-13cfc55b34f7'::uuid, 'state.physiology.heart_rate', 'heart rate', 'heart rate', 'en'),
    ('9a146c2d-734a-53f3-a7e9-1acefd2dee7f'::uuid, 'state.physiology.blood_pressure', 'давление', 'давление', 'ru'),
    ('fe3a584b-f82e-505f-a9f6-cb75c5a96d22'::uuid, 'state.physiology.blood_pressure', 'ад', 'ад', 'ru'),
    ('2a087acf-6a5f-5709-a4bb-a124837c9eaa'::uuid, 'state.physiology.blood_pressure', 'blood pressure', 'blood pressure', 'en'),
    ('24fc2a1a-9aa9-5905-b345-d30417d0773f'::uuid, 'state.physiology.blood_pressure', 'bp', 'bp', 'en'),
    ('3ae248da-c197-56e0-940f-48119a61f6d3'::uuid, 'state.physiology.pain', 'болит', 'болит', 'ru'),
    ('bb9d6353-2c2b-5896-b85c-bd6b6c9badb7'::uuid, 'state.physiology.pain', 'болевые ощущения', 'болевые ощущения', 'ru'),
    ('eda81278-aaf3-5c87-9c74-4c43d7689c33'::uuid, 'state.physiology.pain', 'pain', 'pain', 'en'),
    ('07120441-ef4d-5846-b56f-7fb687a892c2'::uuid, 'entity.body.spine.lumbar', 'поясница', 'поясница', 'ru'),
    ('66d74221-440c-5c33-a253-4ff806d4119b'::uuid, 'entity.body.spine.lumbar', 'нижняя часть спины', 'нижняя часть спины', 'ru'),
    ('912361e4-b96d-54f1-854f-688184af0cc3'::uuid, 'entity.body.spine.lumbar', 'lower back', 'lower back', 'en'),
    ('b240c9b0-9068-52aa-aaad-e775678f90d9'::uuid, 'entity.body.spine.lumbar', 'lumbar', 'lumbar', 'en'),
    ('863fe3f5-0826-5dc2-b060-b74bf4bee81e'::uuid, 'state.emotional.mood', 'эмоциональный фон', 'эмоциональный фон', 'ru'),
    ('d7111ca9-7e69-507f-9b9a-c5da1fecf093'::uuid, 'state.emotional.mood', 'mood', 'mood', 'en'),
    ('e80ce825-ffe7-5c22-88aa-6acaa290c073'::uuid, 'state.emotional.stress', 'стресс', 'стресс', 'ru'),
    ('2fa708bf-bf76-5129-9b47-d3786e2e2592'::uuid, 'state.emotional.stress', 'stress', 'stress', 'en'),
    ('de3a8e54-16c6-5f99-9223-9b38c575a86b'::uuid, 'process.sleep.night_episode', 'night sleep', 'night sleep', 'en'),
    ('f781ca66-03ad-5935-bce4-956d050b78dd'::uuid, 'process.sleep.night_episode', 'sleep at night', 'sleep at night', 'en'),
    ('0d332bb8-8561-5636-aed3-80bfa2d7cf7c'::uuid, 'process.nutrition.meal', 'еда', 'еда', 'ru'),
    ('0955036f-4486-57eb-ac35-40973ec9ab86'::uuid, 'process.nutrition.meal', 'прием пищи', 'прием пищи', 'ru'),
    ('3a1a4975-f0ee-5e20-9845-07a9ae54ae73'::uuid, 'process.nutrition.meal', 'поел', 'поел', 'ru'),
    ('8b266df5-734a-55db-9107-50f136f2e0b3'::uuid, 'process.nutrition.meal', 'завтрак', 'завтрак', 'ru'),
    ('d2d946a9-443c-5929-b8a7-d27c438a809a'::uuid, 'process.nutrition.meal', 'обед', 'обед', 'ru'),
    ('b04685fe-2c11-51c0-aace-1595c22fc893'::uuid, 'process.nutrition.meal', 'ужин', 'ужин', 'ru'),
    ('f06582ca-11a8-500f-a226-6b2a82895cd6'::uuid, 'process.nutrition.meal', 'перекус', 'перекус', 'ru'),
    ('70316b1a-38a1-5d39-85f2-d2f0d4880efd'::uuid, 'process.nutrition.meal', 'meal', 'meal', 'en'),
    ('20988271-3189-5d80-bf3b-85fdf44eaf69'::uuid, 'process.nutrition.meal', 'breakfast', 'breakfast', 'en'),
    ('f688a865-1a80-5b81-bf79-d36bdb3a0a82'::uuid, 'process.nutrition.meal', 'lunch', 'lunch', 'en'),
    ('92e12491-33ea-5f65-9605-24a6ab28f939'::uuid, 'process.nutrition.meal', 'dinner', 'dinner', 'en'),
    ('845ef42a-a6c3-5be7-a5f3-082fb3064b8d'::uuid, 'process.nutrition.meal', 'snack', 'snack', 'en'),
    ('a54092f5-6dcc-5a48-91d7-3a6689d5d196'::uuid, 'process.nutrition.water_intake', 'вода', 'вода', 'ru'),
    ('cbb3e46e-8c5f-5891-bafc-264f4cf5bcfb'::uuid, 'process.nutrition.water_intake', 'пил воду', 'пил воду', 'ru'),
    ('26179376-5731-544d-ae0d-91d00931fb0f'::uuid, 'process.nutrition.water_intake', 'выпил воду', 'выпил воду', 'ru'),
    ('ed91abda-e0bd-590e-a2db-72dc488a12bd'::uuid, 'process.nutrition.water_intake', 'water intake', 'water intake', 'en'),
    ('224cb7eb-9a88-587e-b7ea-4ffe61eb0a80'::uuid, 'process.nutrition.water_intake', 'drank water', 'drank water', 'en'),
    ('384a747e-4ce3-51f6-8541-b7c042f548f9'::uuid, 'process.nutrition.caffeine_intake', 'кофе', 'кофе', 'ru'),
    ('8b5e666c-9833-5988-8317-f44cad1d974c'::uuid, 'process.nutrition.caffeine_intake', 'кофеин', 'кофеин', 'ru'),
    ('72f65684-71d6-5415-a346-8ee64d59de48'::uuid, 'process.nutrition.caffeine_intake', 'выпил кофе', 'выпил кофе', 'ru'),
    ('4b9fb94a-4c87-5544-96ea-733993580f22'::uuid, 'process.nutrition.caffeine_intake', 'coffee', 'coffee', 'en'),
    ('db70c7da-0d06-5962-85c2-6983ff7dcf13'::uuid, 'process.nutrition.caffeine_intake', 'caffeine', 'caffeine', 'en'),
    ('57a33630-dce1-5b18-9d89-06df6fa9bf24'::uuid, 'process.nutrition.caffeine_intake', 'drank coffee', 'drank coffee', 'en'),
    ('a4be7b84-a0d8-565d-a59d-c8b0d430deca'::uuid, 'process.social.conflict_interaction', 'конфликт', 'конфликт', 'ru'),
    ('dd9bb42e-52b6-55ed-bd46-1154c637fb71'::uuid, 'process.social.conflict_interaction', 'ссора', 'ссора', 'ru'),
    ('381e6ab7-95aa-57bd-8640-27105ec7158c'::uuid, 'process.social.conflict_interaction', 'поссорился', 'поссорился', 'ru'),
    ('ab7ea00d-2289-59cc-a7b7-abb54570858b'::uuid, 'process.social.conflict_interaction', 'conflict', 'conflict', 'en'),
    ('c9c6014d-095e-536a-8fc8-cb07b73663fc'::uuid, 'process.social.conflict_interaction', 'argument', 'argument', 'en'),
    ('c536a738-7095-5e7a-8bc5-c2ce733e2d05'::uuid, 'process.social.shared_time', 'совместное время', 'совместное время', 'ru'),
    ('cf856fd8-c68e-500b-bdc4-4812f289dd1b'::uuid, 'process.social.shared_time', 'время вместе', 'время вместе', 'ru'),
    ('d2f84d60-56a0-5915-95b4-0cda8459625d'::uuid, 'process.social.shared_time', 'shared time', 'shared time', 'en'),
    ('59e32119-6df3-5fda-9c2e-c13cc36ffe1d'::uuid, 'process.social.shared_time', 'time together', 'time together', 'en'),
    ('8d40f15b-a268-5056-8888-f1d8f94e78a6'::uuid, 'context.weather.air_temperature', 'температура воздуха', 'температура воздуха', 'ru'),
    ('94fad0ed-1943-5bd4-bac7-0f53d3000433'::uuid, 'context.weather.air_temperature', 'температура на улице', 'температура на улице', 'ru'),
    ('1ca11b33-a6c2-5a4d-b666-79f606f12f0c'::uuid, 'context.weather.air_temperature', 'air temperature', 'air temperature', 'en'),
    ('f8811fe9-92f0-5740-8210-7f2685c19ff2'::uuid, 'context.weather.air_temperature', 'outdoor temperature', 'outdoor temperature', 'en'),
    ('d8bb09d6-549e-5d0a-a166-ac64b48af339'::uuid, 'context.weather.cloudiness', 'облачно', 'облачно', 'ru'),
    ('6c2cc79e-9cf1-5484-9189-9d5dd4af684d'::uuid, 'context.weather.cloudiness', 'cloudy', 'cloudy', 'en'),
    ('98c434bc-aa86-5c2d-9e35-fd429b2da4e0'::uuid, 'context.weather.cloudiness', 'cloudiness', 'cloudiness', 'en'),
    ('e1f84144-9563-55d6-b1bb-359a584762f6'::uuid, 'context.environment.indoor_outdoor', 'на улице', 'на улице', 'ru'),
    ('ed8153ab-13d2-5959-8f7d-30cd3b1082cd'::uuid, 'context.environment.indoor_outdoor', 'в помещении', 'в помещении', 'ru'),
    ('bf55033b-8f6d-5b98-8a4f-0e88320d3e23'::uuid, 'context.environment.indoor_outdoor', 'outdoors', 'outdoors', 'en'),
    ('d6807b68-2dee-565a-af14-aea0f3875ef2'::uuid, 'context.environment.indoor_outdoor', 'indoors', 'indoors', 'en'),
    ('397fd78f-1f0a-5094-9cbf-76b7204f0872'::uuid, 'process.learning.language_practice', 'занимался немецким', 'занимался немецким', 'ru'),
    ('9116038c-4f93-5fcb-ba8e-616652809ff0'::uuid, 'process.learning.language_practice', 'language practice', 'language practice', 'en'),
    ('92533901-afa8-5cfc-88b8-0a90b83bf7b3'::uuid, 'process.learning.language_practice', 'german practice', 'german practice', 'en'),
    ('0c887b7a-92dd-5049-8e78-6397cbe76dee'::uuid, 'process.creative.instrument_playing', 'гитара', 'гитара', 'ru'),
    ('b81cf1f5-eb8b-5e40-81ab-0996e9421251'::uuid, 'process.creative.instrument_playing', 'играл на гитаре', 'играл на гитаре', 'ru'),
    ('7b69bf1d-70c5-5200-ac3f-2140c911afc1'::uuid, 'process.creative.instrument_playing', 'guitar', 'guitar', 'en'),
    ('93dc09d4-5284-5051-b871-49a52a05eea5'::uuid, 'process.creative.instrument_playing', 'played guitar', 'played guitar', 'en'),
    ('07f37b3c-5f8c-50ae-8275-7cb321b3098b'::uuid, 'context.resources.available_time', 'есть время', 'есть время', 'ru'),
    ('60c5fa05-bca6-551e-8caf-f0a8e7f18719'::uuid, 'context.resources.available_time', 'available time', 'available time', 'en'),
    ('a66af01b-b220-5166-a38c-6772dd2b7b6c'::uuid, 'process.work.session', 'работал за компьютером', 'работал за компьютером', 'ru'),
    ('c2663799-17ac-5451-81e9-e2fec36e049e'::uuid, 'process.work.session', 'computer work', 'computer work', 'en')
)
insert into public.concept_aliases (
  id,
  concept_type,
  concept_id,
  alias_text,
  locale,
  status,
  source_type
)
select
  expected.id,
  'value_object',
  value_object.id,
  expected.alias_text,
  expected.locale,
  'published',
  'system_seed'
from expected
join public.value_objects value_object
  on value_object.canonical_key=expected.canonical_key
 and value_object.scope_code='global'
 and value_object.ontology_node_role_code='leaf'
 and value_object.status='active'
on conflict (id) do update
set
  alias_text=excluded.alias_text,
  locale=excluded.locale,
  status='published',
  source_type='system_seed',
  updated_at=clock_timestamp();

-- All expected aliases must now exist and generated normalization must match.
do $alias_acceptance$
begin
  if (
    with expected(id,canonical_key,alias_text,alias_normalized,locale) as (
      values
    ('bc9c431b-6d97-56ca-84ea-fd5bc9e0aa9e'::uuid, 'process.exercise.plank', 'планку', 'планку', 'ru'),
    ('0778efa0-3017-5ea7-8d53-8b04c4c92c9c'::uuid, 'process.exercise.plank', 'plank', 'plank', 'en'),
    ('2bac812a-4f91-519b-a449-420aa2e27f2d'::uuid, 'process.exercise.reverse_plank', 'обратную планку', 'обратную планку', 'ru'),
    ('b00ee7b2-dda0-574e-9c94-02adb8a7e04f'::uuid, 'process.exercise.reverse_plank', 'reverse plank', 'reverse plank', 'en'),
    ('1621ebd5-e9f2-5a83-87b9-13ab0d32474f'::uuid, 'process.movement.walking', 'прогулка', 'прогулка', 'ru'),
    ('922b6663-074e-5b83-a6e7-857c8f6fa03d'::uuid, 'process.movement.walking', 'гулял', 'гулял', 'ru'),
    ('92ac8aa3-26fb-5e77-85e2-ba051584fd4b'::uuid, 'process.movement.walking', 'ходил пешком', 'ходил пешком', 'ru'),
    ('2c4a22f0-13ce-50d5-8558-f47a137e0ffc'::uuid, 'process.movement.walking', 'walk', 'walk', 'en'),
    ('d24671cf-3d35-543f-9eff-a92e940ed8df'::uuid, 'process.movement.walking', 'walking', 'walking', 'en'),
    ('5f1c83dd-a69e-588c-9f6f-7a69c8fc0c46'::uuid, 'process.movement.walking', 'stroll', 'stroll', 'en'),
    ('53210f1a-82d4-5860-bbf2-bcb7688dc17f'::uuid, 'state.physiology.body_weight', 'вес', 'вес', 'ru'),
    ('0f49ebe9-bc02-5ff7-8ce2-6123f1662a44'::uuid, 'state.physiology.body_weight', 'вес тела', 'вес тела', 'ru'),
    ('fae81ae1-4b55-5857-a121-712734d06ed0'::uuid, 'state.physiology.body_weight', 'weight', 'weight', 'en'),
    ('daae2c21-8a69-548b-bd44-2d55b47f17e7'::uuid, 'state.physiology.body_weight', 'body weight', 'body weight', 'en'),
    ('85e9ba97-38af-5571-bb89-ff8534b28f54'::uuid, 'state.physiology.heart_rate', 'пульс', 'пульс', 'ru'),
    ('59439ebc-1f6a-53d6-9cbe-5093229be447'::uuid, 'state.physiology.heart_rate', 'чсс', 'чсс', 'ru'),
    ('60e20aa8-4bff-582e-9f3b-01c799e4a1e4'::uuid, 'state.physiology.heart_rate', 'pulse', 'pulse', 'en'),
    ('065e1cfd-1986-5c86-94c7-13cfc55b34f7'::uuid, 'state.physiology.heart_rate', 'heart rate', 'heart rate', 'en'),
    ('9a146c2d-734a-53f3-a7e9-1acefd2dee7f'::uuid, 'state.physiology.blood_pressure', 'давление', 'давление', 'ru'),
    ('fe3a584b-f82e-505f-a9f6-cb75c5a96d22'::uuid, 'state.physiology.blood_pressure', 'ад', 'ад', 'ru'),
    ('2a087acf-6a5f-5709-a4bb-a124837c9eaa'::uuid, 'state.physiology.blood_pressure', 'blood pressure', 'blood pressure', 'en'),
    ('24fc2a1a-9aa9-5905-b345-d30417d0773f'::uuid, 'state.physiology.blood_pressure', 'bp', 'bp', 'en'),
    ('3ae248da-c197-56e0-940f-48119a61f6d3'::uuid, 'state.physiology.pain', 'болит', 'болит', 'ru'),
    ('bb9d6353-2c2b-5896-b85c-bd6b6c9badb7'::uuid, 'state.physiology.pain', 'болевые ощущения', 'болевые ощущения', 'ru'),
    ('eda81278-aaf3-5c87-9c74-4c43d7689c33'::uuid, 'state.physiology.pain', 'pain', 'pain', 'en'),
    ('07120441-ef4d-5846-b56f-7fb687a892c2'::uuid, 'entity.body.spine.lumbar', 'поясница', 'поясница', 'ru'),
    ('66d74221-440c-5c33-a253-4ff806d4119b'::uuid, 'entity.body.spine.lumbar', 'нижняя часть спины', 'нижняя часть спины', 'ru'),
    ('912361e4-b96d-54f1-854f-688184af0cc3'::uuid, 'entity.body.spine.lumbar', 'lower back', 'lower back', 'en'),
    ('b240c9b0-9068-52aa-aaad-e775678f90d9'::uuid, 'entity.body.spine.lumbar', 'lumbar', 'lumbar', 'en'),
    ('863fe3f5-0826-5dc2-b060-b74bf4bee81e'::uuid, 'state.emotional.mood', 'эмоциональный фон', 'эмоциональный фон', 'ru'),
    ('d7111ca9-7e69-507f-9b9a-c5da1fecf093'::uuid, 'state.emotional.mood', 'mood', 'mood', 'en'),
    ('e80ce825-ffe7-5c22-88aa-6acaa290c073'::uuid, 'state.emotional.stress', 'стресс', 'стресс', 'ru'),
    ('2fa708bf-bf76-5129-9b47-d3786e2e2592'::uuid, 'state.emotional.stress', 'stress', 'stress', 'en'),
    ('de3a8e54-16c6-5f99-9223-9b38c575a86b'::uuid, 'process.sleep.night_episode', 'night sleep', 'night sleep', 'en'),
    ('f781ca66-03ad-5935-bce4-956d050b78dd'::uuid, 'process.sleep.night_episode', 'sleep at night', 'sleep at night', 'en'),
    ('0d332bb8-8561-5636-aed3-80bfa2d7cf7c'::uuid, 'process.nutrition.meal', 'еда', 'еда', 'ru'),
    ('0955036f-4486-57eb-ac35-40973ec9ab86'::uuid, 'process.nutrition.meal', 'прием пищи', 'прием пищи', 'ru'),
    ('3a1a4975-f0ee-5e20-9845-07a9ae54ae73'::uuid, 'process.nutrition.meal', 'поел', 'поел', 'ru'),
    ('8b266df5-734a-55db-9107-50f136f2e0b3'::uuid, 'process.nutrition.meal', 'завтрак', 'завтрак', 'ru'),
    ('d2d946a9-443c-5929-b8a7-d27c438a809a'::uuid, 'process.nutrition.meal', 'обед', 'обед', 'ru'),
    ('b04685fe-2c11-51c0-aace-1595c22fc893'::uuid, 'process.nutrition.meal', 'ужин', 'ужин', 'ru'),
    ('f06582ca-11a8-500f-a226-6b2a82895cd6'::uuid, 'process.nutrition.meal', 'перекус', 'перекус', 'ru'),
    ('70316b1a-38a1-5d39-85f2-d2f0d4880efd'::uuid, 'process.nutrition.meal', 'meal', 'meal', 'en'),
    ('20988271-3189-5d80-bf3b-85fdf44eaf69'::uuid, 'process.nutrition.meal', 'breakfast', 'breakfast', 'en'),
    ('f688a865-1a80-5b81-bf79-d36bdb3a0a82'::uuid, 'process.nutrition.meal', 'lunch', 'lunch', 'en'),
    ('92e12491-33ea-5f65-9605-24a6ab28f939'::uuid, 'process.nutrition.meal', 'dinner', 'dinner', 'en'),
    ('845ef42a-a6c3-5be7-a5f3-082fb3064b8d'::uuid, 'process.nutrition.meal', 'snack', 'snack', 'en'),
    ('a54092f5-6dcc-5a48-91d7-3a6689d5d196'::uuid, 'process.nutrition.water_intake', 'вода', 'вода', 'ru'),
    ('cbb3e46e-8c5f-5891-bafc-264f4cf5bcfb'::uuid, 'process.nutrition.water_intake', 'пил воду', 'пил воду', 'ru'),
    ('26179376-5731-544d-ae0d-91d00931fb0f'::uuid, 'process.nutrition.water_intake', 'выпил воду', 'выпил воду', 'ru'),
    ('ed91abda-e0bd-590e-a2db-72dc488a12bd'::uuid, 'process.nutrition.water_intake', 'water intake', 'water intake', 'en'),
    ('224cb7eb-9a88-587e-b7ea-4ffe61eb0a80'::uuid, 'process.nutrition.water_intake', 'drank water', 'drank water', 'en'),
    ('384a747e-4ce3-51f6-8541-b7c042f548f9'::uuid, 'process.nutrition.caffeine_intake', 'кофе', 'кофе', 'ru'),
    ('8b5e666c-9833-5988-8317-f44cad1d974c'::uuid, 'process.nutrition.caffeine_intake', 'кофеин', 'кофеин', 'ru'),
    ('72f65684-71d6-5415-a346-8ee64d59de48'::uuid, 'process.nutrition.caffeine_intake', 'выпил кофе', 'выпил кофе', 'ru'),
    ('4b9fb94a-4c87-5544-96ea-733993580f22'::uuid, 'process.nutrition.caffeine_intake', 'coffee', 'coffee', 'en'),
    ('db70c7da-0d06-5962-85c2-6983ff7dcf13'::uuid, 'process.nutrition.caffeine_intake', 'caffeine', 'caffeine', 'en'),
    ('57a33630-dce1-5b18-9d89-06df6fa9bf24'::uuid, 'process.nutrition.caffeine_intake', 'drank coffee', 'drank coffee', 'en'),
    ('a4be7b84-a0d8-565d-a59d-c8b0d430deca'::uuid, 'process.social.conflict_interaction', 'конфликт', 'конфликт', 'ru'),
    ('dd9bb42e-52b6-55ed-bd46-1154c637fb71'::uuid, 'process.social.conflict_interaction', 'ссора', 'ссора', 'ru'),
    ('381e6ab7-95aa-57bd-8640-27105ec7158c'::uuid, 'process.social.conflict_interaction', 'поссорился', 'поссорился', 'ru'),
    ('ab7ea00d-2289-59cc-a7b7-abb54570858b'::uuid, 'process.social.conflict_interaction', 'conflict', 'conflict', 'en'),
    ('c9c6014d-095e-536a-8fc8-cb07b73663fc'::uuid, 'process.social.conflict_interaction', 'argument', 'argument', 'en'),
    ('c536a738-7095-5e7a-8bc5-c2ce733e2d05'::uuid, 'process.social.shared_time', 'совместное время', 'совместное время', 'ru'),
    ('cf856fd8-c68e-500b-bdc4-4812f289dd1b'::uuid, 'process.social.shared_time', 'время вместе', 'время вместе', 'ru'),
    ('d2f84d60-56a0-5915-95b4-0cda8459625d'::uuid, 'process.social.shared_time', 'shared time', 'shared time', 'en'),
    ('59e32119-6df3-5fda-9c2e-c13cc36ffe1d'::uuid, 'process.social.shared_time', 'time together', 'time together', 'en'),
    ('8d40f15b-a268-5056-8888-f1d8f94e78a6'::uuid, 'context.weather.air_temperature', 'температура воздуха', 'температура воздуха', 'ru'),
    ('94fad0ed-1943-5bd4-bac7-0f53d3000433'::uuid, 'context.weather.air_temperature', 'температура на улице', 'температура на улице', 'ru'),
    ('1ca11b33-a6c2-5a4d-b666-79f606f12f0c'::uuid, 'context.weather.air_temperature', 'air temperature', 'air temperature', 'en'),
    ('f8811fe9-92f0-5740-8210-7f2685c19ff2'::uuid, 'context.weather.air_temperature', 'outdoor temperature', 'outdoor temperature', 'en'),
    ('d8bb09d6-549e-5d0a-a166-ac64b48af339'::uuid, 'context.weather.cloudiness', 'облачно', 'облачно', 'ru'),
    ('6c2cc79e-9cf1-5484-9189-9d5dd4af684d'::uuid, 'context.weather.cloudiness', 'cloudy', 'cloudy', 'en'),
    ('98c434bc-aa86-5c2d-9e35-fd429b2da4e0'::uuid, 'context.weather.cloudiness', 'cloudiness', 'cloudiness', 'en'),
    ('e1f84144-9563-55d6-b1bb-359a584762f6'::uuid, 'context.environment.indoor_outdoor', 'на улице', 'на улице', 'ru'),
    ('ed8153ab-13d2-5959-8f7d-30cd3b1082cd'::uuid, 'context.environment.indoor_outdoor', 'в помещении', 'в помещении', 'ru'),
    ('bf55033b-8f6d-5b98-8a4f-0e88320d3e23'::uuid, 'context.environment.indoor_outdoor', 'outdoors', 'outdoors', 'en'),
    ('d6807b68-2dee-565a-af14-aea0f3875ef2'::uuid, 'context.environment.indoor_outdoor', 'indoors', 'indoors', 'en'),
    ('397fd78f-1f0a-5094-9cbf-76b7204f0872'::uuid, 'process.learning.language_practice', 'занимался немецким', 'занимался немецким', 'ru'),
    ('9116038c-4f93-5fcb-ba8e-616652809ff0'::uuid, 'process.learning.language_practice', 'language practice', 'language practice', 'en'),
    ('92533901-afa8-5cfc-88b8-0a90b83bf7b3'::uuid, 'process.learning.language_practice', 'german practice', 'german practice', 'en'),
    ('0c887b7a-92dd-5049-8e78-6397cbe76dee'::uuid, 'process.creative.instrument_playing', 'гитара', 'гитара', 'ru'),
    ('b81cf1f5-eb8b-5e40-81ab-0996e9421251'::uuid, 'process.creative.instrument_playing', 'играл на гитаре', 'играл на гитаре', 'ru'),
    ('7b69bf1d-70c5-5200-ac3f-2140c911afc1'::uuid, 'process.creative.instrument_playing', 'guitar', 'guitar', 'en'),
    ('93dc09d4-5284-5051-b871-49a52a05eea5'::uuid, 'process.creative.instrument_playing', 'played guitar', 'played guitar', 'en'),
    ('07f37b3c-5f8c-50ae-8275-7cb321b3098b'::uuid, 'context.resources.available_time', 'есть время', 'есть время', 'ru'),
    ('60c5fa05-bca6-551e-8caf-f0a8e7f18719'::uuid, 'context.resources.available_time', 'available time', 'available time', 'en'),
    ('a66af01b-b220-5166-a38c-6772dd2b7b6c'::uuid, 'process.work.session', 'работал за компьютером', 'работал за компьютером', 'ru'),
    ('c2663799-17ac-5451-81e9-e2fec36e049e'::uuid, 'process.work.session', 'computer work', 'computer work', 'en')
    )
    select count(*)
    from expected
    join public.concept_aliases alias_row
      on alias_row.id=expected.id
    join public.value_objects value_object
      on value_object.id=alias_row.concept_id
     and value_object.canonical_key=expected.canonical_key
     and value_object.scope_code='global'
     and value_object.ontology_node_role_code='leaf'
    where alias_row.concept_type='value_object'
      and alias_row.status='published'
      and alias_row.source_type='system_seed'
      and alias_row.alias_normalized=expected.alias_normalized
      and lower(alias_row.locale)=lower(expected.locale)
  ) <> 89 then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_EXPECTED_ALIAS_ACCEPTANCE_FAILED';
  end if;

  if (
    select count(*)
    from public.concept_aliases alias_row
    join public.value_objects value_object
      on value_object.id=alias_row.concept_id
    where alias_row.concept_type='value_object'
      and value_object.scope_code='global'
  ) <> 89 then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_GLOBAL_ALIAS_TOTAL_NOT_89';
  end if;
end;
$alias_acceptance$;

-- ---------------------------------------------------------------------------
-- 3. Exact global leaf recognition
-- ---------------------------------------------------------------------------

create or replace function public.recognize_global_value_object_text_v1(
  p_query_text text,
  p_locale text default null,
  p_root_canonical_key text default null,
  p_facet_code text default null,
  p_limit integer default 12
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
  v_root_canonical_key text;
  v_facet_code text;
  v_root_id uuid;
  v_exact_count integer := 0;
  v_candidates jsonb := '[]'::jsonb;
  v_resolved uuid := null;
begin
  v_query_text := nullif(btrim(p_query_text),'');
  if v_query_text is null or char_length(v_query_text) > 180 then
    raise exception using
      errcode='22023',
      message='GSR1C_RECOGNITION_TEXT_INVALID';
  end if;

  v_query_normalized := lower(v_query_text);
  v_locale := lower(nullif(btrim(p_locale),''));
  v_root_canonical_key := nullif(btrim(p_root_canonical_key),'');
  v_facet_code := upper(nullif(btrim(p_facet_code),''));

  if v_locale is not null
     and (
       char_length(v_locale) > 35
       or v_locale !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'
     ) then
    raise exception using
      errcode='22023',
      message='GSR1C_RECOGNITION_LOCALE_INVALID';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 20 then
    raise exception using
      errcode='22023',
      message='GSR1C_RECOGNITION_LIMIT_INVALID';
  end if;

  if v_root_canonical_key is not null then
    select id
    into v_root_id
    from public.value_objects
    where canonical_key=v_root_canonical_key
      and scope_code='global'
      and ontology_node_role_code='root'
      and facet_code='DOMAIN'
      and status='active';

    if not found then
      raise exception using
        errcode='P0002',
        message='GSR1C_RECOGNITION_ROOT_NOT_FOUND';
    end if;
  end if;

  if v_facet_code is not null
     and not exists (
       select 1
       from public.value_object_facet_registry
       where facet_code=v_facet_code
         and status='active'
     ) then
    raise exception using
      errcode='22023',
      message='GSR1C_RECOGNITION_FACET_INVALID';
  end if;

  with candidate_rows as (
    select
      value_object.id as value_object_id,
      value_object.canonical_key,
      value_object.title,
      value_object.facet_code,
      value_object.object_kind_code,
      value_object.root_value_object_id,
      root.canonical_key as root_canonical_key,
      'primary_title'::text as match_kind,
      null::uuid as alias_id,
      null::text as alias_text,
      null::text as alias_locale,
      0::integer as match_priority,
      0::integer as locale_priority
    from public.value_objects value_object
    join public.value_objects root
      on root.id=value_object.root_value_object_id
    where value_object.scope_code='global'
      and value_object.ontology_node_role_code='leaf'
      and value_object.status='active'
      and lower(btrim(value_object.title))=v_query_normalized
      and (v_root_id is null or value_object.root_value_object_id=v_root_id)
      and (v_facet_code is null or value_object.facet_code=v_facet_code)

    union all

    select
      value_object.id,
      value_object.canonical_key,
      value_object.title,
      value_object.facet_code,
      value_object.object_kind_code,
      value_object.root_value_object_id,
      root.canonical_key,
      'alias'::text,
      alias_row.id,
      alias_row.alias_text,
      alias_row.locale,
      1::integer,
      case
        when v_locale is not null
             and lower(alias_row.locale)=v_locale then 0
        when alias_row.locale is null then 1
        else 2
      end::integer
    from public.concept_aliases alias_row
    join public.value_objects value_object
      on value_object.id=alias_row.concept_id
    join public.value_objects root
      on root.id=value_object.root_value_object_id
    where alias_row.concept_type='value_object'
      and alias_row.status in ('approved','published')
      and alias_row.alias_normalized=v_query_normalized
      and value_object.scope_code='global'
      and value_object.ontology_node_role_code='leaf'
      and value_object.status='active'
      and (v_root_id is null or value_object.root_value_object_id=v_root_id)
      and (v_facet_code is null or value_object.facet_code=v_facet_code)
  ),
  ranked as (
    select
      candidate_rows.*,
      row_number() over (
        partition by candidate_rows.value_object_id
        order by
          candidate_rows.match_priority,
          candidate_rows.locale_priority,
          candidate_rows.alias_id nulls first
      ) as value_object_rank
    from candidate_rows
  ),
  winners as (
    select *
    from ranked
    where value_object_rank=1
  ),
  counted as (
    select count(*)::integer as exact_count
    from winners
  ),
  limited as (
    select *
    from winners
    order by
      match_priority,
      locale_priority,
      canonical_key
    limit p_limit
  )
  select
    counted.exact_count,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'valueObjectId', limited.value_object_id,
            'canonicalKey', limited.canonical_key,
            'title', limited.title,
            'rootCanonicalKey', limited.root_canonical_key,
            'facetCode', limited.facet_code,
            'objectKindCode', limited.object_kind_code,
            'matchKind', limited.match_kind,
            'aliasId', limited.alias_id,
            'aliasText', limited.alias_text,
            'aliasLocale', limited.alias_locale,
            'allowedParameters',
              coalesce(
                (
                  select jsonb_agg(
                    parameter.parameter_code
                    order by assignment.display_order, parameter.parameter_code
                  )
                  from public.value_object_parameter_assignments assignment
                  join public.value_object_parameter_definitions parameter
                    on parameter.id=assignment.parameter_definition_id
                  where assignment.value_object_id=limited.value_object_id
                    and assignment.assignment_scope_code='system'
                    and assignment.status='active'
                    and parameter.status='active'
                ),
                '[]'::jsonb
              )
          )
          order by
            limited.match_priority,
            limited.locale_priority,
            limited.canonical_key
        )
        from limited
      ),
      '[]'::jsonb
    )
  into v_exact_count, v_candidates
  from counted;

  if v_exact_count=1 then
    v_resolved := (v_candidates -> 0 ->> 'valueObjectId')::uuid;
  end if;

  return jsonb_build_object(
    'ok',true,
    'contractVersion','GSR1C_GLOBAL_VALUE_OBJECT_RECOGNITION_V1',
    'matchingMode','exact_normalized_leaf_only_v1',
    'queryText',v_query_text,
    'queryNormalized',v_query_normalized,
    'requestedLocale',v_locale,
    'rootCanonicalKey',v_root_canonical_key,
    'facetCode',v_facet_code,
    'exactMatchCount',v_exact_count,
    'ambiguous',v_exact_count > 1,
    'resolvedValueObjectId',v_resolved,
    'candidates',v_candidates
  );
end;
$function$;

revoke all
on function public.recognize_global_value_object_text_v1(
  text,text,text,text,integer
)
from public, anon, authenticated;

grant execute
on function public.recognize_global_value_object_text_v1(
  text,text,text,text,integer
)
to service_role;

-- ---------------------------------------------------------------------------
-- 4. Bounded DOMAIN -> FACET -> leaf candidate retrieval
-- ---------------------------------------------------------------------------

create or replace function public.get_global_value_object_leaf_candidates_v1(
  p_root_canonical_key text,
  p_facet_code text,
  p_limit integer default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $function$
declare
  v_root_canonical_key text;
  v_facet_code text;
  v_root public.value_objects%rowtype;
  v_total integer := 0;
  v_candidates jsonb := '[]'::jsonb;
begin
  v_root_canonical_key := nullif(btrim(p_root_canonical_key),'');
  v_facet_code := upper(nullif(btrim(p_facet_code),''));

  if v_root_canonical_key is null or v_facet_code is null then
    raise exception using
      errcode='22023',
      message='GSR1C_CANDIDATE_ROOT_AND_FACET_REQUIRED';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 20 then
    raise exception using
      errcode='22023',
      message='GSR1C_CANDIDATE_LIMIT_INVALID';
  end if;

  select *
  into v_root
  from public.value_objects
  where canonical_key=v_root_canonical_key
    and scope_code='global'
    and ontology_node_role_code='root'
    and facet_code='DOMAIN'
    and status='active';

  if not found then
    raise exception using
      errcode='P0002',
      message='GSR1C_CANDIDATE_ROOT_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.value_object_facet_registry
    where facet_code=v_facet_code
      and status='active'
  ) then
    raise exception using
      errcode='22023',
      message='GSR1C_CANDIDATE_FACET_INVALID';
  end if;

  select count(*)::integer
  into v_total
  from public.value_objects leaf
  where leaf.scope_code='global'
    and leaf.root_value_object_id=v_root.id
    and leaf.facet_code=v_facet_code
    and leaf.ontology_node_role_code='leaf'
    and leaf.status='active';

  if v_total > 10 then
    raise exception using
      errcode='23514',
      message='GSR1C_CANDIDATE_BOUND_EXCEEDED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'valueObjectId', candidate.id,
        'canonicalKey', candidate.canonical_key,
        'title', candidate.title,
        'description', candidate.description,
        'facetCode', candidate.facet_code,
        'objectKindCode', candidate.object_kind_code,
        'allowedParameters',
          coalesce(
            (
              select jsonb_agg(
                parameter.parameter_code
                order by assignment.display_order, parameter.parameter_code
              )
              from public.value_object_parameter_assignments assignment
              join public.value_object_parameter_definitions parameter
                on parameter.id=assignment.parameter_definition_id
              where assignment.value_object_id=candidate.id
                and assignment.assignment_scope_code='system'
                and assignment.status='active'
                and parameter.status='active'
            ),
            '[]'::jsonb
          )
      )
      order by candidate.canonical_key
    ),
    '[]'::jsonb
  )
  into v_candidates
  from (
    select *
    from public.value_objects leaf
    where leaf.scope_code='global'
      and leaf.root_value_object_id=v_root.id
      and leaf.facet_code=v_facet_code
      and leaf.ontology_node_role_code='leaf'
      and leaf.status='active'
    order by leaf.canonical_key
    limit p_limit
  ) candidate;

  return jsonb_build_object(
    'ok',true,
    'contractVersion','GSR1C_GLOBAL_LEAF_CANDIDATES_V1',
    'routingStage','DOMAIN_TO_FACET_TO_LEAF',
    'rootCanonicalKey',v_root.canonical_key,
    'rootTitle',v_root.title,
    'facetCode',v_facet_code,
    'candidateCount',v_total,
    'returnedCount',jsonb_array_length(v_candidates),
    'candidateBound',10,
    'truncated',jsonb_array_length(v_candidates) < v_total,
    'candidates',v_candidates
  );
end;
$function$;

revoke all
on function public.get_global_value_object_leaf_candidates_v1(
  text,text,integer
)
from public, anon, authenticated;

grant execute
on function public.get_global_value_object_leaf_candidates_v1(
  text,text,integer
)
to service_role;

-- ---------------------------------------------------------------------------
-- 5. Acceptance gates
-- ---------------------------------------------------------------------------

do $acceptance$
declare
  v_result jsonb;
  v_candidates jsonb;
begin
  if has_function_privilege(
       'anon',
       'public.recognize_global_value_object_text_v1(text,text,text,text,integer)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.recognize_global_value_object_text_v1(text,text,text,text,integer)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.recognize_global_value_object_text_v1(text,text,text,text,integer)',
       'EXECUTE'
     ) then
    raise exception using
      errcode='42501',
      message='GSR1C_V3_RECOGNITION_PRIVILEGE_GUARD_FAILED';
  end if;

  if has_function_privilege(
       'anon',
       'public.get_global_value_object_leaf_candidates_v1(text,text,integer)',
       'EXECUTE'
     )
     or has_function_privilege(
       'authenticated',
       'public.get_global_value_object_leaf_candidates_v1(text,text,integer)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.get_global_value_object_leaf_candidates_v1(text,text,integer)',
       'EXECUTE'
     ) then
    raise exception using
      errcode='42501',
      message='GSR1C_V3_CANDIDATE_PRIVILEGE_GUARD_FAILED';
  end if;

  v_result := public.recognize_global_value_object_text_v1(
    'вес','ru',null,null,12
  );
  if v_result ->> 'resolvedValueObjectId' is null
     or (
       select canonical_key
       from public.value_objects
       where id=(v_result ->> 'resolvedValueObjectId')::uuid
     ) <> 'state.physiology.body_weight' then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_ACCEPT_WEIGHT_ALIAS_FAILED';
  end if;

  v_result := public.recognize_global_value_object_text_v1(
    'ужин','ru',null,null,12
  );
  if (
    select canonical_key
    from public.value_objects
    where id=(v_result ->> 'resolvedValueObjectId')::uuid
  ) <> 'process.nutrition.meal' then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_ACCEPT_DINNER_TO_MEAL_FAILED';
  end if;

  v_result := public.recognize_global_value_object_text_v1(
    'прогулка','ru','domain.movement_physical_activity','PROCESS',12
  );
  if (
    select canonical_key
    from public.value_objects
    where id=(v_result ->> 'resolvedValueObjectId')::uuid
  ) <> 'process.movement.walking' then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_ACCEPT_STROLL_TO_WALKING_FAILED';
  end if;

  v_result := public.recognize_global_value_object_text_v1(
    'поясница','ru','domain.body_physiology','ENTITY',12
  );
  if (
    select canonical_key
    from public.value_objects
    where id=(v_result ->> 'resolvedValueObjectId')::uuid
  ) <> 'entity.body.spine.lumbar' then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_ACCEPT_LUMBAR_ALIAS_FAILED';
  end if;

  v_candidates := public.get_global_value_object_leaf_candidates_v1(
    'domain.movement_physical_activity','PROCESS',12
  );

  if (v_candidates ->> 'candidateCount')::integer <> 10
     or not exists (
       select 1
       from jsonb_array_elements(v_candidates -> 'candidates') c
       where c ->> 'canonicalKey'='process.exercise.plank'
     )
     or not exists (
       select 1
       from jsonb_array_elements(v_candidates -> 'candidates') c
       where c ->> 'canonicalKey'='process.movement.walking'
     ) then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_ACCEPT_BOUNDED_MOVEMENT_CANDIDATES_FAILED';
  end if;

  if exists (
    select 1
    from public.value_objects
    where scope_code='global'
      and canonical_key in (
        'domain.time',
        'domain.location',
        'state.physiology.body_temperature',
        'process.movement.stroll',
        'process.nutrition.breakfast',
        'process.nutrition.lunch',
        'process.nutrition.dinner'
      )
  ) then
    raise exception using
      errcode='23514',
      message='GSR1C_V3_LOCKED_EXCLUSION_VIOLATED';
  end if;
end;
$acceptance$;

commit;

select jsonb_pretty(
  jsonb_build_object(
    'check','ARCTOR_GSR1C_GLOBAL_ALIASES_RECOGNITION_V3',
    'global_objects',
      (
        select count(*)
        from public.value_objects
        where scope_code='global'
          and canonical_key is not null
      ),
    'global_aliases',
      (
        select count(*)
        from public.concept_aliases a
        join public.value_objects v
          on v.id=a.concept_id
        where a.concept_type='value_object'
          and v.scope_code='global'
      ),
    'published_system_seed_aliases',
      (
        select count(*)
        from public.concept_aliases a
        join public.value_objects v
          on v.id=a.concept_id
        where a.concept_type='value_object'
          and a.status='published'
          and a.source_type='system_seed'
          and v.scope_code='global'
      ),
    'alias_normalized_generated',
      (
        select is_generated='ALWAYS'
        from information_schema.columns
        where table_schema='public'
          and table_name='concept_aliases'
          and column_name='alias_normalized'
      ),
    'recognition_rpc',
      to_regprocedure(
        'public.recognize_global_value_object_text_v1(text,text,text,text,integer)'
      ) is not null,
    'candidate_rpc',
      to_regprocedure(
        'public.get_global_value_object_leaf_candidates_v1(text,text,integer)'
      ) is not null,
    'max_domain_facet_leaf_candidates',
      (
        select max(leaf_count)
        from (
          select root_value_object_id, facet_code, count(*) as leaf_count
          from public.value_objects
          where scope_code='global'
            and ontology_node_role_code='leaf'
            and status='active'
          group by root_value_object_id, facet_code
        ) x
      ),
    'weight_test',
      public.recognize_global_value_object_text_v1(
        'вес','ru',null,null,12
      ),
    'dinner_test',
      public.recognize_global_value_object_text_v1(
        'ужин','ru',null,null,12
      ),
    'walking_candidates',
      public.get_global_value_object_leaf_candidates_v1(
        'domain.movement_physical_activity','PROCESS',12
      )
  )
) as gsr1c_result;
