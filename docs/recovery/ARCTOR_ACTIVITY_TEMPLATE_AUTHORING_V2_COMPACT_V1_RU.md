# ARCTOR_ACTIVITY_TEMPLATE_AUTHORING_V2_COMPACT_V1

Дата: 2026-08-26
Source baseline: `df84e3916d1dc55a4d04fdbcd138e56208b4df83`
DB schema change: NONE
SQL executed by release: NONE

## Почему этап нужен

Старая карточка типовой активности оставалась на V1-контракте из четырёх
строковых parameter codes и показывала пользователю служебную модель:
`process_count`, `template_group`, confidence, routing-таблицы и динамику ЦО/ОН.

Production DB уже содержит V2 foundation и атомарный
`save_activity_template_impact_profile_v2`, где параметр определяется
`parameter_definition_id`, route закрепляется за
`target_parameter_assignment_id`, а выполнение активности считается по
distinct `activity_event_id`, а не по физическому `process_count`.

## Исправление диагностического preflight

Read-only preflight 26 августа корректно обнаружил V2 RPC, V2 parameter table,
`parameter_definition_id` и `target_parameter_assignment_id`, но ошибочно искал
`routing_contract_code` внутри V2 table schemas.

Канонический DB foundation хранит `routing_contract_code` в
`activity_template_impact_profiles_v1`. Поэтому результат
`V2_CONTRACT_INCOMPLETE_OR_DIFFERENT` был false negative самого диагностического
критерия, а не дефектом production DB.

## Новый пользовательский контракт

Основная форма содержит только:

- название;
- обычную длительность;
- multi-select общего parameter registry;
- поиск leaf ЦО/ОН;
- chips выбранных параметров и объектов;
- свёрнутый блок «Дополнительно» с описанием и заметкой к версии.

В основной форме отсутствуют:

- категория / пользовательский `template_group`;
- canonical code;
- `process_count`;
- confidence;
- ручная таблица routes;
- динамика состояния ЦО/ОН.

`template_group='general'` временно остаётся только внутренним DB/API значением.

## Параметры

UI читает active system definitions и active definitions текущего actor из
`value_object_parameter_definitions`. `process_count` исключён.

Каталог визуально группируется по измерению. Группы являются только
presentation layer и не создают новой taxonomy активности.

При сохранении UI передаёт только UUID выбранных definitions. Сервер формирует
V2 profile parameters с `capturePolicyCode='deterministic_or_ai'`.

## ЦО/ОН

Поиск использует существующий bounded selector только после ввода минимум двух
символов. В строке результата показывается короткое название. Отдельная кнопка
открывает modal с полным hierarchy path; длинный breadcrumb не занимает строку
поиска.

Выбранные ЦО/ОН отображаются chips. Клик по названию открывает тот же modal,
`×` удаляет объект.

## Routing

Обычная форма не заставляет пользователя конфигурировать routing.

Перед вызовом V2 RPC server читает только существующие active
`value_object_parameter_assignments` для выбранных leaf + parameter definitions.

- exact matching assignment → `DIRECT_MEASURE`;
- matching assignment отсутствует → route не выдумывается, link остаётся
  `EVENT_LINK`.

Этот этап намеренно не создаёт parameter definitions и не создаёт missing
assignments. Расширенный assignment-authoring остаётся отдельной будущей
операцией.

## Legacy

Существующий `legacy_v1` profile остаётся читаемым. Связанные ЦО/ОН загружаются.
Старые V1 parameter codes не конвертируются автоматически, поскольку такая
миграция неоднозначна. При следующем явном сохранении пользователь выбирает
актуальные registry parameters и создаётся новая immutable V2 profile version.

Исторические events, measures и facts не переписываются.

## Точка продолжения

После production smoke:

1. создать «Обед»;
2. выбрать несколько registry parameters;
3. выбрать несколько leaf ЦО/ОН через поиск;
4. сохранить;
5. перечитать карточку;
6. read-only проверить `routing_contract_code='parameter_registry_v2'`,
   UUID parameters и отсутствие physical `process_count`;
7. затем отдельно проектировать Apply Template в Activity Analysis Workspace и
   canonical measurement dedup для Basic Analysis.

## V1.1 TypeScript hotfix

Первый source-release корректно прошёл DB V2 preflight, release-validator и ESLint changed-files, но full `tsc --noEmit` остановил commit на двух TS2352 в catalog route. Причина — `SELECT_COLUMNS`, собранный через `.join(',')`, терял literal type, поэтому typed Supabase parser выводил `GenericStringError[]`; последующий прямой cast к `DefinitionRow[]` TypeScript справедливо отклонял.

V1.1 делает projection compile-time literal (`as const`) и, после уже выполненных проверок `systemResult.error` / `actorResult.error`, использует явный двухшаговый bridge `unknown -> DefinitionRow[]`. Runtime/DB semantics не меняются. В launcher добавлен durable validator этого конкретного контракта.
