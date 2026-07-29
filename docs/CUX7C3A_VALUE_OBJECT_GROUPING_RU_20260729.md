# CUX7C3A — группировка календарных записей по ценным объектам

Дата: 29.07.2026

## Production baseline

- branch: `main`;
- commit: `99933bfc913982a4c7b51d425e0855b3d939436d`;
- CUX7C2 Timeline принят в Production;
- Grid, List и Timeline остаются представлениями одних и тех же канонических записей.

## Что подтвердил capability intake

1. Таблица `activity_value_object_links` существует.
2. Для плановых целей используется `link_type = planned_target`.
3. Активная связь имеет `status = active`.
4. Одна плановая активность может иметь несколько целевых ценных объектов.
5. Связь защищена совпадением `app_user_id`, `actor_id`, владельца активности и владельца ценного объекта.
6. Текущий календарный read API до CUX7C3A не читал эти связи и возвращал пустые `valueObjectIds`.
7. `project_scope` и project-root read model ещё не готовы.
8. Каноническая модель milestone ещё отсутствует.

## Scope CUX7C3A

CUX7C3A добавляет только безопасную read-only группировку по прямым `planned_target` связям:

- календарный API читает активные связи плановой активности с ценными объектами;
- exact-проекция получает связи через `calendar_events.related_activity_event_id`;
- `date_only`, `date_range` и `deadline` получают связи через собственный `activity_events.id`;
- List и Timeline получают переключатель «обычный вид / по ценным объектам»;
- группы сворачиваются независимо;
- запись без связи попадает в отдельную группу «Без ценного объекта»;
- запись с одной связью попадает в группу этого ценного объекта;
- запись с несколькими связями показывается один раз в группе «Несколько ценных объектов»;
- на карточке показываются названия всех прямых целей;
- Grid не меняется;
- popup и write paths не меняются.

## Правило против дублирования

Одна каноническая запись всегда отображается один раз.

При нескольких `planned_target` связях запись не копируется в каждую группу. Она попадает в специальную группу множественных целей, а сами цели показываются chips на карточке.

## Ownership и безопасность чтения

Чтение `activity_value_object_links` фильтруется по:

- `app_user_id`;
- `actor_id`;
- `link_type = planned_target`;
- `status = active`;
- точному набору `activity_event_id`.

Чтение `value_objects` фильтруется по:

- `owner_user_id`;
- `owner_actor_id`;
- точному набору `id`.

Большие наборы идентификаторов читаются чанками.

## Изменяемые файлы

1. `src/app/api/calendar-rebuild/events/route.ts`
2. `src/app/calendar-rebuild/CalendarRebuildClient.tsx`
3. `src/features/calendar-core/types.ts`
4. `scripts/cux7c3a-value-object-grouping-contract-check.mjs`
5. `docs/CUX7C3A_VALUE_OBJECT_GROUPING_RU_20260729.md`

## Что не входит

- project-root grouping;
- создание или изменение project roots;
- milestone;
- derived summary bars;
- зависимости и critical path;
- drag/drop и resize;
- recurrence generation;
- background AI;
- SQL и schema changes;
- новые write paths;
- дублирование activities.

## Следующий этап

После Production smoke CUX7C3A отдельно оцениваются:

- CUX7C3B — project-root grouping после появления реального read model;
- CUX7C3C — milestone и derived summary bars после отдельного contract lock.
