# ARCTor.app — PP1B: канонические write paths активностей

## Цель

Переключить пользовательское создание плановых и фактических активностей на `public.activity_events`, созданную в PP1A каноническую модель.

## Что меняется

- `/api/activity/events` создаёт и `planned`, и `actual` через `create_activity_event_pp1_v1`.
- Activity Review больше не создаёт будущий план напрямую в `calendar_events`.
- `calendar_events` создаётся RPC только как проекция `exact`-плана.
- Факты прикрепляются к уже созданному каноническому `activity_event_id` через `attach_reality_facts_to_activity_pp1_v1`.
- Один пользовательский контейнер больше не создаёт вторую activity row в facts save-gate.
- Поддерживаются `unscheduled`, `date_only`, `date_range`, `deadline`, `exact`.
- Отсутствующие дата, время и длительность не заменяются искусственными `08:00` и `30 минут`.
- План может получить несколько `planned_target` связей с root/intermediate/leaf Value Objects.
- Журнал отображает канонические planned и actual activity rows; календарные проекции не дублируются как отдельные journal logs.

## Транзакционная совместимость facts pipeline

Исторический `save_reality_activity_v1` использует `event_code=save_gate:<key>` как собственный idempotency marker. PP1A использует `event_code=pp1:<role>:<key>`.

PP1B добавляет адаптер, который:

1. блокирует существующую PP1 activity row;
2. проверяет user/actor/role/direction;
3. временно освобождает `event_code` внутри одной транзакции;
4. повторно использует проверенный transactional fact writer;
5. восстанавливает исходный PP1 `event_code`;
6. сохраняет независимый результат idempotency в `activity_fact_write_operations_pp1`.

## Границы

PP1B не реализует recurrence, зависимости, Gantt, автоматическое перепланирование, аналитику или AI-планирование. Legacy `/api/activities` и booking write paths удаляются на PP1C после отдельного source audit.
