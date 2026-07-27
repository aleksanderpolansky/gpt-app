# ARCTor.app — PP1A: фундамент плановых и фактических активностей

## Подтверждённая исходная точка

`main @ 9d792aedd69a5657ab36a16ebae331b7a69a2871`

## Решение

`public.activity_events` становится единственной канонической сущностью для новых плановых и фактических активностей.

План и выполнение — отдельные строки:

- `activity_role_code = planned`;
- `activity_role_code = actual`;
- `actual.fulfills_planned_activity_event_id -> planned.id`;
- один план может иметь несколько фактических выполнений.

## Режимы планирования

- `unscheduled` — без даты;
- `date_only` — день без точного времени;
- `date_range` — диапазон дат;
- `deadline` — крайний срок;
- `exact` — точный временной блок.

Система не должна придумывать `08:00` или `30 минут`, если пользователь их не указал.

## Календарь

`public.calendar_events` остаётся общим календарным/booking-хранилищем.

Точная плановая активность может иметь одну проекцию:

`calendar_events.related_activity_event_id -> activity_events.id`.

Календарная проекция не является самой активностью и не должна удалять канонический план.

## Связи с Value Objects

Переиспользуется `public.activity_value_object_links`.

Каноническая связь плана:

`link_type = planned_target`.

Разрешены root, intermediate и leaf одного владельца/актора. Одна плановая активность может иметь несколько таких связей. Фактическая активность не обязана иметь planning link.

## Разрушительная очистка

Старые activity/calendar-строки признаны экспериментальными. PP1A очищает текущий контур через контролируемый `TRUNCATE ... CASCADE`, но не удаляет пользователей, акторов, Value Objects, P10 semantic relations, branch policies, параметры или target standards.

Legacy-таблицы `activities`, `activity_participants`, `activity_links` пока остаются пустыми, потому что PP1B ещё должен переключить application write paths. Их удаление — PP1C.

## Границы PP1A

В PP1A входят:

- destructive reset экспериментальных activity/calendar данных;
- role/schedule registries;
- поля и guards `activity_events`;
- календарная canonical projection;
- `planned_target` на существующей junction table;
- controlled idempotent RPC `create_activity_event_pp1_v1`;
- preflight, postcheck, runtime acceptance и cleanup.

Не входят recurrence, зависимости, Gantt, project permissions, fact fan-out, аналитика и AI.
