# ARCTor — Curator System Typical Activity Materialization V1

Дата: 2026-09-16

Исходный baseline:

\$ExpectedHead\

## Точка начала

Лестничный пилот прошёл E01.

Подтверждены и реально материализованы системные соответствия:

1. Duration / Продолжительность
   → Stair ascent / Подъём по лестнице.

2. Count / Количество
   → One-storey stair ascent /
   Подъём на один этаж по лестнице.

После второго подтверждения UI показал:

«Объекты наблюдения для измерения определены для всех параметров».

Существующий конструктор на этой точке заканчивался информационным
зелёным блоком.

## Что добавляет E02

После завершения всех mappings появляется следующий этап:

«Опубликовать системную типовую активность».

Куратор видит автоматически подготовленные:

- название на текущем языке;
- каноническое английское название;
- описание на текущем языке;
- каноническое английское описание.

Предложения берутся из основного листового системного ОН, а не из
личного сырого сообщения пользователя.

Исходный личный текст активности в системную карточку не копируется.

## Архитектурное решение

Новая параллельная таблица типовых активностей НЕ создаётся.

Переиспользуются:

- activity_templates;
- activity_template_impact_profiles_v1;
- существующий canonical RPC
  save_activity_template_impact_profile_v2;
- value_object_parameter_assignments;
- parameter_registry_v2 routing.

Добавлен только системный атомарный wrapper:

\save_curator_system_typical_activity_v1\.

## Почему нужен wrapper

Существующий V2 authoring рассчитан на owner_user_id + owner_actor_id.

Системная типовая активность должна быть:

- template_scope = system;
- owner_user_id = null;
- owner_actor_id = null;
- organization_id = null.

Wrapper внутри одной DB-транзакции:

1. передаёт canonical V2 authoring данные Куратора как provenance;
2. canonical V2 RPC создаёт/версионирует профиль;
3. тот же template атомарно переводится в SYSTEM scope;
4. записывается системный metadata-contract;
5. проверяется active profile;
6. проверяется routing_contract_code = parameter_registry_v2.

Промежуточное user-состояние при revision существует только внутри
транзакции и не публикуется наружу.

## Идемпотентность

Для curator journey используется:

sourceSignalId + fingerprint.

Повторный POST с тем же fingerprint:

- не создаёт новый template;
- не создаёт новую profile version;
- возвращает существующую активную версию.

Если в будущем подтверждённый профиль изменится, тот же system template
получает новую immutable V2 profile version.

## Системный каталог

activity_templates получает обязательный metadata envelope:

arctorTypicalActivity:
- kind = typical_activity;
- scope = system;
- catalogVersion = reality_model_v1.

Поэтому существующий системный каталог может читать опубликованную
активность без отдельного read-model.

## Локализация

Канонический текст activity_templates хранится на английском.

В metadata сохраняются:

- canonicalLocale = en;
- creationLocale;
- localizations;
- recognitionAliases.

Это не исправляет общий localization UX каталога — отдельный UI hotfix
может быть выполнен позже.

## Что E02 сознательно НЕ делает

- не создаёт source facts;
- не создаёт snapshot facts;
- не создаёт result facts;
- не запускает Formula Executor;
- не меняет старые activity events;
- не переобрабатывает автоматически ожидающие сообщения.

## Acceptance после migration rollout

Для лестничного сигнала:

1. после allMapped появляется новый блок публикации;
2. поля автоматически заполнены:
   - Подъём по лестнице;
   - Stair ascent;
   - соответствующие определения;
3. нажать публикацию;
4. получить system template;
5. owner_user_id = null;
6. owner_actor_id = null;
7. organization_id = null;
8. template_scope = system;
9. active profile существует;
10. routing_contract_code = parameter_registry_v2;
11. profile содержит Duration и Count;
12. direct_measure routes используют уже созданные system assignments;
13. системная активность видна в общем каталоге;
14. повторное нажатие не создаёт новую версию без изменения fingerprint.

## Следующая точка — E03

После PASS E02:

activity text
→ system typical activity recognition
→ profile
→ extracted values
→ source/snapshot activity_object_facts.

Formula Executor по-прежнему не включать до стабильного source-fact writer.

## Recovery discipline

Этап не считать полностью закрытым без:

- migration rollout evidence;
- runtime materialization evidence;
- system catalog evidence;
- точного нового commit;
- обновлённой точки продолжения.