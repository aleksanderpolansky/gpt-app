# ARCTOR Curator Parameter → ON Materialization + Default Policy V1.0.1

Дата: 2026-09-16
Baseline: `ea87bec80a4b1b413a06de04f11cb8cbada78a1c`

## Техническое уточнение V1.0.1

До первого запуска launcher SQL был дополнительно ужесточён:

- проверки `scope_code`, `origin_type_code`, `ontology_node_role_code`
  используют `IS DISTINCT FROM`, чтобы `NULL` не мог пройти проверку;
- `unnest(uuid[])` использует явный column alias, чтобы исключить
  неоднозначность SQL-парсинга при ручном production rollout.

V1 не запускался, поэтому отдельного rollback/failed release нет.

## Причина этапа

Куратор модели уже работает в правильном порядке:

1. выбирает параметры типовой активности;
2. для каждого параметра отдельно назначает 1..N листовых ОН;
3. отдельно подтверждает полный набор ОН каждого параметра.

До этого решения существовали только в append-only `activity_processing_logs`.

Live Intake 2026-09-16 показал:

- `templateProfileParameters=0`;
- `templateObjectLinks=0`;
- `parameterAssignments=0`;
- `systemRelations=3`;
- `activityFacts=26`;
- Formula Registry пока пуст.

То есть куратор уже умеет сформировать точное решение `parameter → ON[]`,
но это решение ещё не материализовано в каноническом слое parameter assignments.

## Что делает V1

После действия:

`confirm_measurable_object_mapping_set`

server сначала атомарно материализует подтверждённый набор:

`system parameter → 1..N global system leaf ON`

и только после успешной материализации пишет событие подтверждения mapping set.

Если материализация не выполнена, mapping set не считается подтверждённым.

## Почему нужна migration

Изначальный `value_object_parameter_assignments` был создан для actor-owned
legacy `activity_leaf` и требовал non-null owner user/actor.

Современный Reality Model использует:

- `scope_code=global`;
- `origin_type_code=system_model`;
- `ontology_node_role_code=leaf`;
- ownerless global system nodes.

Migration V1:

- добавляет assignment `scope_code = actor | system`;
- сохраняет старый actor path;
- разрешает system assignment только для ownerless global system-model leaf;
- разрешает system assignment только для active system parameter definition;
- сохраняет unique active pair invariant;
- не изменяет существующие facts/templates/formulas.

## Atomic RPC

Добавлен service-role-only:

`save_system_value_object_parameter_assignment_set_v1`

Он:

1. проверяет весь набор ОН;
2. не пишет ничего, пока весь набор не прошёл validation;
3. переиспользует уже существующие active system assignments;
4. блокирует неоднозначный inactive/retired state;
5. создаёт только недостающие assignments;
6. возвращает assignment IDs и rowsWritten.

## Typical/default values

Добавлен кодовый контракт:

`ARCTOR_ACTIVITY_TEMPLATE_DEFAULT_VALUE_POLICY_V1`

Приоритет источников:

1. explicit user value;
2. external measurement;
3. manual measurement;
4. actor typical value;
5. system typical value.

Поддержаны политики отсутствующего значения:

- `no_fact`;
- `ask_user`;
- `actor_typical`;
- `system_typical`;
- `actor_then_system`.

Ключевой invariant:

типовое значение само по себе НЕ является фактом конкретной активности.
Source fact возникает только когда это значение применено к конкретному событию,
и provenance должен показать источник подстановки.

На этом этапе storage/UI/resolver типовых значений ещё НЕ создаются.

## Что намеренно НЕ делается

- типовая активность ещё не материализуется автоматически из curator journey;
- нет записи `activity_object_facts`;
- нет formula executor;
- нет result/snapshot fact write;
- нет lineage write;
- нет автоматического consequence execution;
- migration launcher не применяет SQL к production.

## Migration rollout

Файл migration входит в commit, но launcher его НЕ выполняет.

Причина: migration history Supabase в текущем проекте отдельно не нормализована,
поэтому автоматический `db push` запрещён.

До ручного применения migration действие подтверждения нового parameter mapping
вернёт явную ошибку:

`CURATOR_SYSTEM_PARAMETER_ASSIGNMENT_MIGRATION_REQUIRED`

## Следующая точка

После ручного применения migration и runtime smoke:

1. подтвердить один parameter → ON mapping в Кураторе модели;
2. read-only проверить системный assignment;
3. затем материализовать целую системную типовую активность из curator journey;
4. только после этого соединять типовую активность с созданием source facts;
5. executor последствий остаётся отдельным поздним gate.
